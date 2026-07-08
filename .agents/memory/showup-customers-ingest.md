---
name: ShowUp customers & external ingest
description: How customers get into the dashboard — CRUD, CSV import, and the public per-user API-key ingest endpoint.
---

# ShowUp customers & external ingest

## Inbound SMS replies — shared Twilio number, no tenant context
Reminders send from ONE shared Twilio number, so the inbound webhook (`/api/sms/inbound`, public,
no session) has no way to know which tenant a "JA"/"NEI"/"FLYTT" reply belongs to. It matches by
phone (last 8 digits, to normalize +47/0047/national NO formats) against **REMINDED** appointments
only (a reply implies a reminder was sent), newest first, and updates atomically
(`WHERE id=? AND status='REMINDED'`).
**Why:** matching PENDING or all-users/all-statuses caused a cross-tenant integrity flaw — a reply
could flip another business's appointment when phone suffixes collide.
**Known limitation:** if the *same* customer number has open reminders from two tenants at once, the
reply resolves the most-recently-reminded one — inherent to a shared inbound number. Real fix would
be a per-appointment reply token in the outbound SMS. Not worth the UX cost yet.
**How to apply:** the Twilio number's SmsUrl must point at the current public URL — set it to the
deploy domain (or `TWILIO_WEBHOOK_URL`) on publish, else replies hit the dev URL. Signature
validation uses that same configured URL (NOT the proxied req URL, which is localhost behind Replit's
proxy); it is lenient in dev, enforced when `NODE_ENV=production`.

## Customer ingestion model
Customers reach the dashboard three ways, all funneling through one upsert helper
(`api-server/src/lib/customers.ts` `upsertCustomer`): manual add, CSV import (bulk), and a
**public API-key endpoint** for automation.

## CSV import can also register appointments — interpret times in Europe/Oslo on the SERVER
CSV import (`/customers/import`) creates an appointment when a row has a valid date/time AND a phone
(phone is required: `appointmentTable.clientPhone` is notNull). Dedup on `(customerId, scheduledAt)` so
re-import is idempotent; reminderAt = 24h before.
**Why the timezone matters:** the client CSV parser must emit a *naive wall-clock* string
(`YYYY-MM-DDTHH:MM`, no zone) — NOT convert with browser-local `new Date().toISOString()`. The server
resolves naive strings against **Europe/Oslo** (offset computed via `Intl.DateTimeFormat` formatToParts,
handles DST). Otherwise the stored instant shifts by the importer's timezone and dedup breaks on re-import.
Strings that already carry a zone (…Z / ±HH:MM) are treated as absolute and passed through.
**How to apply:** any new appointment ingest path (Zapier/API, other imports) must follow the same
naive-local-vs-absolute rule; never bake browser-local timezone into stored appointment times.
Also: reject impossible calendar dates (e.g. 31.02) via a round-trip Date check — JS `Date` silently rolls over.

- **Public ingest:** `POST /api/ingest/customers`, authed by a per-user key in header `x-api-key`
  (or Bearer), matched against `userProfile.apiKey` (unique, nullable, `shk_` prefix). No session.
  Intended for Zapier/Make/webhooks so platforms (Fresha, HubSpot, Pipedrive, Calendly, …) add
  customers automatically. Key mgmt is session-authed: `GET /api/ingest/api-key`, `POST /api/ingest/api-key/rotate`.
- **Dedup order:** `externalId → phone → email`, all scoped to the owner's `userId`; match ⇒ update, else insert.
  **Why:** repeated webhook calls for the same person must not create duplicates. Keep this order consistent
  across manual/import/ingest so behavior is uniform.
- **CSV import** is parsed client-side (`showup/src/lib/csv.ts`: auto-detects comma/semicolon/tab,
  maps EN+NO column names, positional fallback) then POSTed to `/api/customers/import`.

## Sending SMS from api-server (Twilio)
**Preferred path: plain Account SID + Auth Token as Replit secrets** — `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
(32-char token from Twilio Console home) / `TWILIO_PHONE_NUMBER`. `lib/twilio.ts` uses these first; Basic auth
`accountSid:authToken`, POST Twilio REST `/2010-04-01/Accounts/{sid}/Messages.json`. **Why:** the Replit Twilio
*connector* stored an invalid API-key secret (only 21 chars; real Twilio secrets are 32) and reconnecting kept
re-saving the same bad value → persistent 401 "Authenticate" (code 20003) via BOTH manual Basic-auth and the
official `connectors.proxy`. Auth Token is always valid and needs no API-key creation, so it sidesteps the whole issue.
Connector fetch remains as a fallback (settings keys: account_sid/api_key/api_key_secret/phone_number).
The legacy `artifacts/showup/src/lib/business/twilio.ts` (env-var + `server-only`) is dead Next.js code — do NOT use it.
**Why:** creds are NOT in env; env-var Twilio code silently has no credentials.
**How to apply:** any server-side timestamp formatted for Norwegian users MUST pass `timeZone: "Europe/Oslo"`
to toLocale* — the server runs in UTC, so reminder SMS times shift an hour/day otherwise.

## Replit managed connectors are single-account, not per-end-user OAuth
Managed connectors exist for Google Calendar, Microsoft Outlook, Calendly, HubSpot (searchIntegrations).
BUT a Replit connector authorizes ONE account at the Repl/account level — all app users would share that single
connection. ShowUp is multi-tenant SaaS (each professional needs THEIR OWN calendar), so the managed connector
does NOT fit "each customer connects their own Google Calendar."
**Why:** avoid building a single-account connector and calling it multi-user — it silently shares one calendar.
**How to apply:** for per-end-user OAuth (real SaaS), build a custom Google OAuth app (own CLIENT_ID/SECRET,
per-userId token storage, redirect /api/integrations/google-calendar/callback) — Google review required for the
sensitive calendar scope before external users. The universal automatic path without per-platform OAuth is the
per-user API key + Zapier/Make (already built; step-by-step guides live on the integrations page).

## Real per-platform OAuth integrations are NOT built
The integrations schema/UI lists many platforms (Fiken, Tripletex, Fresha, Booksy, Visma, …) but there is
**no working OAuth/sync** for them — those setup forms are placeholders. The universal path (CSV + API-key
ingest) is the supported way to get customers in. Don't claim a platform is "connected" just because a form exists.

## drizzle-kit push is interactive — don't rely on it in the agent shell
`pnpm --filter @workspace/db run push` prompts (needs a TTY) whenever it thinks a change is risky
(e.g. adding a UNIQUE constraint to a populated table) and then fails with "Interactive prompts require a TTY".
**How to apply:** for additive, safe schema changes (new nullable column, unique on all-NULL column), apply the
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `ADD CONSTRAINT` directly via SQL, then update the Drizzle schema
file so code matches. Reserve push for local/interactive use.

## @workspace/db is a COMPOSITE TS project — editing schema alone leaves consumers on stale types
After editing `lib/db/src/schema/*.ts` (e.g. adding a column), `@workspace/api-server` typecheck can keep
failing with `Property 'x' does not exist` because api-server reads `@workspace/db`'s **built `dist/*.d.ts`**
(project references), which is stale. The db package has NO `build`/`typecheck` script.
**How to apply:** rebuild its declarations with `npx tsc -b lib/db/tsconfig.json --force`, then re-run the
consumer typecheck. (The runtime `exports` point at `src/*.ts`, so the app runs fine — only tsc project-ref
consumers see the stale dist.)
