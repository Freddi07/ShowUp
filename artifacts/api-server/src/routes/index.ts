import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trialRouter from "./trial";
import billingRouter from "./billing";
import adminRouter from "./admin";
import customersRouter from "./customers";
import appointmentsRouter from "./appointments";
import svarRouter from "./svar";
import malerRouter from "./maler";
import smsRouter from "./sms";
import ingestRouter from "./ingest";
import meRouter from "./me";
import statsRouter from "./stats";
import notificationSettingsRouter from "./notification-settings";
import pushRouter from "./push";
import mobileOauthRouter from "./mobile-oauth";
import onboardingRouter from "./onboarding";
import integrationsRouter from "./integrations";
import integrationsOauthRouter from "./integrations-oauth";
import assistantRouter from "./assistant";

const router: IRouter = Router();

// Health check
router.use(healthRouter);

// Authentication (better-auth handles all /api/auth/* paths)
router.use("/auth", authRouter);

// Native social sign-in bridge for the Expo app (in-app browser OAuth).
router.use("/mobile-oauth", mobileOauthRouter);

// First-run onboarding wizard state.
router.use("/onboarding", onboardingRouter);

// Trial & billing
router.use("/trial", trialRouter);
router.use("/billing", billingRouter);

// Admin dashboard (restricted to the admin email allowlist)
router.use("/admin", adminRouter);

// Customers (session-authed CRUD + bulk import)
router.use("/customers", customersRouter);

// Appointments (session-authed edit + manual SMS reminder + mobile list)
router.use("/appointments", appointmentsRouter);

// Replies to reminders (session-authed list + status/follow-up actions)
router.use("/svar", svarRouter);

// Message templates (session-authed read + upsert of SMS templates)
router.use("/maler", malerRouter);

// Inbound SMS webhook from Twilio (public; verified by Twilio request signature)
router.use("/sms", smsRouter);

// External ingest (public API-key endpoint + key management)
router.use("/ingest", ingestRouter);

// Public OAuth callback for calendar connectors (identity via signed state,
// so it must be mounted BEFORE the session-authed integrations router).
router.use("/integrations", integrationsOauthRouter);

// Booking-source integrations (session-authed catalogue, status, sync, log)
router.use("/integrations", integrationsRouter);

// In-dashboard AI setup assistant (session-authed chat + tool use)
router.use("/assistant", assistantRouter);

// App data shared by web + mobile (mobile-facing read endpoints)
router.use("/me", meRouter);
router.use("/stats", statsRouter);
router.use("/notification-settings", notificationSettingsRouter);

// Device push-token registration (session-authed; used by the mobile app)
router.use("/push", pushRouter);

export default router;
