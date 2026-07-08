import { randomBytes } from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { CustomerLimitError, upsertCustomer } from "../lib/customers";
import { resolveEntitlements } from "../lib/entitlements";

const router = Router();

function generateApiKey(): string {
  return `shk_${randomBytes(24).toString("base64url")}`;
}

// Simple in-memory rate limiter for the public ingest endpoint: caps requests
// per API key within a rolling window to blunt spam/flood from a leaked key.
const RATE_LIMIT = 120; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

/**
 * PUBLIC: POST /ingest/customers
 * Authenticated by a per-user API key (header `x-api-key` or Bearer token).
 * Lets external platforms / Zapier / Make push new customers automatically.
 */
router.post("/customers", async (req, res) => {
  try {
    const headerKey = req.header("x-api-key");
    const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    const key = (headerKey || bearer || "").trim();
    if (!key) {
      res.status(401).json({ error: "Missing API key" });
      return;
    }

    if (isRateLimited(key)) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.apiKey, key))
      .limit(1);
    if (!profile) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    const body = req.body ?? {};
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : [body.firstName, body.lastName]
            .filter((p: unknown) => typeof p === "string" && p.trim())
            .join(" ")
            .trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : "api";

    const { maxCustomers } = resolveEntitlements(profile);
    const { customer, created } = await upsertCustomer(
      profile.userId,
      {
        name,
        phone: body.phone,
        email: body.email,
        externalId: body.externalId ?? body.id,
        source,
      },
      { maxCustomers },
    );
    res.status(created ? 201 : 200).json({ ok: true, id: customer.id, created });
  } catch (err) {
    if (err instanceof CustomerLimitError) {
      res.status(403).json({
        error: `Customer limit reached for your plan (${err.limit}). Upgrade to add more.`,
        code: "customer_limit",
      });
      return;
    }
    console.error("[ingest] customers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** SESSION: GET /ingest/api-key — return the user's current ingest key (or null). */
router.get("/api-key", requireUser, async (req, res) => {
  try {
    const [profile] = await db
      .select({ apiKey: userProfileTable.apiKey })
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, req.user!.id))
      .limit(1);
    res.json({ apiKey: profile?.apiKey ?? null });
  } catch (err) {
    console.error("[ingest] get api-key error:", err);
    res.status(500).json({ error: "Kunne ikke hente API-nøkkel" });
  }
});

/** SESSION: POST /ingest/api-key/rotate — (re)generate the user's ingest key. */
router.post("/api-key/rotate", requireUser, async (req, res) => {
  try {
    const apiKey = generateApiKey();
    const updated = await db
      .update(userProfileTable)
      .set({ apiKey, updatedAt: new Date() })
      .where(eq(userProfileTable.userId, req.user!.id))
      .returning({ id: userProfileTable.id });
    if (updated.length === 0) {
      res.status(404).json({ error: "Fant ikke profil" });
      return;
    }
    res.json({ apiKey });
  } catch (err) {
    console.error("[ingest] rotate api-key error:", err);
    res.status(500).json({ error: "Kunne ikke generere API-nøkkel" });
  }
});

export default router;
