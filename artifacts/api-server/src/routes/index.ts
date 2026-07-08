import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trialRouter from "./trial";
import billingRouter from "./billing";
import adminRouter from "./admin";

const router: IRouter = Router();

// Health check
router.use(healthRouter);

// Authentication (better-auth handles all /api/auth/* paths)
router.use("/auth", authRouter);

// Trial & billing
router.use("/trial", trialRouter);
router.use("/billing", billingRouter);

// Admin dashboard (restricted to the admin email allowlist)
router.use("/admin", adminRouter);

export default router;
