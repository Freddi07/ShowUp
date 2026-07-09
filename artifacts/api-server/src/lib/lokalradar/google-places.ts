/**
 * Google Places API (New) client for LokalRadar competitor reviews.
 *
 * Uses an app-level key from GOOGLE_PLACES_API_KEY. Everything degrades
 * gracefully: when the key is absent, `isPlacesConfigured()` is false and the
 * scan simply skips the reviews half (website monitoring still works).
 */
import type { LokalReviewData, LokalReviewItem } from "./types";

const PLACES_BASE = "https://places.googleapis.com/v1";
const FETCH_TIMEOUT_MS = 12_000;

export function isPlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY mangler");
  return key;
}

async function placesFetch(
  path: string,
  init: RequestInit & { fieldMask: string },
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const { fieldMask, ...rest } = init;
  try {
    return await fetch(`${PLACES_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": fieldMask,
        ...(rest.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract a Place ID from a pasted value: a raw ID (starts with ChIJ/GhIJ/etc.)
 * or a Google Maps URL that embeds a place_id / cid. Returns null when nothing
 * usable is found (the caller can then fall back to a text search).
 */
export function extractPlaceId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // Raw Place IDs are opaque tokens without spaces or slashes.
  if (!/[\s/]/.test(s) && /^[A-Za-z0-9_-]{15,}$/.test(s)) return s;
  const byParam = s.match(/[?&]place_id=([A-Za-z0-9_-]+)/);
  if (byParam) return byParam[1];
  const byQuery = s.match(/place_id:([A-Za-z0-9_-]+)/);
  if (byQuery) return byQuery[1];
  return null;
}

/** Resolve a business name (+ optional location) to a Place ID via text search. */
export async function resolvePlaceId(
  name: string,
  location?: string | null,
): Promise<string | null> {
  const textQuery = [name, location].filter(Boolean).join(", ");
  const res = await placesFetch("/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName",
    body: JSON.stringify({ textQuery, languageCode: "no", regionCode: "NO" }),
  });
  if (!res.ok) {
    throw new Error(`Google Places-søk feilet (${res.status})`);
  }
  const data = (await res.json()) as { places?: Array<{ id?: string }> };
  return data.places?.[0]?.id ?? null;
}

/** Fetch rating, review count and recent reviews for a Place ID. */
export async function getPlaceDetails(placeId: string): Promise<LokalReviewData> {
  const res = await placesFetch(`/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    fieldMask: "rating,userRatingCount,reviews",
  });
  if (!res.ok) {
    throw new Error(`Google Places-oppslag feilet (${res.status})`);
  }
  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: Array<{
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      authorAttribution?: { displayName?: string };
      publishTime?: string;
      relativePublishTimeDescription?: string;
    }>;
  };

  const reviews: LokalReviewItem[] = (data.reviews ?? []).slice(0, 5).map((r) => ({
    author: r.authorAttribution?.displayName ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    text: r.text?.text ?? r.originalText?.text ?? null,
    time: r.publishTime ?? null,
    relativeTime: r.relativePublishTimeDescription ?? null,
  }));

  return {
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    reviews,
  };
}
