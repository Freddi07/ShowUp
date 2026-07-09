# Deploying LokalRadar to Vercel

This project is a pnpm monorepo containing a React (Vite) frontend and an
Express backend. It is wired to deploy to Vercel as a **single, same-origin
app**:

- The **frontend** builds to static files (`artifacts/lokalradar/dist/public`)
  and is served by Vercel's CDN.
- The **backend** (`artifacts/api-server`) runs as a Vercel **serverless
  function** (the catch-all `api/[...path].mjs`). All `/api/*` requests are
  routed to it with their full path preserved.

Because both live on the same Vercel domain, session cookies (login) work
without any cross-origin configuration.

## 1. Import the repo into Vercel

In the Vercel dashboard: **Add New… → Project → Import** the GitHub repo.

> **⚠️ Root Directory MUST be the repository root.**
> In **Project → Settings → Build & Deployment → Root Directory**, leave it
> **empty / `./`**. Do **not** set it to `artifacts/api-server`,
> `artifacts/lokalradar`, or any subfolder.
>
> The root is where `vercel.json`, the `api/` serverless function, the
> `vercel-build` script, and the frontend output all live. If the Root
> Directory points at a subfolder, the build fails with:
>
> ```
> ERR_PNPM_NO_SCRIPT  Missing script: vercel-build
> ```
>
> Fix it by clearing the Root Directory (set it back to the repo root) and
> redeploying.

Vercel auto-detects pnpm from the lockfile.

## 2. Required environment variables

Set these in **Project → Settings → Environment Variables** (Production +
Preview). Values you already use in Replit can be reused.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Use an externally reachable Postgres (the existing Replit/Neon connection string works if it allows outside connections). **Required.** |
| `BETTER_AUTH_URL` | The full deployed origin, e.g. `https://your-app.vercel.app`. Used as the auth base URL, OAuth callback base, and a trusted origin. **Required on Vercel** (there is no Replit domain to fall back to). |
| `APP_URL` | Same value as `BETTER_AUTH_URL` — used to build password-reset and welcome-email links. Set it to your Vercel domain. |
| `BETTER_AUTH_SECRET` | Auth session signing secret. |
| `SESSION_SECRET` | Session secret. |
| `ENCRYPTION_KEY` | Encryption key used by the backend. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in (if enabled). Add the Vercel domain to the Google OAuth redirect URIs. |
| `GOOGLE_PLACES_API_KEY` | Google review import. |
| `STRIPE_SECRET_KEY` | Stripe billing. |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks (point the Stripe webhook to `https://<your-vercel-domain>/api/stripe/webhook`). |
| `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` | AI features (post/SEO/image/chat generation). |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | AI advisor chat. |

Optional: `VITE_API_URL` / `VITE_APP_URL` — leave unset; the frontend defaults
to same-origin, which is what you want on Vercel.

## 3. Database schema

The app expects its tables to already exist. Apply the schema/migrations once
against the Postgres you point `DATABASE_URL` at (e.g. run
`pnpm --filter @workspace/db run push` from Replit against that database, or
run your migrations). The Vercel function does **not** run migrations at
startup.

## 4. Deploy

Push to the connected branch (or click **Deploy**). Vercel runs
`pnpm run vercel-build`, which builds the shared libraries and the frontend,
then bundles the `api/[...path].mjs` function.

## Known limitations on Vercel

- **Transactional email** (welcome / password-reset) is sent through the
  Replit Resend connector, which only works inside Replit. On Vercel those
  emails will not send until the email code is switched to a direct Resend API
  key (`RESEND_API_KEY`). Everything else (login, data, billing, AI) works with
  the env vars above.
- **Stripe background sync** does not run on Vercel (no long-lived process).
  Real-time updates still arrive via the webhook; a one-time/manual sync can be
  run from Replit if needed.
