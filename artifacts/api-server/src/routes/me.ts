import { Router } from "express";
import { requireUser } from "../middlewares/require-user";

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

export default router;
