import type { userProfileTable } from "@workspace/db/schema";

export type PlanId = "starter" | "pro" | "business";

/**
 * Max customers allowed per plan (null = unlimited). Mirrors the pricing page
 * in the frontend (upgrade-plans-island.tsx). This is the authoritative source
 * for enforcement — the frontend copy is display-only.
 */
export const PLAN_MAX_CUSTOMERS: Record<PlanId, number | null> = {
  starter: 100,
  pro: 500,
  business: null,
};

type ProfileRow = typeof userProfileTable.$inferSelect;

export interface Entitlements {
  plan: PlanId;
  /** Max customers; null = unlimited. */
  maxCustomers: number | null;
}

function normalizePlan(v: string | null | undefined): PlanId | null {
  return v === "starter" || v === "pro" || v === "business" ? v : null;
}

/**
 * Resolve a user's effective plan + entitlements from their profile.
 * - Active subscription → the stored plan (defaults to starter if unset).
 * - Active trial → full access (business) so they can evaluate everything.
 * - Otherwise (expired / no plan) → starter floor.
 */
export function resolveEntitlements(
  profile:
    | Pick<ProfileRow, "plan" | "subscriptionStatus" | "trialEndsAt">
    | null
    | undefined,
  now: Date = new Date(),
): Entitlements {
  let plan: PlanId = "starter";
  if (profile) {
    if (profile.subscriptionStatus === "active") {
      plan = normalizePlan(profile.plan) ?? "starter";
    } else if (profile.trialEndsAt > now) {
      plan = "business";
    }
  }
  return { plan, maxCustomers: PLAN_MAX_CUSTOMERS[plan] };
}
