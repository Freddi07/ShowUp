import { Router } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lokalAlertTable,
  lokalBusinessTable,
  lokalCompetitorTable,
  lokalGenerationTable,
  lokalReviewTable,
  type LokalBusiness,
} from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();
router.use(requireUser);

// Per-plan limits. null = unlimited. Billing wiring comes later; the plan is
// read from the business record (defaults to "gratis").
const PLAN_LIMITS: Record<
  string,
  { competitors: number | null; generations: number | null }
> = {
  gratis: { competitors: 1, generations: 5 },
  pro: { competitors: 10, generations: 100 },
  bedrift: { competitors: null, generations: null },
};

function planLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.gratis;
}

/** Get the caller's business row, creating an empty one on first access. */
async function getOrCreateBusiness(userId: string): Promise<LokalBusiness> {
  const [existing] = await db
    .select()
    .from(lokalBusinessTable)
    .where(eq(lokalBusinessTable.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(lokalBusinessTable)
    .values({ userId })
    .onConflictDoNothing({ target: lokalBusinessTable.userId })
    .returning();
  if (created) return created;
  // Lost a race with a concurrent insert — read the winner.
  const [row] = await db
    .select()
    .from(lokalBusinessTable)
    .where(eq(lokalBusinessTable.userId, userId))
    .limit(1);
  return row;
}

function serializeBusiness(b: LokalBusiness) {
  return {
    id: b.id,
    name: b.name ?? null,
    orgNumber: b.orgNumber ?? null,
    industry: b.industry ?? null,
    location: b.location ?? null,
    website: b.website ?? null,
    googlePlaceId: b.googlePlaceId ?? null,
    notifyEmail: b.notifyEmail,
    notifyInApp: b.notifyInApp,
    alertFrequency: b.alertFrequency,
    onboardingCompleted: b.onboardingCompleted,
    plan: b.plan,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function cleanStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Validate a body: every listed string field must be a string, null, or absent;
 * every listed boolean field must be a boolean or absent. Returns an error
 * message for the first offending field, or null when the body is well-formed.
 */
function validateBody(
  body: Record<string, unknown>,
  stringFields: string[],
  boolFields: string[],
): string | null {
  for (const f of stringFields) {
    const v = body[f];
    if (v !== undefined && v !== null && typeof v !== "string") {
      return `Feltet "${f}" må være tekst`;
    }
  }
  for (const f of boolFields) {
    const v = body[f];
    if (v !== undefined && typeof v !== "boolean") {
      return `Feltet "${f}" må være av/på`;
    }
  }
  return null;
}

/** GET /lokalradar/overview — account-wide dashboard summary. */
router.get("/overview", async (req, res) => {
  try {
    const userId = req.user!.id;
    const business = await getOrCreateBusiness(userId);
    const limits = planLimits(business.plan);

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [
      [{ count: competitorCount }],
      [{ count: unreadAlertCount }],
      [{ count: generationCountThisMonth }],
      [{ count: reviewCount }],
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lokalCompetitorTable)
        .where(eq(lokalCompetitorTable.userId, userId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lokalAlertTable)
        .where(
          and(
            eq(lokalAlertTable.userId, userId),
            eq(lokalAlertTable.read, false),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lokalGenerationTable)
        .where(
          and(
            eq(lokalGenerationTable.userId, userId),
            gte(lokalGenerationTable.createdAt, startOfMonth),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lokalReviewTable)
        .where(eq(lokalReviewTable.userId, userId)),
    ]);

    res.json({
      competitorCount,
      unreadAlertCount,
      generationCountThisMonth,
      reviewCount,
      plan: business.plan,
      competitorLimit: limits.competitors,
      generationLimit: limits.generations,
    });
  } catch (err) {
    console.error("[lokalradar] overview error:", err);
    res.status(500).json({ error: "Kunne ikke hente oversikt" });
  }
});

/** GET /lokalradar/business — the caller's business profile. */
router.get("/business", async (req, res) => {
  try {
    const business = await getOrCreateBusiness(req.user!.id);
    res.json(serializeBusiness(business));
  } catch (err) {
    console.error("[lokalradar] get business error:", err);
    res.status(500).json({ error: "Kunne ikke hente virksomhet" });
  }
});

/** PUT /lokalradar/business — create or update the business profile. */
router.put("/business", async (req, res) => {
  try {
    const userId = req.user!.id;
    await getOrCreateBusiness(userId);

    const b = req.body ?? {};
    const typeError = validateBody(
      b,
      ["name", "orgNumber", "industry", "location", "website", "googlePlaceId", "alertFrequency"],
      ["notifyEmail", "notifyInApp", "onboardingCompleted"],
    );
    if (typeError) {
      res.status(400).json({ error: typeError });
      return;
    }
    if (
      typeof b.alertFrequency === "string" &&
      !["instant", "daily", "weekly"].includes(b.alertFrequency)
    ) {
      res.status(400).json({ error: "Ugyldig varslingsfrekvens" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    const name = cleanStr(b.name);
    if (name !== undefined) updates.name = name;
    const orgNumber = cleanStr(b.orgNumber);
    if (orgNumber !== undefined) updates.orgNumber = orgNumber;
    const industry = cleanStr(b.industry);
    if (industry !== undefined) updates.industry = industry;
    const location = cleanStr(b.location);
    if (location !== undefined) updates.location = location;
    const website = cleanStr(b.website);
    if (website !== undefined) updates.website = website;
    const googlePlaceId = cleanStr(b.googlePlaceId);
    if (googlePlaceId !== undefined) updates.googlePlaceId = googlePlaceId;

    if (typeof b.notifyEmail === "boolean") updates.notifyEmail = b.notifyEmail;
    if (typeof b.notifyInApp === "boolean") updates.notifyInApp = b.notifyInApp;
    if (typeof b.onboardingCompleted === "boolean")
      updates.onboardingCompleted = b.onboardingCompleted;
    if (
      typeof b.alertFrequency === "string" &&
      ["instant", "daily", "weekly"].includes(b.alertFrequency)
    ) {
      updates.alertFrequency = b.alertFrequency;
    }

    const [updated] = await db
      .update(lokalBusinessTable)
      .set(updates)
      .where(eq(lokalBusinessTable.userId, userId))
      .returning();

    res.json(serializeBusiness(updated));
  } catch (err) {
    console.error("[lokalradar] update business error:", err);
    res.status(500).json({ error: "Kunne ikke lagre virksomhet" });
  }
});

/** GET /lokalradar/competitors — tracked competitors. */
router.get("/competitors", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(lokalCompetitorTable)
      .where(eq(lokalCompetitorTable.userId, req.user!.id))
      .orderBy(desc(lokalCompetitorTable.createdAt));
    res.json({
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        website: c.website ?? null,
        googlePlaceId: c.googlePlaceId ?? null,
        location: c.location ?? null,
        notes: c.notes ?? null,
        lastCheckedAt: c.lastCheckedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[lokalradar] list competitors error:", err);
    res.status(500).json({ error: "Kunne ikke hente konkurrenter" });
  }
});

/** POST /lokalradar/competitors — add a competitor (plan-limited). */
router.post("/competitors", async (req, res) => {
  try {
    const userId = req.user!.id;
    const typeError = validateBody(
      req.body ?? {},
      ["name", "website", "googlePlaceId", "location", "notes"],
      [],
    );
    if (typeError) {
      res.status(400).json({ error: typeError });
      return;
    }
    const name = cleanStr(req.body?.name);
    if (!name) {
      res.status(400).json({ error: "Navn er påkrevd" });
      return;
    }

    const business = await getOrCreateBusiness(userId);
    const limit = planLimits(business.plan).competitors;

    const values = {
      userId,
      name,
      website: cleanStr(req.body?.website) ?? null,
      googlePlaceId: cleanStr(req.body?.googlePlaceId) ?? null,
      location: cleanStr(req.body?.location) ?? null,
      notes: cleanStr(req.body?.notes) ?? null,
    };

    // Enforce the plan limit atomically: a per-user advisory lock serialises
    // concurrent inserts so racing requests cannot exceed the cap.
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
      if (limit !== null) {
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(lokalCompetitorTable)
          .where(eq(lokalCompetitorTable.userId, userId));
        if (count >= limit) return null;
      }
      const [row] = await tx
        .insert(lokalCompetitorTable)
        .values(values)
        .returning();
      return row;
    });

    if (!created) {
      res.status(403).json({
        error: `Du har nådd grensen på ${limit} konkurrent${limit === 1 ? "" : "er"} for planen din. Oppgrader for å følge med på flere.`,
        code: "competitor_limit",
      });
      return;
    }

    res.status(201).json({
      id: created.id,
      name: created.name,
      website: created.website ?? null,
      googlePlaceId: created.googlePlaceId ?? null,
      location: created.location ?? null,
      notes: created.notes ?? null,
      lastCheckedAt: created.lastCheckedAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[lokalradar] create competitor error:", err);
    res.status(500).json({ error: "Kunne ikke lagre konkurrent" });
  }
});

/** DELETE /lokalradar/competitors/:id — stop tracking a competitor. */
router.delete("/competitors/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [existing] = await db
      .select({ id: lokalCompetitorTable.id })
      .from(lokalCompetitorTable)
      .where(
        and(
          eq(lokalCompetitorTable.id, req.params.id),
          eq(lokalCompetitorTable.userId, userId),
        ),
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Konkurrent ikke funnet" });
      return;
    }
    // Snapshots reference the competitor; remove them first.
    await db
      .delete(lokalAlertTable)
      .where(
        and(
          eq(lokalAlertTable.competitorId, existing.id),
          eq(lokalAlertTable.userId, userId),
        ),
      );
    await db
      .delete(lokalCompetitorTable)
      .where(eq(lokalCompetitorTable.id, existing.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[lokalradar] delete competitor error:", err);
    res.status(500).json({ error: "Kunne ikke slette konkurrent" });
  }
});

/** GET /lokalradar/alerts — all alerts for the caller. */
router.get("/alerts", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db
      .select()
      .from(lokalAlertTable)
      .where(eq(lokalAlertTable.userId, userId))
      .orderBy(desc(lokalAlertTable.createdAt));
    const unreadCount = rows.filter((a) => !a.read).length;
    res.json({
      items: rows.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        body: a.body ?? null,
        competitorId: a.competitorId ?? null,
        read: a.read,
        createdAt: a.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (err) {
    console.error("[lokalradar] list alerts error:", err);
    res.status(500).json({ error: "Kunne ikke hente varsler" });
  }
});

/** PATCH /lokalradar/alerts/:id — mark an alert read/unread. */
router.patch("/alerts/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    if (typeof req.body?.read !== "boolean") {
      res.status(400).json({ error: "Ugyldig forespørsel" });
      return;
    }
    const [updated] = await db
      .update(lokalAlertTable)
      .set({ read: req.body.read })
      .where(
        and(
          eq(lokalAlertTable.id, req.params.id),
          eq(lokalAlertTable.userId, userId),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Varsel ikke funnet" });
      return;
    }
    res.json({
      id: updated.id,
      type: updated.type,
      severity: updated.severity,
      title: updated.title,
      body: updated.body ?? null,
      competitorId: updated.competitorId ?? null,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[lokalradar] update alert error:", err);
    res.status(500).json({ error: "Kunne ikke oppdatere varsel" });
  }
});

/** GET /lokalradar/generations — AI-generated marketing content. */
router.get("/generations", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(lokalGenerationTable)
      .where(eq(lokalGenerationTable.userId, req.user!.id))
      .orderBy(desc(lokalGenerationTable.createdAt));
    res.json({
      items: rows.map((g) => ({
        id: g.id,
        kind: g.kind,
        channel: g.channel ?? null,
        prompt: g.prompt ?? null,
        content: g.content,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[lokalradar] list generations error:", err);
    res.status(500).json({ error: "Kunne ikke hente innhold" });
  }
});

export default router;
