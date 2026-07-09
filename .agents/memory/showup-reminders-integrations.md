---
name: ShowUp auto-reminder engine & integrations foundation
description: How automatic reminders and the booking-integration plumbing work, and the non-obvious build/test gotchas around them.
---

# Auto-reminder engine

- Reminders live in the `ScheduledReminder` table: one row per enabled offset (48h/24h/2h from `NotificationSettings`) enqueued at appointment creation (manual POST and integration ingest both call `enqueueRemindersForAppointment`). Only future offsets are enqueued.
- Idempotency: `unique(appointmentId, offsetLabel)` + an atomic claim (`UPDATE ... FOR UPDATE SKIP LOCKED` flipping PENDING→SENDING). Safe across overlapping ticks and multiple instances.
- **Reply-matching constraint:** inbound SMS matching keys on appointment `status = REMINDED`. The scheduler sets REMINDED only `WHERE status='PENDING'` (never clobbers a resolved status), so multi-offset reminders all still send and replies keep matching.
- Scheduler skips appointments in RESOLVED_STATUSES (CANCELLED/CONFIRMED/RESCHEDULE_REQUESTED). Manual remind marks that appointment's still-PENDING scheduled rows SKIPPED. Together these prevent manual-vs-auto double sends except a negligible sub-second SENDING window.
- **Why in-process poller (not BullMQ/Redis/Trigger):** deliberately no queue infra. Consequence: production needs a continuously-running process — deploy api-server as a Reserved VM, NOT autoscale (autoscale sleeps and the loop stops).

# Integrations foundation

- Contract: `BookingSyncProvider` (connect/disconnect/fetchNewBookings/verifyWebhook). Providers self-register in a registry keyed by provider id; core (routes/normalize/scheduler) never imports providers. Foundation ships an EMPTY registry — connect/sync return 501 until a provider lands. Generic disconnect is provider-agnostic.
- Booking dedup: `ingestBooking` claims `SyncedAppointment (integrationId, externalId)` FIRST via insert+onConflictDoNothing+returning, and only creates the customer/appointment if the claim won (else deduped). On failure it deletes the claim so retries succeed. **Do not** revert to read-then-write — that races and creates duplicate appointments under retried webhook delivery.
- Credentials are stored only as one AES-256-GCM blob in `Integration.credentialsEncrypted` (helper in `lib/integrations/crypto.ts`, needs `ENCRYPTION_KEY` secret). `externalAccountId`/`lastError` are non-secret columns for the dashboard.

# Build/test gotchas (non-obvious, cost real time)

- **`@workspace/db` is consumed two ways:** runtime (tsx/esbuild) resolves the `exports` map to `src/*.ts` (so the app runs immediately after a schema edit), BUT tsc uses TS **project references** → the built `lib/db/dist/*.d.ts`. After any schema change you MUST run `tsc --build lib/db/tsconfig.json` or api-server typecheck fails with misleading "has no exported member" / "property does not exist" errors.
- **No `tsx` in the repo.** To run an ad-hoc TS script against the api-server: bundle with esbuild (mirror `build.mjs`, externalize `*.node pg-native stripe-replit-sync`) then `node`. Run it with `NODE_ENV=production` — otherwise `logger.ts` loads the `pino-pretty` transport which throws "unable to determine transport target" in a plain esbuild bundle (the real build uses esbuild-plugin-pino).
