import { Router } from "express";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db/schema";
import { auth } from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { toWebHeaders } from "../middlewares/require-user";

const router = Router();

/**
 * POST /billing/verify
 * Verifies a completed Stripe Checkout session and activates the user's
 * subscription/trial in their profile. Called by the frontend after Stripe
 * redirects back with ?session_id=...
 */
router.post("/verify", async (req, res) => {
  try {
    const session = await auth.api.getSession({ headers: toWebHeaders(req) });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const stripe = await getUncachableStripeClient();
    const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "line_items.data.price.product", "customer"],
    });

    const subscription =
      checkout.subscription && typeof checkout.subscription === "object"
        ? (checkout.subscription as Stripe.Subscription)
        : null;

    // SECURITY: bind this checkout to the authenticated user. The checkout URL
    // is created with client_reference_id = user id, so a session that belongs
    // to a different user (or a leaked/replayed session id) must be rejected.
    if (checkout.client_reference_id !== session.user.id) {
      return res.json({ verified: false });
    }

    // Only a completed subscription checkout counts. A generic "complete"
    // one-off payment or a session without a subscription must not activate.
    const validSubStatuses = new Set(["trialing", "active"]);
    const isVerified =
      checkout.mode === "subscription" &&
      checkout.status === "complete" &&
      subscription !== null &&
      validSubStatuses.has(subscription.status);

    if (!isVerified) {
      return res.json({ verified: false });
    }

    const customerId =
      typeof checkout.customer === "string"
        ? checkout.customer
        : (checkout.customer?.id ?? null);

    const subscriptionStatus = subscription?.status ?? "active";
    const trialEnd = subscription?.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

    // Resolve a human-readable plan name from the line item's product.
    const lineItem = checkout.line_items?.data?.[0];
    const product = lineItem?.price?.product;
    const planName =
      product && typeof product === "object" && "name" in product
        ? (product.name as string)
        : "BookPling";
    // Normalize the Stripe product name into a tier id we can store + display.
    const planTier = /business/i.test(planName)
      ? "business"
      : /pro/i.test(planName)
        ? "pro"
        : /starter/i.test(planName)
          ? "starter"
          : null;

    const now = new Date();
    const fallbackTrialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await db
      .insert(userProfileTable)
      .values({
        userId: session.user.id,
        trialStartDate: now,
        trialEndsAt: trialEnd ?? fallbackTrialEnd,
        stripeCustomerId: customerId,
        paymentMethodCollected: true,
        subscriptionStatus,
        plan: planTier,
      })
      .onConflictDoUpdate({
        target: userProfileTable.userId,
        set: {
          stripeCustomerId: customerId,
          paymentMethodCollected: true,
          subscriptionStatus,
          ...(planTier ? { plan: planTier } : {}),
          ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
          updatedAt: now,
        },
      });

    return res.json({ verified: true, plan: planName });
  } catch (err) {
    console.error("[billing] verify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
