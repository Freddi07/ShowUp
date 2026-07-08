import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db/schema";
import { auth } from "../lib/auth";
import { resolveEntitlements } from "../lib/entitlements";

const router = Router();

/** GET /trial/status — returns current trial/subscription state for the signed-in user. */
router.get("/status", async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const session = await auth.api.getSession({ headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return res.json({
        trialActive: false,
        trialEndsAt: null,
        paymentMethodCollected: false,
        subscriptionStatus: null,
        plan: null,
        maxCustomers: resolveEntitlements(null).maxCustomers,
      });
    }

    const now = new Date();
    const trialActive = profile.trialEndsAt > now;
    const { maxCustomers } = resolveEntitlements(profile, now);

    return res.json({
      trialActive,
      trialEndsAt: profile.trialEndsAt.toISOString(),
      paymentMethodCollected: profile.paymentMethodCollected,
      subscriptionStatus: profile.subscriptionStatus ?? null,
      plan: profile.plan ?? null,
      maxCustomers,
    });
  } catch (err) {
    console.error("[trial] status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
