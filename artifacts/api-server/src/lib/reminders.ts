/**
 * Reminder scheduling helpers: which reminders an appointment gets, when they
 * fire, and the message content. The scheduler (reminder-scheduler.ts) consumes
 * what this enqueues.
 */
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  notificationSettingsTable,
  scheduledReminderTable,
  type Appointment,
} from "@workspace/db/schema";

/** Reminder offsets, mapped to the NotificationSettings toggle that enables them. */
export const REMINDER_OFFSETS = [
  { label: "48h", ms: 48 * 60 * 60 * 1000, setting: "remind48h" },
  { label: "24h", ms: 24 * 60 * 60 * 1000, setting: "remind24h" },
  { label: "2h", ms: 2 * 60 * 60 * 1000, setting: "remind2h" },
] as const;

export interface ReminderSettings {
  remind48h: boolean;
  remind24h: boolean;
  remind2h: boolean;
  channelSms: boolean;
  channelEmail: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  remind48h: false,
  remind24h: true,
  remind2h: false,
  channelSms: true,
  channelEmail: false,
};

/** Load a user's reminder settings, falling back to defaults when unset. */
export async function getReminderSettings(
  userId: string,
): Promise<ReminderSettings> {
  const [row] = await db
    .select()
    .from(notificationSettingsTable)
    .where(eq(notificationSettingsTable.userId, userId))
    .limit(1);
  if (!row) return DEFAULT_SETTINGS;
  return {
    remind48h: row.remind48h,
    remind24h: row.remind24h,
    remind2h: row.remind2h,
    channelSms: row.channelSms,
    channelEmail: row.channelEmail,
  };
}

/**
 * Enqueue automatic reminders for a freshly created appointment, based on the
 * owner's enabled offsets. Only offsets whose send time is still in the future
 * are scheduled. Idempotent via the (appointmentId, offsetLabel) unique index.
 */
export async function enqueueRemindersForAppointment(
  appointment: Appointment,
  userId: string,
): Promise<number> {
  const settings = await getReminderSettings(userId);
  const now = Date.now();
  const scheduledAt = appointment.scheduledAt.getTime();

  const rows = REMINDER_OFFSETS.filter((o) => settings[o.setting]).flatMap(
    (o) => {
      const sendAtMs = scheduledAt - o.ms;
      if (sendAtMs <= now) return [];
      return [
        {
          appointmentId: appointment.id,
          userId,
          offsetLabel: o.label,
          sendAt: new Date(sendAtMs),
          status: "PENDING" as const,
        },
      ];
    },
  );

  if (rows.length === 0) return 0;

  await db
    .insert(scheduledReminderTable)
    .values(rows)
    .onConflictDoNothing();
  return rows.length;
}

// ─── Message content (Norwegian, Europe/Oslo local time) ─────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Oslo",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });
}

export function buildReminderSms(appt: Appointment): string {
  const dato = formatDate(appt.scheduledAt);
  const tid = formatTime(appt.scheduledAt);
  return (
    `Hei ${appt.clientName}, dette er en påminnelse om timen din ${dato} kl. ${tid}. ` +
    `Svar JA for å bekrefte eller NEI for å avlyse.`
  );
}

export function buildReminderEmail(appt: Appointment): {
  subject: string;
  html: string;
  text: string;
} {
  const dato = formatDate(appt.scheduledAt);
  const tid = formatTime(appt.scheduledAt);
  const subject = `Påminnelse: time ${dato} kl. ${tid}`;
  const text =
    `Hei ${appt.clientName},\n\n` +
    `Dette er en påminnelse om timen din ${dato} kl. ${tid}.\n\n` +
    `Vennlig hilsen BookPling`;
  const html =
    `<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">` +
    `<h1 style="margin:0 0 16px;color:#111111;font-size:20px;">Påminnelse om timen din</h1>` +
    `<p style="margin:0 0 12px;color:#333333;font-size:15px;line-height:1.6;">Hei ${appt.clientName},</p>` +
    `<p style="margin:0 0 12px;color:#333333;font-size:15px;line-height:1.6;">Dette er en påminnelse om timen din <strong>${dato} kl. ${tid}</strong>.</p>` +
    `<p style="margin:24px 0 0;color:#999999;font-size:12px;">Vennlig hilsen BookPling</p>` +
    `</div>`;
  return { subject, html, text };
}
