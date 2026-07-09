/**
 * Automatic reminder engine.
 *
 * A single in-process loop polls the ScheduledReminder table once a minute,
 * atomically CLAIMS due rows (FOR UPDATE SKIP LOCKED so overlapping ticks or
 * multiple instances never grab the same row), sends on the owner's enabled
 * channels (SMS via Twilio, e-mail via Resend), and records the outcome. A
 * per-(appointment, offset) unique row plus the claim guarantees no reminder is
 * ever sent twice.
 *
 * Note: this requires the api-server process to stay running (a Reserved VM
 * deployment in production, not an autoscale service that sleeps).
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  customerTable,
  scheduledReminderTable,
  type Appointment,
} from "@workspace/db/schema";
import { sendSms } from "./twilio";
import { sendEmail } from "./email";
import { logger } from "./logger";
import {
  buildReminderEmail,
  buildReminderSms,
  getReminderSettings,
} from "./reminders";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;
const TICK_MS = 60_000;

/** Appointment statuses for which automatic reminders should not be sent. */
const RESOLVED_STATUSES = new Set([
  "CANCELLED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
]);

interface ClaimedReminder {
  id: string;
  appointmentId: string;
  userId: string;
  offsetLabel: string;
  attempts: number;
}

/** Claim up to BATCH_SIZE due reminders, flipping them to SENDING atomically. */
async function claimDueReminders(): Promise<ClaimedReminder[]> {
  const result = await db.execute(sql`
    UPDATE "ScheduledReminder"
    SET status = 'SENDING', attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "ScheduledReminder"
      WHERE status = 'PENDING' AND "sendAt" <= now()
      ORDER BY "sendAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "appointmentId", "userId", "offsetLabel", attempts
  `);
  const rows = (result as unknown as { rows?: ClaimedReminder[] }).rows;
  return rows ?? (result as unknown as ClaimedReminder[]);
}

async function markReminder(
  id: string,
  fields: {
    status: string;
    lastError?: string | null;
    sentAt?: Date | null;
    channels?: Record<string, string> | null;
  },
): Promise<void> {
  await db
    .update(scheduledReminderTable)
    .set({
      status: fields.status,
      lastError: fields.lastError ?? null,
      sentAt: fields.sentAt ?? null,
      channels: fields.channels ?? null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledReminderTable.id, id));
}

/** Send one claimed reminder and record the result. */
async function sendOne(claim: ClaimedReminder): Promise<void> {
  const [appt] = await db
    .select()
    .from(appointmentTable)
    .where(eq(appointmentTable.id, claim.appointmentId))
    .limit(1);

  if (!appt) {
    await markReminder(claim.id, { status: "SKIPPED", lastError: "Appointment deleted" });
    return;
  }

  // Don't remind about an appointment that is already resolved — cancelled,
  // confirmed, or awaiting reschedule. This also neutralises the manual-remind
  // vs auto-remind overlap: once a manual reminder has been answered (JA/NEI)
  // the appointment leaves PENDING/REMINDED and further auto reminders stop.
  if (RESOLVED_STATUSES.has(appt.status)) {
    await markReminder(claim.id, {
      status: "SKIPPED",
      lastError: `Appointment ${appt.status.toLowerCase()}`,
    });
    return;
  }

  const settings = await getReminderSettings(claim.userId);

  let customerEmail: string | null = null;
  if (settings.channelEmail && appt.customerId) {
    const [cust] = await db
      .select({ email: customerTable.email })
      .from(customerTable)
      .where(eq(customerTable.id, appt.customerId))
      .limit(1);
    customerEmail = cust?.email ?? null;
  }

  const channels: Record<string, string> = {};
  const errors: string[] = [];
  let attempted = false;

  if (settings.channelSms) {
    if (appt.clientPhone) {
      attempted = true;
      try {
        channels.sms = await sendSms(appt.clientPhone, buildReminderSms(appt));
      } catch (err) {
        errors.push(`sms: ${(err as Error).message}`);
      }
    } else {
      errors.push("sms: no phone number");
    }
  }

  if (settings.channelEmail) {
    if (customerEmail) {
      attempted = true;
      const mail = buildReminderEmail(appt);
      const { id } = await sendEmail({
        to: customerEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        context: "reminder",
      });
      if (id) channels.email = id;
      else errors.push("email: send failed");
    } else {
      errors.push("email: no address");
    }
  }

  const sentCount = Object.keys(channels).length;

  if (sentCount > 0) {
    await markReminder(claim.id, {
      status: "SENT",
      sentAt: new Date(),
      channels,
      lastError: errors.length ? errors.join("; ") : null,
    });
    // Flip the appointment to REMINDED so inbound replies can be matched, but
    // never clobber a resolved status.
    await db
      .update(appointmentTable)
      .set({
        status: "REMINDED",
        twilioSid: channels.sms ?? appt.twilioSid ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(appointmentTable.id, appt.id), eq(appointmentTable.status, "PENDING")),
      );
    return;
  }

  // Nothing was sent. If no channel could even be attempted, this is terminal.
  if (!attempted) {
    await markReminder(claim.id, {
      status: "SKIPPED",
      lastError: errors.join("; ") || "No channel enabled",
    });
    return;
  }

  // A channel was attempted but failed — retry a few times, then give up.
  if (claim.attempts >= MAX_ATTEMPTS) {
    await markReminder(claim.id, { status: "FAILED", lastError: errors.join("; ") });
  } else {
    await db
      .update(scheduledReminderTable)
      .set({ status: "PENDING", lastError: errors.join("; "), updatedAt: new Date() })
      .where(eq(scheduledReminderTable.id, claim.id));
  }
}

let ticking = false;

/** Process all currently due reminders. Safe to call repeatedly. */
export async function processDueReminders(): Promise<number> {
  const claimed = await claimDueReminders();
  if (claimed.length === 0) return 0;
  for (const claim of claimed) {
    try {
      await sendOne(claim);
    } catch (err) {
      logger.error({ err, reminderId: claim.id }, "[reminders] send failed");
      // Release the claim so it can be retried (or failed) on a later tick.
      try {
        const status = claim.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING";
        await db
          .update(scheduledReminderTable)
          .set({ status, lastError: (err as Error).message, updatedAt: new Date() })
          .where(eq(scheduledReminderTable.id, claim.id));
      } catch {
        /* best effort */
      }
    }
  }
  logger.info({ count: claimed.length }, "[reminders] processed due reminders");
  return claimed.length;
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    await processDueReminders();
  } catch (err) {
    logger.error({ err }, "[reminders] tick error");
  } finally {
    ticking = false;
  }
}

/** Start the reminder loop. Idempotent-ish; call once at server startup. */
export function startReminderScheduler(): void {
  logger.info("[reminders] scheduler started (every 60s)");
  // A short initial delay lets the server finish booting before the first tick.
  setTimeout(() => void tick(), 5_000);
  setInterval(() => void tick(), TICK_MS);
}
