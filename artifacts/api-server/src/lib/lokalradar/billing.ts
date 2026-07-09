import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

/**
 * LokalRadar billing helpers. Stripe is the source of truth: the product
 * catalog (Pro / Bedrift) and the user's active subscription are read from the
 * `stripe` schema kept fresh by stripe-replit-sync's managed webhook + backfill.
 * Products are tagged with metadata { app: "lokalradar", tier } by the
 * seed-lokalradar-stripe script.
 */

export type LokalTier = "gratis" | "pro" | "bedrift";

/** Subscription statuses that grant plan entitlement. */
const ENTITLED_STATUSES = ["active", "trialing", "past_due"] as const;

function coerceTier(value: unknown): LokalTier {
  return value === "pro" || value === "bedrift" ? value : "gratis";
}

/** A number stored as jsonb/int/epoch → epoch seconds, or null. */
function coerceEpoch(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export interface StripeSubInfo {
  tier: LokalTier;
  status: string;
  currentPeriodEnd: number | null; // epoch seconds
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null; // epoch seconds
}

/**
 * Resolve the caller's active LokalRadar subscription from the synced stripe
 * schema. Returns null when the customer has no entitled LokalRadar subscription
 * (i.e. they are on the free "gratis" plan).
 */
export async function resolveStripeSubscription(
  customerId: string | null | undefined,
): Promise<StripeSubInfo | null> {
  if (!customerId) return null;
  const result = await db.execute(sql`
    SELECT
      s.status,
      s.current_period_end,
      s.cancel_at_period_end,
      s.trial_end,
      p.metadata->>'tier' AS tier
    FROM stripe.subscriptions s
    JOIN stripe.subscription_items si ON si.subscription = s.id
    JOIN stripe.prices pr ON pr.id = si.price
    JOIN stripe.products p ON p.id = pr.product
    WHERE s.customer = ${customerId}
      AND p.metadata->>'app' = 'lokalradar'
      AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created DESC
    LIMIT 1
  `);
  const row = result.rows[0] as
    | {
        status: string;
        current_period_end: number | null;
        cancel_at_period_end: boolean | null;
        trial_end: unknown;
        tier: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    tier: coerceTier(row.tier),
    status: row.status,
    currentPeriodEnd: coerceEpoch(row.current_period_end),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    trialEnd: coerceEpoch(row.trial_end),
  };
}

export interface CatalogPrice {
  tier: LokalTier;
  name: string;
  priceId: string;
  amount: number; // minor units (øre)
  currency: string;
}

/**
 * The LokalRadar plan catalog (paid tiers) as synced from Stripe. Used to
 * display real prices and to resolve the price id for a Checkout Session.
 */
export async function getPlanCatalog(): Promise<CatalogPrice[]> {
  const result = await db.execute(sql`
    SELECT
      p.metadata->>'tier' AS tier,
      p.name,
      pr.id AS price_id,
      pr.unit_amount,
      pr.currency
    FROM stripe.products p
    JOIN stripe.prices pr ON pr.product = p.id
    WHERE p.metadata->>'app' = 'lokalradar'
      AND p.active = true
      AND pr.active = true
      AND pr.recurring IS NOT NULL
    ORDER BY pr.unit_amount ASC
  `);
  return result.rows
    .map((r) => {
      const row = r as {
        tier: string | null;
        name: string;
        price_id: string;
        unit_amount: number | null;
        currency: string;
      };
      return {
        tier: coerceTier(row.tier),
        name: row.name,
        priceId: row.price_id,
        amount: row.unit_amount ?? 0,
        currency: row.currency,
      };
    })
    .filter((p) => p.tier !== "gratis");
}

/** Resolve the active Stripe price id for a paid tier, or null if not found. */
export async function resolvePriceIdForTier(
  tier: LokalTier,
): Promise<string | null> {
  const catalog = await getPlanCatalog();
  return catalog.find((p) => p.tier === tier)?.priceId ?? null;
}

