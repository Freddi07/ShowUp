import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Seeds the LokalRadar subscription plans (Pro / Bedrift) in Stripe: one product
 * + monthly price each, tagged with metadata { app: "lokalradar", tier } so the
 * backend can resolve them at runtime (no hardcoded price ids / env vars).
 *
 * Unlike the BookPling seed, LokalRadar uses dynamic Checkout Sessions + the
 * Stripe billing portal (not Payment Links), so this script only creates the
 * catalog. The 14-day free trial on Pro is applied at checkout time
 * (subscription_data.trial_period_days), not baked into the price here.
 *
 * Idempotent + self-healing: safe to re-run. Products are matched by the
 * metadata tag; a monthly price with the right amount/currency is reused.
 *
 * Run: pnpm --filter @workspace/scripts run seed-lokalradar-stripe
 */

const APP = "lokalradar";
const CURRENCY = (process.env.LOKALRADAR_PRICE_CURRENCY ?? "nok").toLowerCase();

interface PlanSeed {
  tier: string;
  name: string;
  amount: number; // minor units (øre)
  description: string;
}

const PLANS: PlanSeed[] = [
  {
    tier: "pro",
    name: "LokalRadar Pro",
    amount: 19900,
    description:
      "For voksende lokalbedrifter — opptil 10 konkurrenter og 100 AI-genereringer i måneden.",
  },
  {
    tier: "bedrift",
    name: "LokalRadar Bedrift",
    amount: 39900,
    description:
      "For større virksomheter — ubegrenset antall konkurrenter og AI-genereringer.",
  },
];

async function ensurePlan(stripe: Stripe, plan: PlanSeed) {
  // 1. Product, matched by our app+tier metadata tag (search falls back to name).
  const search = await stripe.products.search({
    query: `metadata['app']:'${APP}' AND metadata['tier']:'${plan.tier}' AND active:'true'`,
  });
  let product = search.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { app: APP, tier: plan.tier },
    });
    console.log(`Created product: ${plan.name} (${product.id})`);
  } else {
    // Keep name/description/metadata in sync on re-run.
    product = await stripe.products.update(product.id, {
      name: plan.name,
      description: plan.description,
      metadata: { app: APP, tier: plan.tier },
    });
  }

  // 2. Monthly price (reuse a matching active one if present).
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  let price = prices.data.find(
    (p) =>
      p.unit_amount === plan.amount &&
      p.currency === CURRENCY &&
      p.recurring?.interval === "month",
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: CURRENCY,
      recurring: { interval: "month" },
      metadata: { app: APP, tier: plan.tier },
    });
    console.log(`Created price: ${price.id} (${plan.amount} ${CURRENCY}/mo)`);
  }

  return { tier: plan.tier, productId: product.id, priceId: price.id };
}

async function main() {
  const stripe = await getUncachableStripeClient();
  const results = [];
  for (const plan of PLANS) {
    results.push(await ensurePlan(stripe, plan));
  }
  console.log("\n=== RESULT ===");
  for (const r of results) {
    console.log(`${r.tier}: product=${r.productId} price=${r.priceId}`);
  }
  console.log(
    "\nDone. Restart the API server so syncBackfill() pulls these into the stripe schema.",
  );
}

main().catch((err) => {
  console.error("seed-lokalradar-stripe failed:", err);
  process.exit(1);
});
