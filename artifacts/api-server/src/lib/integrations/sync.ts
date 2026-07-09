/**
 * Polling sync for booking-source integrations.
 *
 * Shared by the manual "test sync" route and the background loop. For a given
 * integration it decrypts the stored credentials, asks the provider for new
 * bookings, feeds each through the idempotent ingest pipeline, and records the
 * outcome (lastSyncedAt / lastError) on the integration row.
 *
 * Only polling providers (OAuth calendars) are swept by the loop; webhook and
 * manual providers push data in and are skipped.
 */
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { integrationTable, type Integration } from "@workspace/db/schema";
import { decryptJSON } from "./crypto";
import { getProvider, isProviderImplemented } from "./registry";
import { getCatalogEntry } from "./catalog";
import { ingestBooking } from "./normalize";
import { logger } from "../logger";

export interface SyncResult {
  fetched: number;
  created: number;
  deduped: number;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Ukjent feil";
}

export async function syncIntegrationRow(
  row: Integration,
): Promise<SyncResult> {
  const credentials = row.credentialsEncrypted
    ? decryptJSON<Record<string, unknown>>(row.credentialsEncrypted)
    : {};
  const provider = getProvider(row.provider, {
    userId: row.userId,
    integrationId: row.id,
    credentials,
  });

  let bookings;
  try {
    bookings = await provider.fetchNewBookings(row.lastSyncedAt ?? undefined);
  } catch (err) {
    await db
      .update(integrationTable)
      .set({ status: "error", lastError: errorMessage(err), updatedAt: new Date() })
      .where(eq(integrationTable.id, row.id));
    throw err;
  }

  let created = 0;
  let deduped = 0;
  for (const booking of bookings) {
    const result = await ingestBooking({
      userId: row.userId,
      integrationId: row.id,
      provider: row.provider,
      booking,
    });
    if (result.created) created += 1;
    else if (result.deduped) deduped += 1;
  }

  await db
    .update(integrationTable)
    .set({
      status: "connected",
      lastSyncedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(integrationTable.id, row.id));

  return { fetched: bookings.length, created, deduped };
}

/** Sweep every connected polling (OAuth) integration once. */
export async function syncAllConnected(): Promise<void> {
  const rows = await db
    .select()
    .from(integrationTable)
    .where(eq(integrationTable.status, "connected"));

  for (const row of rows) {
    if (!isProviderImplemented(row.provider)) continue;
    // Only OAuth calendar providers are polled; webhook/manual push their data.
    if (getCatalogEntry(row.provider)?.authType !== "oauth") continue;
    try {
      await syncIntegrationRow(row);
    } catch (err) {
      logger.error(
        { err, provider: row.provider },
        "[integrations] scheduled sync failed",
      );
    }
  }
}

let started = false;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Start the background polling loop. Idempotent; call once at startup. */
export function startIntegrationSyncLoop(): void {
  if (started) return;
  started = true;
  logger.info("[integrations] sync loop started (every 5m)");
  setTimeout(() => void syncAllConnected().catch(() => {}), 15_000);
  setInterval(() => void syncAllConnected().catch(() => {}), SYNC_INTERVAL_MS);
}
