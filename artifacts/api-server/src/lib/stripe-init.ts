import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { logger } from "./logger";

/**
 * Initialize the Stripe schema, managed webhook, and data sync on startup.
 * Non-fatal: logs and returns on failure so the rest of the API keeps serving
 * (auth, appointments, etc.) even if Stripe is momentarily unavailable.
 */
export async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("[stripe] DATABASE_URL missing; skipping Stripe init");
    return;
  }

  try {
    await runMigrations({ databaseUrl });
    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      try {
        await stripeSync.findOrCreateManagedWebhook(webhookUrl);
        logger.info({ url: webhookUrl }, "[stripe] managed webhook ready");
      } catch (err) {
        logger.error({ err }, "[stripe] managed webhook setup failed");
      }
    } else {
      logger.warn("[stripe] REPLIT_DOMAINS missing; skipping managed webhook");
    }

    // Backfill in the background so startup is not blocked.
    stripeSync
      .syncBackfill()
      .then(() => logger.info("[stripe] data backfill complete"))
      .catch((err) => logger.error({ err }, "[stripe] data backfill failed"));
  } catch (err) {
    logger.error({ err }, "[stripe] initialization failed");
  }
}
