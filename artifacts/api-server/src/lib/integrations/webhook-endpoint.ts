/**
 * PUBLIC inbound webhook endpoint for booking-source integrations.
 *
 * Mounted BEFORE express.json() so it receives the raw request body — HMAC
 * verification must run over the exact bytes the sender signed. The route is
 * unauthenticated (external systems call it) but every request is verified
 * against the integration's shared secret before anything is written.
 */
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { integrationTable } from "@workspace/db/schema";
import { decryptJSON } from "./crypto";
import { getProvider } from "./registry";
import { ingestBooking } from "./normalize";
import {
  WebhookPayloadError,
  WebhookSignatureError,
} from "./providers/generic-webhook";

// Lightweight in-memory rate limiter to blunt floods from a leaked URL or a
// stream of bogus (attacker-chosen) integration ids. Resets on process restart,
// which is acceptable for this purpose. A global window bounds total traffic; a
// per-integration window bounds a single leaked URL; expired buckets are pruned
// so attacker-controlled keys cannot grow memory without bound.
const RATE_LIMIT = 120; // per integration, per window
const GLOBAL_LIMIT = 2_000; // across all integrations, per window
const MAX_BUCKETS = 10_000; // prune trigger
const RATE_WINDOW_MS = 60_000; // per minute
const buckets = new Map<string, { count: number; resetAt: number }>();
let globalWindow = { count: 0, resetAt: 0 };

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function isRateLimited(key: string): boolean {
  const now = Date.now();

  // Global window: coarse protection against a flood of distinct ids.
  if (now > globalWindow.resetAt) {
    globalWindow = { count: 1, resetAt: now + RATE_WINDOW_MS };
  } else {
    globalWindow.count++;
    if (globalWindow.count > GLOBAL_LIMIT) return true;
  }

  // Bound memory from attacker-controlled keys.
  if (buckets.size > MAX_BUCKETS) pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

/** The header external systems send with the HMAC-SHA256 signature. */
const SIGNATURE_HEADER = "x-bookpling-signature";

export async function handleIntegrationWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const integrationId = String(req.params.integrationId ?? "");
  try {
    if (isRateLimited(integrationId)) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    const [row] = await db
      .select()
      .from(integrationTable)
      .where(
        and(
          eq(integrationTable.id, integrationId),
          eq(integrationTable.provider, "generic_webhook"),
        ),
      )
      .limit(1);

    if (!row || row.status !== "connected") {
      res.status(404).json({ error: "Unknown or inactive webhook." });
      return;
    }

    // Keep the raw body (Buffer from express.raw) as-is. We must NOT parse it
    // until the HMAC signature is verified — parsing before verification would
    // let an unauthenticated caller force parse work on a public endpoint.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : "";

    const credentials = row.credentialsEncrypted
      ? decryptJSON<Record<string, unknown>>(row.credentialsEncrypted)
      : {};
    const provider = getProvider("generic_webhook", {
      userId: row.userId,
      integrationId: row.id,
      credentials,
    });

    const signature = req.header(SIGNATURE_HEADER);

    let bookings;
    try {
      // Pass undefined payload so the provider verifies the signature over the
      // raw bytes first, then parses only on success.
      bookings = await provider.verifyWebhook(undefined, signature, rawBody);
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        res.status(401).json({ error: "Invalid signature." });
        return;
      }
      if (err instanceof WebhookPayloadError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    let created = 0;
    let deduped = 0;
    for (const booking of bookings) {
      const result = await ingestBooking({
        userId: row.userId,
        integrationId: row.id,
        provider: "generic_webhook",
        booking,
      });
      if (result.created) created++;
      else if (result.deduped) deduped++;
    }

    // Clear any previous error state on a successful delivery.
    if (row.lastError) {
      await db
        .update(integrationTable)
        .set({ lastError: null, updatedAt: new Date() })
        .where(eq(integrationTable.id, row.id));
    }

    res.status(200).json({ ok: true, received: bookings.length, created, deduped });
  } catch (err) {
    console.error("[integrations] webhook error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
