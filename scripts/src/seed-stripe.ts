import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Seeds the ShowUp subscription product, price, and a Stripe Payment Link with
 * a 14-day free trial. Idempotent: safe to re-run.
 *
 * Config via env (with sensible defaults):
 *   SHOWUP_PLAN_NAME       default "ShowUp"
 *   SHOWUP_PRICE_AMOUNT    minor units, default 19900 (199.00 kr)
 *   SHOWUP_PRICE_CURRENCY  default "nok"
 *   SHOWUP_TRIAL_DAYS      default 14
 *   SHOWUP_SUCCESS_URL     redirect target after checkout completes
 *
 * Run: pnpm --filter @workspace/scripts exec tsx src/seed-stripe.ts
 */
async function main() {
  const stripe = await getUncachableStripeClient();

  const planName = process.env.SHOWUP_PLAN_NAME ?? "ShowUp";
  const amount = Number(process.env.SHOWUP_PRICE_AMOUNT ?? "19900");
  const currency = (process.env.SHOWUP_PRICE_CURRENCY ?? "nok").toLowerCase();
  const trialDays = Number(process.env.SHOWUP_TRIAL_DAYS ?? "14");

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

  // 1. Product (idempotent by name).
  const found = await stripe.products.search({
    query: `name:'${planName}' AND active:'true'`,
  });
  let product = found.data[0];
  if (product) {
    console.log(`Product exists: ${product.name} (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: planName,
      description: "Automatiske SMS-påminnelser for avtaler",
    });
    console.log(`Created product: ${product.name} (${product.id})`);
  }

  // 2. Price (reuse a matching recurring price if present).
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(
    (p) =>
      p.unit_amount === amount &&
      p.currency === currency &&
      p.recurring?.interval === "month",
  );
  if (price) {
    console.log(`Price exists: ${price.id} (${amount} ${currency}/mo)`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency,
      recurring: { interval: "month" },
    });
    console.log(`Created price: ${price.id} (${amount} ${currency}/mo)`);
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
  if (link) {
    console.log(`Payment link exists: ${link.url}`);
  } else {
    link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { trial_period_days: trialDays },
      after_completion: { type: "redirect", redirect: { url: successUrl } },
    });
    console.log(`Created payment link: ${link.url}`);
  }

  console.log("\n=== RESULT ===");
  console.log(`VITE_SIGNUP_CHECKOUT_URL=${link.url}`);
}

main().catch((err) => {
  console.error("seed-stripe failed:", err);
  process.exit(1);
});
