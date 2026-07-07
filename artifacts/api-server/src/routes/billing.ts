import { Router } from "express";
import { auth } from "../lib/auth";

const router = Router();

/**
 * POST /billing/verify
 * Verifies a Stripe checkout session and activates the subscription.
 * TODO: Connect to Polsia billing proxy or Stripe API.
 */
router.post("/verify", async (req, res) => {
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
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    // TODO: Verify the Stripe checkout session and update userProfile.
    // For now, return a stub response so the frontend doesn't crash.
    return res.json({ verified: false, plan: null });
  } catch (err) {
    console.error("[billing] verify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
