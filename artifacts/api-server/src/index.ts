import app from "./app";
import { logger } from "./lib/logger";
import { initStripe } from "./lib/stripe-init";
import { startReminderScheduler } from "./lib/reminder-scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Kick off Stripe schema migration, webhook setup, and data sync in the
// background. Non-fatal — the server starts serving immediately.
void initStripe();

// Start the automatic reminder engine (polls for due reminders every minute).
startReminderScheduler();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
