---
name: Vercel deployment of the pnpm monorepo
description: How the Replit app (Vite frontend + Express api-server) is made deployable to Vercel; the traps that broke it.
---

# Deploying this monorepo to Vercel

The user deploys the LokalRadar app (Vite React frontend + Express `api-server`) to
Vercel as **static frontend + Express-as-a-single-serverless-function, same origin**
(so auth cookies work with no cross-origin config). Replit remains the primary
runtime and is unchanged by any of this.

## Architecture
- `vercel.json`: `buildCommand = pnpm run vercel-build`,
  `outputDirectory = artifacts/lokalradar/dist/public`, rewrite
  `/((?!api/).*) -> /index.html` (SPA fallback that never swallows `/api`).
- `api/[...path].mjs` (catch-all) re-exports the prebuilt Express bundle:
  `export { default } from "../artifacts/api-server/dist/serverless.mjs"`.
- `artifacts/api-server/src/serverless.ts` exports `app` only — no
  `app.listen()`, no `initStripe()` (Stripe still updates via the webhook route).

## Traps that actually bit (don't regress these)
- **Catch-all filename, not a rewrite.** Routing `/api/*` with a rewrite to a
  fixed `/api` destination strips the path and 404s every concrete Express route.
  Use `api/[...path].mjs` so Vercel preserves the full request URL to Express.
  **Why:** Express matches concrete mounts (`/api/stripe/webhook`,
  `/api/lokalradar/*`); the full path must arrive unchanged.
- **The serverless bundle must be fully self-contained.** `lib/*` workspace
  packages export **TypeScript source** (`exports: ./src/index.ts`, no dist JS),
  so never rely on Vercel/@vercel/node to compile workspace TS. The api-server's
  own esbuild inlines everything; the Vercel function just re-exports that bundle.
- **`stripe-replit-sync` is externalized for Replit but INLINED for serverless.**
  Its only on-disk `.sql` reads live inside `runMigrations()` (connectAndMigrate),
  which the serverless entry never calls — so bundling it is safe and removes the
  last runtime `node_modules` dependency. `build.mjs` runs two esbuild passes:
  `index.ts` keeps it external, `serverless.ts` drops it from externals.
  **Why:** on a serverless host there is no reliable `node_modules` next to the
  function; a self-contained bundle sidesteps pnpm-symlink + nft tracing entirely.
- **Auth base URL has no Replit fallback on Vercel.** `auth.ts` derives baseURL /
  trustedOrigins / email links from `BETTER_AUTH_URL` (and `APP_URL`), falling
  back to `REPLIT_DEV_DOMAIN` then localhost. On Vercel both env vars MUST be set
  to the deployed origin or auth callbacks and reset/welcome links break.

## Known limitations on Vercel (documented in VERCEL_DEPLOY.md)
- Transactional email uses the Replit Resend connector → won't send on Vercel
  without a direct `RESEND_API_KEY` rework.
- Stripe background sync/backfill (`initStripe`) doesn't run; webhooks still do.
- `DATABASE_URL` must point to an externally reachable Postgres; migrations
  applied separately (e.g. `pnpm --filter @workspace/db run push` from Replit).

## How it was verified locally (no Vercel account needed)
Import `dist/serverless.mjs`, wrap the default export in `http.createServer`, and
hit routes: `/api/healthz` → 200, an authed route → 401, `/api/stripe/webhook`
POST → 400 (missing signature), unknown `/api/*` → 404. Also run a cold-start
`env -u PORT -u BASE_PATH -u REPLIT_DEV_DOMAIN NODE_ENV=production pnpm run vercel-build`.
