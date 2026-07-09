import { Router } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lokalAlertTable,
  lokalBusinessTable,
  lokalCompetitorTable,
  lokalGenerationTable,
  lokalReviewTable,
  lokalSnapshotTable,
  type LokalAlert,
  type LokalBusiness,
  type LokalCompetitor,
  type LokalGeneration,
  type LokalReview,
} from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { runScan } from "../lib/lokalradar/scan";
import { extractPlaceId } from "../lib/lokalradar/google-places";
import { fetchVisibleText } from "../lib/lokalradar/web-scrape";
import {
  generatePosts,
  generateReviewReply,
  analyzeSeo,
} from "../lib/lokalradar/marketing";
import type {
  LokalReviewData,
  LokalWebData,
} from "../lib/lokalradar/types";

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

function serializeCompetitor(c: LokalCompetitor) {
  return {
    id: c.id,
    name: c.name,
    website: c.website ?? null,
    googlePlaceId: c.googlePlaceId ?? null,
    location: c.location ?? null,
    notes: c.notes ?? null,
    status: c.status,
    lastError: c.lastError ?? null,
    lastCheckedAt: c.lastCheckedAt?.toISOString() ?? null,
    lastChangeAt: c.lastChangeAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

function serializeAlert(a: LokalAlert) {
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    body: a.body ?? null,
    competitorId: a.competitorId ?? null,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
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
    res.json({ items: rows.map(serializeCompetitor) });
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

    // A pasted Google Maps link or raw Place ID is normalised to a Place ID.
    // When it can't be parsed (e.g. a short share link), we store null and let
    // the scan resolve the place from name + location via text search.
    const rawPlace = cleanStr(req.body?.googlePlaceId) ?? null;
    const values = {
      userId,
      name,
      website: cleanStr(req.body?.website) ?? null,
      googlePlaceId: rawPlace ? extractPlaceId(rawPlace) : null,
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

    res.status(201).json(serializeCompetitor(created));
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
    // Snapshots have a FK to the competitor (no cascade); remove all child
    // rows first, then the competitor itself.
    await db
      .delete(lokalAlertTable)
      .where(
        and(
          eq(lokalAlertTable.competitorId, existing.id),
          eq(lokalAlertTable.userId, userId),
        ),
      );
    await db
      .delete(lokalReviewTable)
      .where(
        and(
          eq(lokalReviewTable.competitorId, existing.id),
          eq(lokalReviewTable.userId, userId),
        ),
      );
    await db
      .delete(lokalSnapshotTable)
      .where(eq(lokalSnapshotTable.competitorId, existing.id));
    await db
      .delete(lokalCompetitorTable)
      .where(eq(lokalCompetitorTable.id, existing.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[lokalradar] delete competitor error:", err);
    res.status(500).json({ error: "Kunne ikke slette konkurrent" });
  }
});

/** GET /lokalradar/competitors/:id — detail with snapshots, changes, trends. */
router.get("/competitors/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [competitor] = await db
      .select()
      .from(lokalCompetitorTable)
      .where(
        and(
          eq(lokalCompetitorTable.id, req.params.id),
          eq(lokalCompetitorTable.userId, userId),
        ),
      )
      .limit(1);
    if (!competitor) {
      res.status(404).json({ error: "Konkurrent ikke funnet" });
      return;
    }

    const [snapshots, alerts, reviews] = await Promise.all([
      db
        .select()
        .from(lokalSnapshotTable)
        .where(eq(lokalSnapshotTable.competitorId, competitor.id))
        .orderBy(asc(lokalSnapshotTable.capturedAt)),
      db
        .select()
        .from(lokalAlertTable)
        .where(
          and(
            eq(lokalAlertTable.userId, userId),
            eq(lokalAlertTable.competitorId, competitor.id),
          ),
        )
        .orderBy(desc(lokalAlertTable.createdAt)),
      db
        .select()
        .from(lokalReviewTable)
        .where(
          and(
            eq(lokalReviewTable.userId, userId),
            eq(lokalReviewTable.competitorId, competitor.id),
          ),
        )
        .orderBy(desc(lokalReviewTable.reviewedAt)),
    ]);

    const webSnaps = snapshots.filter((s) => s.kind === "web");
    const reviewSnaps = snapshots.filter((s) => s.kind === "reviews");

    const latestWeb =
      webSnaps.length > 0
        ? (webSnaps[webSnaps.length - 1].data as LokalWebData)
        : null;
    const latestReviews =
      reviewSnaps.length > 0
        ? (reviewSnaps[reviewSnaps.length - 1].data as LokalReviewData)
        : null;

    const priceHistory = webSnaps.map((s) => {
      const data = s.data as LokalWebData | null;
      const amounts = (data?.prices ?? [])
        .map((p) => p.amount)
        .filter((a): a is number => typeof a === "number" && a > 0);
      const minPrice = amounts.length ? Math.min(...amounts) : null;
      const avgPrice = amounts.length
        ? Math.round(amounts.reduce((sum, a) => sum + a, 0) / amounts.length)
        : null;
      return { capturedAt: s.capturedAt.toISOString(), minPrice, avgPrice };
    });

    const ratingHistory = reviewSnaps.map((s) => {
      const data = s.data as LokalReviewData | null;
      return {
        capturedAt: s.capturedAt.toISOString(),
        rating: data?.rating ?? null,
        reviewCount: data?.reviewCount ?? null,
      };
    });

    res.json({
      competitor: serializeCompetitor(competitor),
      latestWeb,
      latestReviews,
      alerts: alerts.map(serializeAlert),
      reviews: reviews.map((r) => ({
        id: r.id,
        competitorId: r.competitorId ?? null,
        source: r.source ?? null,
        author: r.author ?? null,
        rating: r.rating ?? null,
        text: r.text ?? null,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      ratingHistory,
      priceHistory,
    });
  } catch (err) {
    console.error("[lokalradar] competitor detail error:", err);
    res.status(500).json({ error: "Kunne ikke hente konkurrent" });
  }
});

/** POST /lokalradar/competitors/:id/scan — run a scan now. */
router.post("/competitors/:id/scan", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [competitor] = await db
      .select()
      .from(lokalCompetitorTable)
      .where(
        and(
          eq(lokalCompetitorTable.id, req.params.id),
          eq(lokalCompetitorTable.userId, userId),
        ),
      )
      .limit(1);
    if (!competitor) {
      res.status(404).json({ error: "Konkurrent ikke funnet" });
      return;
    }

    const business = await getOrCreateBusiness(userId);
    const result = await runScan(business, competitor);

    // Re-read the competitor so the caller gets fresh status/timestamps.
    const [updated] = await db
      .select()
      .from(lokalCompetitorTable)
      .where(eq(lokalCompetitorTable.id, competitor.id))
      .limit(1);

    res.json({
      status: result.status,
      message: result.message,
      createdAlerts: result.createdAlerts,
      competitor: serializeCompetitor(updated ?? competitor),
      latestWeb: result.webData,
      latestReviews: result.reviewData,
    });
  } catch (err) {
    console.error("[lokalradar] scan competitor error:", err);
    res.status(500).json({ error: "Kunne ikke skanne konkurrent" });
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
    res.json({ items: rows.map(serializeAlert), unreadCount });
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
    res.json(serializeAlert(updated));
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

// --- Marketing assistant ---------------------------------------------------

function startOfMonthUTC(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function generationsUsedThisMonth(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lokalGenerationTable)
    .where(
      and(
        eq(lokalGenerationTable.userId, userId),
        gte(lokalGenerationTable.createdAt, startOfMonthUTC()),
      ),
    );
  return count;
}

function generationLimitMessage(limit: number): string {
  return `Du har brukt opp de ${limit} AI-genereringene som inngår i planen din denne måneden. Oppgrader for å lage mer innhold.`;
}

function serializeGeneration(g: LokalGeneration) {
  return {
    id: g.id,
    kind: g.kind,
    channel: g.channel ?? null,
    prompt: g.prompt ?? null,
    content: g.content,
    createdAt: g.createdAt.toISOString(),
  };
}

function serializeReview(r: LokalReview) {
  return {
    id: r.id,
    competitorId: r.competitorId ?? null,
    source: r.source ?? null,
    author: r.author ?? null,
    rating: r.rating ?? null,
    text: r.text ?? null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Persist a generation while atomically enforcing the monthly plan cap. A
 * per-user advisory lock serialises concurrent generations so racing requests
 * cannot exceed the limit. Returns "limit" when the cap is reached.
 */
async function logGenerationWithLimit(
  userId: string,
  limit: number | null,
  row: { kind: string; channel: string | null; prompt: string | null; content: string },
): Promise<LokalGeneration | "limit"> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
    if (limit !== null) {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(lokalGenerationTable)
        .where(
          and(
            eq(lokalGenerationTable.userId, userId),
            gte(lokalGenerationTable.createdAt, startOfMonthUTC()),
          ),
        );
      if (count >= limit) return "limit";
    }
    const [inserted] = await tx
      .insert(lokalGenerationTable)
      .values({ userId, ...row })
      .returning();
    return inserted;
  });
}

/** POST /lokalradar/generate/posts — generate ready-to-post marketing drafts. */
router.post("/generate/posts", async (req, res) => {
  try {
    const userId = req.user!.id;
    const typeError = validateBody(
      req.body ?? {},
      ["channel", "industry", "season", "tone", "keywords"],
      [],
    );
    if (typeError) {
      res.status(400).json({ error: typeError });
      return;
    }
    const channel = (cleanStr(req.body?.channel) ?? "facebook").toLowerCase();
    if (!["google", "facebook", "instagram"].includes(channel)) {
      res.status(400).json({ error: "Ugyldig kanal" });
      return;
    }

    const business = await getOrCreateBusiness(userId);
    const limit = planLimits(business.plan).generations;
    if (limit !== null && (await generationsUsedThisMonth(userId)) >= limit) {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit), code: "generation_limit" });
      return;
    }

    const industry = cleanStr(req.body?.industry) ?? business.industry ?? null;
    const season = cleanStr(req.body?.season) ?? null;
    const tone = cleanStr(req.body?.tone) ?? null;
    const keywords = cleanStr(req.body?.keywords) ?? null;

    const posts = await generatePosts(
      { name: business.name, industry, location: business.location },
      { channel, industry, season, tone, keywords },
    );
    if (posts.length === 0) {
      res
        .status(502)
        .json({ error: "AI-en klarte ikke å lage innlegg akkurat nå. Prøv igjen." });
      return;
    }

    const promptSummary =
      [industry, season, tone, keywords].filter(Boolean).join(" · ") || null;
    const logged = await logGenerationWithLimit(userId, limit, {
      kind: channel === "google" ? "google_post" : "social_post",
      channel,
      prompt: promptSummary,
      content: posts.join("\n\n---\n\n"),
    });
    if (logged === "limit") {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit!), code: "generation_limit" });
      return;
    }

    res.json({ posts, generation: serializeGeneration(logged) });
  } catch (err) {
    console.error("[lokalradar] generate posts error:", err);
    res.status(500).json({ error: "Kunne ikke lage innlegg" });
  }
});

/** GET /lokalradar/reviews — reviews available to the review-reply assistant. */
router.get("/reviews", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(lokalReviewTable)
      .where(eq(lokalReviewTable.userId, req.user!.id))
      .orderBy(desc(lokalReviewTable.createdAt));
    res.json({ items: rows.map(serializeReview) });
  } catch (err) {
    console.error("[lokalradar] list reviews error:", err);
    res.status(500).json({ error: "Kunne ikke hente anmeldelser" });
  }
});

/** POST /lokalradar/reviews — manually add a review to reply to. */
router.post("/reviews", async (req, res) => {
  try {
    const userId = req.user!.id;
    const typeError = validateBody(req.body ?? {}, ["author", "text", "source"], []);
    if (typeError) {
      res.status(400).json({ error: typeError });
      return;
    }
    const text = cleanStr(req.body?.text);
    if (!text) {
      res.status(400).json({ error: "Anmeldelsestekst er påkrevd" });
      return;
    }
    let rating: number | null = null;
    if (req.body?.rating !== undefined && req.body?.rating !== null) {
      const r = Number(req.body.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        res.status(400).json({ error: "Vurdering må være et helt tall mellom 1 og 5" });
        return;
      }
      rating = r;
    }
    const [row] = await db
      .insert(lokalReviewTable)
      .values({
        userId,
        competitorId: null,
        source: cleanStr(req.body?.source) ?? "manuell",
        author: cleanStr(req.body?.author) ?? null,
        rating,
        text,
      })
      .returning();
    res.status(201).json(serializeReview(row));
  } catch (err) {
    console.error("[lokalradar] create review error:", err);
    res.status(500).json({ error: "Kunne ikke lagre anmeldelse" });
  }
});

/** POST /lokalradar/generate/review-reply — suggest a reply to one review. */
router.post("/generate/review-reply", async (req, res) => {
  try {
    const userId = req.user!.id;
    const reviewId = cleanStr(req.body?.reviewId);
    if (!reviewId) {
      res.status(400).json({ error: "reviewId er påkrevd" });
      return;
    }
    const [review] = await db
      .select()
      .from(lokalReviewTable)
      .where(and(eq(lokalReviewTable.id, reviewId), eq(lokalReviewTable.userId, userId)))
      .limit(1);
    if (!review) {
      res.status(404).json({ error: "Anmeldelse ikke funnet" });
      return;
    }

    const business = await getOrCreateBusiness(userId);
    const limit = planLimits(business.plan).generations;
    if (limit !== null && (await generationsUsedThisMonth(userId)) >= limit) {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit), code: "generation_limit" });
      return;
    }

    const reply = await generateReviewReply(
      { name: business.name, industry: business.industry, location: business.location },
      { author: review.author, rating: review.rating, text: review.text },
    );
    // TODO: Full Google Business Profile API integration for direct publishing when user connects account
    if (!reply) {
      res
        .status(502)
        .json({ error: "AI-en klarte ikke å lage et svar akkurat nå. Prøv igjen." });
      return;
    }

    const logged = await logGenerationWithLimit(userId, limit, {
      kind: "review_reply",
      channel: review.source ?? null,
      prompt: (review.text ?? "").slice(0, 120) || null,
      content: reply,
    });
    if (logged === "limit") {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit!), code: "generation_limit" });
      return;
    }

    res.json({ reply, generation: serializeGeneration(logged) });
  } catch (err) {
    console.error("[lokalradar] review reply error:", err);
    res.status(500).json({ error: "Kunne ikke lage svar" });
  }
});

/** POST /lokalradar/generate/seo — SEO/website suggestions for the user's site. */
router.post("/generate/seo", async (req, res) => {
  try {
    const userId = req.user!.id;
    const typeError = validateBody(req.body ?? {}, ["url"], []);
    if (typeError) {
      res.status(400).json({ error: typeError });
      return;
    }
    const raw = cleanStr(req.body?.url);
    if (!raw) {
      res.status(400).json({ error: "Nettadresse er påkrevd" });
      return;
    }
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    const business = await getOrCreateBusiness(userId);
    const limit = planLimits(business.plan).generations;
    if (limit !== null && (await generationsUsedThisMonth(userId)) >= limit) {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit), code: "generation_limit" });
      return;
    }

    let pageText: string;
    try {
      pageText = await fetchVisibleText(url);
    } catch (err) {
      res.status(400).json({
        error: `Kunne ikke hente nettsiden: ${(err as Error).message}`,
      });
      return;
    }
    if (!pageText || pageText.trim().length < 50) {
      res.status(422).json({
        error:
          "Fant lite tekstinnhold på nettsiden. Sjekk at adressen er riktig, eller prøv en annen side.",
      });
      return;
    }

    const suggestions = await analyzeSeo(
      { name: business.name, industry: business.industry, location: business.location },
      url,
      pageText,
    );
    if (!suggestions) {
      res
        .status(502)
        .json({ error: "AI-en klarte ikke å analysere nettsiden akkurat nå. Prøv igjen." });
      return;
    }

    const logged = await logGenerationWithLimit(userId, limit, {
      kind: "seo_tip",
      channel: null,
      prompt: url,
      content: suggestions,
    });
    if (logged === "limit") {
      res
        .status(403)
        .json({ error: generationLimitMessage(limit!), code: "generation_limit" });
      return;
    }

    res.json({ url, suggestions, generation: serializeGeneration(logged) });
  } catch (err) {
    console.error("[lokalradar] seo analysis error:", err);
    res.status(500).json({ error: "Kunne ikke analysere nettsiden" });
  }
});

export default router;
