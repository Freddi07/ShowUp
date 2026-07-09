import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import lokalradarRouter from "./lokalradar";

const router: IRouter = Router();

// Health check
router.use(healthRouter);

// Authentication (better-auth handles all /api/auth/* paths)
router.use("/auth", authRouter);

// LokalRadar: competitor monitoring & marketing assistant (session-authed)
router.use("/lokalradar", lokalradarRouter);

export default router;
