---
name: ShowUp customers & external ingest
description: How customers get into the dashboard — CRUD, CSV import, and the public per-user API-key ingest endpoint.
---

# ShowUp customers & external ingest

## Customer ingestion model
Customers reach the dashboard three ways, all funneling through one upsert helper
(`api-server/src/lib/customers.ts` `upsertCustomer`): manual add, CSV import (bulk), and a
**public API-key endpoint** for automation.

- **Public ingest:** `POST /api/ingest/customers`, authed by a per-user key in header `x-api-key`
  (or Bearer), matched against `userProfile.apiKey` (unique, nullable, `shk_` prefix). No session.
  Intended for Zapier/Make/webhooks so platforms (Fresha, HubSpot, Pipedrive, Calendly, …) add
  customers automatically. Key mgmt is session-authed: `GET /api/ingest/api-key`, `POST /api/ingest/api-key/rotate`.
- **Dedup order:** `externalId → phone → email`, all scoped to the owner's `userId`; match ⇒ update, else insert.
  **Why:** repeated webhook calls for the same person must not create duplicates. Keep this order consistent
  across manual/import/ingest so behavior is uniform.
- **CSV import** is parsed client-side (`showup/src/lib/csv.ts`: auto-detects comma/semicolon/tab,
  maps EN+NO column names, positional fallback) then POSTed to `/api/customers/import`.

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
