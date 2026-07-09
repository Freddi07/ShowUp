/**
 * Turn a normalised booking from any source into an internal appointment.
 *
 * De-duplicates per (integration, externalId) via the SyncedAppointment ledger,
 * upserts the customer (reusing the shared dedup rules), creates the
 * appointment, and enqueues its automatic reminders. Idempotent: the same
 * booking delivered twice never creates a duplicate.
 */
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  integrationTable,
  syncedAppointmentTable,
} from "@workspace/db/schema";
import { upsertCustomer } from "../customers";
import { enqueueRemindersForAppointment } from "../reminders";
import type { NormalizedBooking } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IngestResult {
  created: boolean;
  deduped: boolean;
  appointmentId: string | null;
}

export async function ingestBooking(params: {
  userId: string;
  integrationId: string;
  provider: string;
  booking: NormalizedBooking;
}): Promise<IngestResult> {
  const { userId, integrationId, provider, booking } = params;

  // Idempotency: atomically claim (integrationId, externalId) via the unique
  // ledger row BEFORE creating anything. Concurrent deliveries of the same
  // booking race on this insert; exactly one wins and gets a row back, the
  // rest get an empty result and are treated as duplicates. This prevents the
  // read-then-write race that would otherwise create duplicate appointments.
  const [claim] = await db
    .insert(syncedAppointmentTable)
    .values({
      userId,
      integrationId,
      externalId: booking.externalId,
      appointmentData: (booking.raw ?? {}) as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ id: syncedAppointmentTable.id });

  if (!claim) {
    return { created: false, deduped: true, appointmentId: null };
  }

  try {
    const { customer } = await upsertCustomer(userId, {
      name: booking.customer.name,
      phone: booking.customer.phone ?? null,
      email: booking.customer.email ?? null,
      externalId: booking.customer.externalId ?? null,
      source: `${provider}`,
    });

    const reminderAt =
      booking.reminderAt ?? new Date(booking.scheduledAt.getTime() - DAY_MS);

    const [appointment] = await db
      .insert(appointmentTable)
      .values({
        clientName: customer.name,
        clientPhone: customer.phone ?? "",
        scheduledAt: booking.scheduledAt,
        reminderAt,
        customerId: customer.id,
        externalId: booking.externalId,
        status: "PENDING",
      })
      .returning();

    await enqueueRemindersForAppointment(appointment, userId);

    await db
      .update(integrationTable)
      .set({ lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(integrationTable.id, integrationId));

    return { created: true, deduped: false, appointmentId: appointment.id };
  } catch (err) {
    // Roll back the claim so a later retry of this booking can succeed.
    await db
      .delete(syncedAppointmentTable)
      .where(eq(syncedAppointmentTable.id, claim.id));
    throw err;
  }
}
