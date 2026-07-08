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

## Trial is app-owned — NO Stripe trial on the payment links
The 14-day free trial is owned by the app: `auth.ts` sets `UserProfile.trialEndsAt = createdAt + 14d`
at signup, and `/api/trial/status` compares to now. The Stripe Payment Links must NOT add
`subscription_data.trial_period_days` (that would stack a second trial on top → paying after 28 days).
Links are billed immediately; after checkout the subscription is `active` (not `trialing`).

**Why:** two independent trials (app + Stripe) is the bug the owner explicitly wanted gone.
**How to apply:** `seed-stripe.ts` creates trial-free links and is self-healing — on re-run it
deactivates any legacy link that still carries a trial and creates a replacement, printing new
`ENV VITE_CHECKOUT_URL_*` lines. Creating a new link changes its URL, so after re-seeding you MUST
update the `VITE_CHECKOUT_URL_STARTER/PRO/BUSINESS` + `VITE_SIGNUP_CHECKOUT_URL` shared env vars and
restart `artifacts/showup: web` (VITE vars are build-time).

## Plan tier storage (starter/pro/business)
`UserProfile.plan` (nullable text) holds the subscription tier. It is derived from the Stripe
product NAME at `/billing/verify` (regex: business/pro/starter → id, else null), since there is no
dedicated tier field on the Stripe side we read. `onConflictDoUpdate` only writes `plan` when the
derive is non-null, so an unknown product never wipes an existing tier. Frontend maps id→label
(Starter/Pro/Business) in dashboard badge + konto "Plan:" row; `trial/status` returns `plan`.
**Why:** the app previously discarded the plan name and only showed "Aktivt abonnement".
**How to apply:** to grant a plan manually (testing/comps), set `UserProfile.plan` +
`subscriptionStatus='active'` directly; no Stripe subscription required for the UI to show the tier.

## Checkout ownership binding (static Payment Link model)
The app uses a single static Stripe Payment Link (`VITE_SIGNUP_CHECKOUT_URL`, trial-free),
then verifies server-side via `POST /api/billing/verify { sessionId }`.

**Why:** Verifying only that a Checkout Session is "complete" lets any leaked/replayed session id from
another customer activate the caller's account (broken access control).
**How to apply:** Frontend appends `client_reference_id=<authenticated user id>` (Payment Links accept it
as a query param). `/verify` must reject unless `checkout.client_reference_id === session.user.id`,
`mode === 'subscription'`, `status === 'complete'`, and `subscription.status` in {trialing, active}.
