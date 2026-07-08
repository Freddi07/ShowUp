import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Seeds the ShowUp subscription plans (Starter / Pro / Business) in Stripe:
 * one product + monthly price + Payment Link (with a 14-day free trial) each.
 * Idempotent: safe to re-run — existing products/prices/links are reused.
 *
 * Prints an `ENV <KEY>=<url>` line per plan so the caller can wire the
 * VITE_* checkout URLs into the frontend.
 *
 * Run: pnpm --filter @workspace/scripts run seed-stripe
 */

interface PlanSeed {
  envKey: string;
  name: string;
  amount: number; // minor units (øre)
  description: string;
}

const CURRENCY = (process.env.SHOWUP_PRICE_CURRENCY ?? "nok").toLowerCase();
const TRIAL_DAYS = Number(process.env.SHOWUP_TRIAL_DAYS ?? "14");

const PLANS: PlanSeed[] = [
  {
    envKey: "VITE_CHECKOUT_URL_STARTER",
    name: "ShowUp Starter",
    amount: 19900,
    description: "For enkeltpersoner og små bedrifter — opptil 100 kunder.",
  },
  {
    envKey: "VITE_CHECKOUT_URL_PRO",
    name: "ShowUp Pro",
    amount: 49900,
    description: "For voksende bedrifter — opptil 500 kunder, alle kanaler.",
  },
  {
    envKey: "VITE_CHECKOUT_URL_BUSINESS",
    name: "ShowUp Business",
    amount: 99900,
    description: "For store virksomheter — ubegrenset antall kunder.",
  },
];

async function ensurePlan(stripe: Stripe, plan: PlanSeed, successUrl: string) {
  // 1. Product (idempotent by exact name).
  const found = await stripe.products.search({
    query: `name:'${plan.name}' AND active:'true'`,
  });
  let product = found.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
    });
    console.log(`Created product: ${plan.name} (${product.id})`);
  }

  // 2. Monthly price (reuse a matching one if present).
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
    });
    console.log(`Created price: ${price.id} (${plan.amount} ${CURRENCY}/mo)`);
  }

  // 3. Payment Link with trial (reuse an active link for this price if present).
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  let link: Stripe.PaymentLink | undefined;
  for (const l of links.data) {
    const items = await stripe.paymentLinks.listLineItems(l.id, { limit: 10 });
    if (items.data.some((it) => it.price?.id === price.id)) {
      link = l;
      break;
    }
  }
  if (!link) {
    link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_DAYS },
      after_completion: { type: "redirect", redirect: { url: successUrl } },
    });
    console.log(`Created payment link for ${plan.name}: ${link.url}`);
  }

  return link.url;
}

async function main() {
  const stripe = await getUncachableStripeClient();

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const successUrl =
    process.env.SHOWUP_SUCCESS_URL ??
    (domain
      ? `https://${domain}/showup/signup/payment?session_id={CHECKOUT_SESSION_ID}`
      : undefined);
  if (!successUrl) {
    throw new Error(
      "No success URL. Set SHOWUP_SUCCESS_URL or ensure REPLIT_DOMAINS is available.",
    );
  }

  const results: Array<{ envKey: string; url: string }> = [];
  for (const plan of PLANS) {
    const url = await ensurePlan(stripe, plan, successUrl);
    results.push({ envKey: plan.envKey, url });
  }

  console.log("\n=== RESULT ===");
  for (const r of results) {
    console.log(`ENV ${r.envKey}=${r.url}`);
  }
  // Starter doubles as the signup checkout link.
  const starter = results.find((r) => r.envKey === "VITE_CHECKOUT_URL_STARTER");
  if (starter) console.log(`ENV VITE_SIGNUP_CHECKOUT_URL=${starter.url}`);
}

main().catch((err) => {
  console.error("seed-stripe failed:", err);
  process.exit(1);
});
