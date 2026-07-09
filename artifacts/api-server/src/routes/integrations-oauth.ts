/**
 * Public OAuth callback routes for calendar connectors.
 *
 * These are hit by the provider's browser redirect after the user authorises,
 * so they must NOT sit behind session auth. Instead the flow's identity is
 * carried in a signed, expiring `state` param (see oauth-state.ts). On success
 * we store the encrypted tokens, run an initial sync, and redirect the browser
 * back to the dashboard. Mounted BEFORE the session-authed integrations router.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { integrationTable } from "@workspace/db/schema";
import { verifyState } from "../lib/integrations/oauth-state";
import { exchangeGoogleCode } from "../lib/integrations/providers/google-calendar";
import { encryptJSON, isEncryptionConfigured } from "../lib/integrations/crypto";
import { syncIntegrationRow } from "../lib/integrations/sync";
import { logger } from "../lib/logger";

const router = Router();

const APP_URL =
  process.env.APP_URL ??
  process.env.BETTER_AUTH_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "");

function dashboardUrl(query: string): string {
  return `${APP_URL}/dashboard/integrations${query}`;
}

router.get("/google_calendar/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const stateToken = typeof req.query.state === "string" ? req.query.state : null;
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  if (oauthError) {
    res.redirect(dashboardUrl(`?error=${encodeURIComponent(oauthError)}`));
    return;
  }
  if (!code || !stateToken) {
    res.redirect(dashboardUrl("?error=missing_params"));
    return;
  }
  const state = verifyState(stateToken);
  if (!state || state.provider !== "google_calendar") {
    res.redirect(dashboardUrl("?error=invalid_state"));
    return;
  }
  if (!isEncryptionConfigured()) {
    res.redirect(dashboardUrl("?error=encryption_not_configured"));
    return;
  }

  try {
    const creds = await exchangeGoogleCode({
      code,
      redirectUri: state.redirectUri,
    });
    const encrypted = encryptJSON(creds);
    const [row] = await db
      .insert(integrationTable)
      .values({
        userId: state.userId,
        provider: "google_calendar",
        status: "connected",
        credentialsEncrypted: encrypted,
        lastError: null,
      })
      .onConflictDoUpdate({
        target: [integrationTable.userId, integrationTable.provider],
        set: {
          status: "connected",
          credentialsEncrypted: encrypted,
          lastError: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Best-effort first sync so bookings show up immediately.
    try {
      await syncIntegrationRow(row);
    } catch (err) {
      logger.error({ err }, "[google-calendar] initial sync failed");
    }

    res.redirect(dashboardUrl("?connected=google_calendar"));
  } catch (err) {
    logger.error({ err }, "[google-calendar] oauth callback failed");
    res.redirect(dashboardUrl("?error=google_calendar_failed"));
  }
});

export default router;
