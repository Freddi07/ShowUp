/**
 * Change detection between two consecutive snapshots. Deterministic and
 * side-effect free — it only compares data and returns a list of changes. The
 * AI layer later turns each change into an actionable Norwegian suggestion.
 */
import type { LokalChange, LokalReviewData, LokalWebData } from "./types";

/** Representative price (the lowest parseable amount) of a web snapshot. */
function minPrice(data: LokalWebData): number | null {
  const amounts = data.prices
    .map((p) => p.amount)
    .filter((a): a is number => a !== null && a > 0);
  return amounts.length ? Math.min(...amounts) : null;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const fmt = (n: number) => `${n.toLocaleString("nb-NO")} kr`;

/** Detect price/offer/promotion changes on a competitor's website. */
export function detectWebChanges(
  prev: LokalWebData,
  curr: LokalWebData,
): LokalChange[] {
  const changes: LokalChange[] = [];

  const prevMin = minPrice(prev);
  const currMin = minPrice(curr);
  if (prevMin !== null && currMin !== null && prevMin !== currMin) {
    const pct = Math.round(((currMin - prevMin) / prevMin) * 100);
    if (currMin < prevMin) {
      changes.push({
        type: "price_drop",
        severity: "warning",
        title: `Konkurrenten satte ned prisen (fra ${fmt(prevMin)} til ${fmt(currMin)})`,
        detail: `Laveste pris falt fra ${fmt(prevMin)} til ${fmt(currMin)} (${pct}%).`,
      });
    } else {
      changes.push({
        type: "price_increase",
        severity: "info",
        title: `Konkurrenten satte opp prisen (fra ${fmt(prevMin)} til ${fmt(currMin)})`,
        detail: `Laveste pris steg fra ${fmt(prevMin)} til ${fmt(currMin)} (+${pct}%).`,
      });
    }
  }

  const prevOffers = new Set(prev.offers.map(norm));
  const newOffers = curr.offers.filter((o) => !prevOffers.has(norm(o)));
  if (newOffers.length) {
    changes.push({
      type: "new_offer",
      severity: "info",
      title:
        newOffers.length === 1
          ? `Ny tjeneste: ${newOffers[0]}`
          : `${newOffers.length} nye tjenester hos konkurrenten`,
      detail: `Nye tjenester/produkter: ${newOffers.slice(0, 8).join("; ")}.`,
    });
  }

  const prevPromos = new Set(prev.promotions.map(norm));
  const newPromos = curr.promotions.filter((p) => !prevPromos.has(norm(p)));
  if (newPromos.length) {
    changes.push({
      type: "new_promotion",
      severity: "warning",
      title:
        newPromos.length === 1
          ? `Nytt tilbud: ${newPromos[0]}`
          : `${newPromos.length} nye kampanjer hos konkurrenten`,
      detail: `Nye kampanjer/tilbud: ${newPromos.slice(0, 8).join("; ")}.`,
    });
  }

  return changes;
}

/** Detect rating and review changes on a competitor's Google profile. */
export function detectReviewChanges(
  prev: LokalReviewData,
  curr: LokalReviewData,
): LokalChange[] {
  const changes: LokalChange[] = [];

  if (
    prev.rating !== null &&
    curr.rating !== null &&
    Math.abs(curr.rating - prev.rating) >= 0.1
  ) {
    const up = curr.rating > prev.rating;
    changes.push({
      type: up ? "rating_up" : "rating_drop",
      severity: up ? "info" : "warning",
      title: up
        ? `Konkurrentens vurdering steg til ${curr.rating.toFixed(1)}★`
        : `Konkurrentens vurdering falt til ${curr.rating.toFixed(1)}★`,
      detail: `Google-vurdering endret seg fra ${prev.rating.toFixed(1)} til ${curr.rating.toFixed(1)} stjerner.`,
    });
  }

  const prevCount = prev.reviewCount ?? 0;
  const currCount = curr.reviewCount ?? 0;
  if (currCount > prevCount) {
    const delta = currCount - prevCount;
    changes.push({
      type: "new_reviews",
      severity: "info",
      title: `${delta} ny${delta === 1 ? " anmeldelse" : "e anmeldelser"} hos konkurrenten`,
      detail: `Antall Google-anmeldelser økte fra ${prevCount} til ${currCount}.`,
    });
  }

  return changes;
}
