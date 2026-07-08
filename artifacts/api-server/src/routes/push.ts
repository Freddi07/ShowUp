import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { pushTokenTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();
router.use(requireUser);

/**
 * POST /push/register — store (or re-point) an Expo push token for this user.
 * A token is unique to a device; if it already exists we move it to the current
 * user and refresh the timestamp, which handles the "signed out, signed in as
 * someone else on the same phone" case.
 */
router.post("/register", async (req, res) => {
  try {
    const userId = req.user!.id;
    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const platform =
      typeof req.body?.platform === "string" ? req.body.platform : null;
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    const [existing] = await db
      .select()
      .from(pushTokenTable)
      .where(eq(pushTokenTable.token, token))
      .limit(1);

    if (existing) {
      await db
        .update(pushTokenTable)
        .set({ userId, platform, updatedAt: new Date() })
        .where(eq(pushTokenTable.token, token));
    } else {
      await db.insert(pushTokenTable).values({ userId, token, platform });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[push] register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /push/unregister — drop a token (called on sign-out). */
router.post("/unregister", async (req, res) => {
  try {
    const userId = req.user!.id;
    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    await db
      .delete(pushTokenTable)
      .where(
        and(
          eq(pushTokenTable.token, token),
          eq(pushTokenTable.userId, userId),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    console.error("[push] unregister error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
