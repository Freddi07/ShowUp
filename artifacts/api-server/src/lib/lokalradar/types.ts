/**
 * Shared data shapes for the LokalRadar competitor-monitoring pipeline.
 * These are the structured payloads stored inside `LokalSnapshot.data` (jsonb)
 * and returned by the scan/detail endpoints.
 */

export interface LokalPrice {
  /** What the price is for, e.g. "Herreklipp". */
  label: string;
  /** Numeric amount in NOK when parseable, else null. */
  amount: number | null;
  /** Currency code, defaults to "NOK" when a number was found. */
  currency: string | null;
  /** The raw text the price was extracted from. */
  raw: string | null;
}

/** Extracted structured content from a competitor's website (snapshot kind="web"). */
export interface LokalWebData {
  prices: LokalPrice[];
  offers: string[];
  promotions: string[];
  services: string[];
  summary: string | null;
}

export interface LokalReviewItem {
  author: string | null;
  rating: number | null;
  text: string | null;
  /** ISO timestamp of the review when known. */
  time: string | null;
  /** Human relative time from Google, e.g. "for 2 uker siden". */
  relativeTime: string | null;
}

/** Google Business Profile data (snapshot kind="reviews"). */
export interface LokalReviewData {
  rating: number | null;
  reviewCount: number | null;
  reviews: LokalReviewItem[];
}

/** A single detected change between two snapshots. */
export interface LokalChange {
  /**
   * price_drop | price_increase | new_offer | new_promotion |
   * rating_up | rating_drop | new_reviews
   */
  type: string;
  severity: "info" | "warning" | "critical";
  /** Short Norwegian headline describing the change. */
  title: string;
  /** Machine-readable detail used to build the AI prompt. */
  detail: string;
}
