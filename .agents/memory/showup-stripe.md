---
name: ShowUp Stripe billing
description: Non-obvious constraints for the Stripe integration (connector shape, esbuild bundling, checkout ownership).
---

# ShowUp Stripe integration

## Connector settings key names
The Replit Stripe connection API (`/api/v2/connection?include_secrets=true&connector_names=stripe`)
returns `settings.secret` for the secret key (plus `publishable`, `account_id`, `mcp`),
**not** `settings.secret_key`, and there is **no** `settings.webhook_secret`.

**Why:** The generic stripe skill template reads `secret_key`/`webhook_secret`; those are undefined here,
so credential fetch silently fails ("missing secret key").
**How to apply:** Read `settings.secret ?? settings.secret_key`. Since there's no webhook secret,
use `stripe-replit-sync`'s managed webhook (`findOrCreateManagedWebhook`) which manages its own secret;
pass `stripeWebhookSecret` only if present.

## esbuild bundling breaks stripe-replit-sync migrations
`stripe-replit-sync` reads its `.sql` migration files from disk at runtime. The api-server is bundled
by esbuild (`build.mjs`), which inlines JS but drops the `.sql` files, so `runMigrations()` resolves
successfully while creating **zero** tables (later calls fail with `relation "stripe.accounts" does not exist`).

**Why:** Bundled code loses the package's on-disk migration files.
**How to apply:** Keep `stripe-replit-sync` in the `external:` array in `artifacts/api-server/build.mjs`
so it loads from `node_modules` at runtime. Same class of problem as sharp / @google-cloud (path-traversal file reads).

## Checkout ownership binding (static Payment Link model)
The app uses a single static Stripe Payment Link (`VITE_SIGNUP_CHECKOUT_URL`) with a 14-day trial,
then verifies server-side via `POST /api/billing/verify { sessionId }`.

**Why:** Verifying only that a Checkout Session is "complete" lets any leaked/replayed session id from
another customer activate the caller's account (broken access control).
**How to apply:** Frontend appends `client_reference_id=<authenticated user id>` (Payment Links accept it
as a query param). `/verify` must reject unless `checkout.client_reference_id === session.user.id`,
`mode === 'subscription'`, `status === 'complete'`, and `subscription.status` in {trialing, active}.
