/**
 * Scan orchestrator: fetches a competitor's website + Google profile, stores
 * snapshots, detects changes against the previous snapshot, persists new reviews
 * historically, and creates AI-analysed alerts. A per-competitor advisory lock
 * serialises concurrent scans so no duplicate snapshots are written.
 */
import { and, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lokalAlertTable,
  lokalCompetitorTable,
  lokalReviewTable,
  lokalSnapshotTable,
  type LokalBusiness,
  type LokalCompetitor,
} from "@workspace/db/schema";
import { analyzeChanges } from "./analyze";
import { detectReviewChanges, detectWebChanges } from "./change-detect";
import {
  getPlaceDetails,
  isPlacesConfigured,
  resolvePlaceId,
} from "./google-places";
import { normalizeUrl, scrapeWebsite } from "./web-scrape";
import type {
  LokalChange,
  LokalReviewData,
  LokalWebData,
} from "./types";

export interface ScanResult {
  status: "ok" | "partial" | "error";
  message: string | null;
  webData: LokalWebData | null;
  reviewData: LokalReviewData | null;
  createdAlerts: number;
  changes: LokalChange[];
}

async function latestSnapshot(competitorId: string, kind: string) {
  const [row] = await db
    .select()
    .from(lokalSnapshotTable)
    .where(
      and(
        eq(lokalSnapshotTable.competitorId, competitorId),
        eq(lokalSnapshotTable.kind, kind),
      ),
    )
    .orderBy(desc(lokalSnapshotTable.capturedAt))
    .limit(1);
  return row ?? null;
}

/** Stable dedupe key for an individual review. */
function reviewKey(author: string | null, text: string | null): string {
  return `${(author ?? "").toLowerCase()}::${(text ?? "").slice(0, 120).toLowerCase()}`;
}

async function persistNewReviews(
  userId: string,
  competitorId: string,
  data: LokalReviewData,
): Promise<void> {
  if (!data.reviews.length) return;
  const existing = await db
    .select({
      author: lokalReviewTable.author,
      text: lokalReviewTable.text,
    })
    .from(lokalReviewTable)
    .where(
      and(
        eq(lokalReviewTable.userId, userId),
        eq(lokalReviewTable.competitorId, competitorId),
      ),
    );
  const seen = new Set(existing.map((r) => reviewKey(r.author, r.text)));
  const toInsert = data.reviews
    .filter((r) => !seen.has(reviewKey(r.author, r.text)))
    .map((r) => ({
      userId,
      competitorId,
      source: "google",
      author: r.author,
      rating: r.rating !== null ? Math.round(r.rating) : null,
      text: r.text,
      reviewedAt: r.time ? new Date(r.time) : null,
    }));
  if (toInsert.length) {
    await db.insert(lokalReviewTable).values(toInsert);
  }
}

/**
 * Run a full scan for one competitor. Assumes the competitor belongs to userId
 * (the caller has already verified ownership).
 */
export async function runScan(
  business: LokalBusiness,
  competitor: LokalCompetitor,
): Promise<ScanResult> {
  const userId = business.userId;
  const errors: string[] = [];
  let webData: LokalWebData | null = null;
  let reviewData: LokalReviewData | null = null;
  const changes: LokalChange[] = [];
  let resolvedPlaceId = competitor.googlePlaceId;

  const now = new Date();

  // Serialise concurrent scans of the same competitor with an atomic claim.
  // The conditional UPDATE only succeeds for one caller: a second concurrent
  // scan sees status='scanning' with a fresh timestamp and matches nothing.
  // A stale claim (crashed scan) older than the timeout can be reclaimed.
  const STALE_MS = 2 * 60 * 1000;
  const staleBefore = new Date(now.getTime() - STALE_MS);
  const claimed = await db
    .update(lokalCompetitorTable)
    .set({ status: "scanning", lastCheckedAt: now })
    .where(
      and(
        eq(lokalCompetitorTable.id, competitor.id),
        or(
          ne(lokalCompetitorTable.status, "scanning"),
          isNull(lokalCompetitorTable.lastCheckedAt),
          lt(lokalCompetitorTable.lastCheckedAt, staleBefore),
        ),
      ),
    )
    .returning({ id: lokalCompetitorTable.id });
  if (!claimed.length) {
    return {
      status: "error",
      message: "En skanning pågår allerede for denne konkurrenten",
      webData: null,
      reviewData: null,
      createdAlerts: 0,
      changes: [],
    };
  }

  // --- Website ---
  if (competitor.website) {
    try {
      const url = normalizeUrl(competitor.website);
      webData = await scrapeWebsite(url);
      const prev = await latestSnapshot(competitor.id, "web");
      await db.insert(lokalSnapshotTable).values({
        competitorId: competitor.id,
        kind: "web",
        data: webData,
      });
      if (prev?.data) {
        changes.push(
          ...detectWebChanges(prev.data as LokalWebData, webData),
        );
      }
    } catch (err) {
      errors.push(`Nettside: ${(err as Error).message}`);
    }
  }

  // --- Google reviews (optional) ---
  if (isPlacesConfigured()) {
    try {
      if (!resolvedPlaceId && (competitor.name || competitor.location)) {
        resolvedPlaceId = await resolvePlaceId(
          competitor.name,
          competitor.location,
        );
        if (resolvedPlaceId) {
          await db
            .update(lokalCompetitorTable)
            .set({ googlePlaceId: resolvedPlaceId })
            .where(eq(lokalCompetitorTable.id, competitor.id));
        }
      }
      if (resolvedPlaceId) {
        reviewData = await getPlaceDetails(resolvedPlaceId);
        const prev = await latestSnapshot(competitor.id, "reviews");
        await db.insert(lokalSnapshotTable).values({
          competitorId: competitor.id,
          kind: "reviews",
          data: reviewData,
        });
        await persistNewReviews(userId, competitor.id, reviewData);
        if (prev?.data) {
          changes.push(
            ...detectReviewChanges(prev.data as LokalReviewData, reviewData),
          );
        }
      }
    } catch (err) {
      errors.push(`Google: ${(err as Error).message}`);
    }
  }

  // --- Alerts from detected changes ---
  let createdAlerts = 0;
  if (changes.length) {
    const suggestions = await analyzeChanges(
      { name: business.name, industry: business.industry, location: business.location },
      competitor.name,
      changes,
    );
    const rows = changes.map((c, i) => ({
      userId,
      competitorId: competitor.id,
      type: c.type,
      severity: c.severity,
      title: c.title,
      body: suggestions[i] ?? null,
    }));
    await db.insert(lokalAlertTable).values(rows);
    createdAlerts = rows.length;
  }

  // --- Update competitor status ---
  const attempted = Boolean(competitor.website) || isPlacesConfigured();
  const gotSomething = webData !== null || reviewData !== null;
  let status: ScanResult["status"];
  if (!attempted) {
    status = "error";
    errors.push("Ingen nettside eller Google-profil å skanne");
  } else if (errors.length && !gotSomething) {
    status = "error";
  } else if (errors.length) {
    status = "partial";
  } else {
    status = "ok";
  }

  const finishedAt = new Date();
  await db
    .update(lokalCompetitorTable)
    .set({
      status: status === "error" ? "error" : "ok",
      lastError: errors.length ? errors.join(" · ") : null,
      lastCheckedAt: finishedAt,
      ...(changes.length ? { lastChangeAt: finishedAt } : {}),
    })
    .where(eq(lokalCompetitorTable.id, competitor.id));

  return {
    status,
    message: errors.length ? errors.join(" · ") : null,
    webData,
    reviewData,
    createdAlerts,
    changes,
  };
}
