import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trialRouter from "./trial";
import billingRouter from "./billing";
import adminRouter from "./admin";
import customersRouter from "./customers";
import ingestRouter from "./ingest";

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

// Customers (session-authed CRUD + bulk import)
router.use("/customers", customersRouter);

// External ingest (public API-key endpoint + key management)
router.use("/ingest", ingestRouter);

export default router;
