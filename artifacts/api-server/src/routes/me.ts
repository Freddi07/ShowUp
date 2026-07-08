import { Router } from "express";
import { requireUser } from "../middlewares/require-user";
import { deleteUserCompletely } from "../lib/delete-user";

const router = Router();

/** GET /me — the current signed-in user. */
router.get("/", requireUser, (req, res) => {
  const user = req.user!;
  return res.json({
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    role: user.role ?? null,
  });
});

/** DELETE /me — permanently delete the signed-in user's own account. */
router.delete("/", requireUser, async (req, res) => {
  try {
    await deleteUserCompletely(req.user!.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[me] delete error:", err);
    return res.status(500).json({ error: "Kunne ikke slette kontoen" });
  }
});

export default router;
