---
name: LokalRadar Stripe billing
description: How LokalRadar's Pro/Bedrift subscriptions are wired on top of the shared project Stripe infra
---

# LokalRadar Stripe billing

LokalRadar (Norwegian product) has real Stripe billing for **Pro (199 NOK/mo, 14-day trial)** and **Bedrift (399 NOK/mo, billed immediately)**; Gratis stays free. Reuses the shared project Stripe infra (StripeSync, managed webhook, `getUncachableStripeClient`, `stripe` schema) — the same infra ShowUp/BookPling use. Separate from ShowUp billing (which uses `userProfileTable` tiers starter/pro/business + Payment Links).

## Catalog resolution — metadata tag, not env vars
- Products are tagged with Stripe **metadata `{ app: "lokalradar", tier }`** (seed script). The backend resolves price ids / catalog at runtime from the synced `stripe` schema by filtering `metadata->>'app'='lokalradar'`. Deliberately different from ShowUp's `VITE_CHECKOUT_URL_*` env approach — no hardcoded price ids.
- Plan state lives in `LokalBusiness.plan` (text), reconciled from the live Stripe subscription on every business fetch (`getOrCreateBusiness`). Reconcile is **fail-soft**: on any Stripe/schema error it keeps the stored plan so plan-gated features never break during a Stripe outage.

## The sync gap that bit us
- **`syncBackfill()` does NOT sync the product catalog** (only dynamic objects like subscriptions). If the managed webhook is orphaned/recreated at the moment a seed runs, the `product.created`/`price.created` events are lost and the catalog never lands in the `stripe` schema. Fix: explicitly call `syncProducts()` + `syncPrices()` on startup (both exist on StripeSync).

## Live Stripe vs synced schema — CRITICAL for writes
- The `stripe` schema is **eventually consistent** (webhook-driven). Safe for *reads* (summary display, plan reconcile), but **never** base a write/branch decision on it that could create duplicates.
- **Why:** the "switch plan in place vs create new checkout" decision MUST query **live** Stripe (`stripe.subscriptions.list({ customer, status:'all' })` filtered by `metadata.app==='lokalradar'`), not the schema. During the webhook sync window the schema can show no active sub and you'd create a **second** subscription.
- After an in-place `subscriptions.update(...)`, return the tier optimistically (and write `LokalBusiness.plan` directly) — don't rely on an immediate schema re-read, which lags.
- Subscriptions carry `metadata { app, userId, tier }` (set via `subscription_data.metadata` at checkout) so live subs are identifiable without expanding product metadata.

## Endpoint shape (`/api/lokalradar/billing/*`)
- `summary` (GET): plan/status/period-end/trial + usage vs limits + catalog with real prices + hasSubscription/canManageBilling.
- `checkout` (POST {tier}): if a live paid sub exists → switch in place (proration, `trial_end:'now'`); else create a subscription Checkout Session (`client_reference_id=userId`, `subscription_data.trial_period_days:14` for Pro only, existing customer passed through). Returns `{url}` OR `{updated,plan}`.
- `portal` (POST): billing portal for stored `stripeCustomerId` (invoices/card/cancel). Gated: friendly error if no customer.
- `verify` (POST {sessionId}): validates `client_reference_id===userId` + session complete + entitled sub status, persists `stripeCustomerId` to `userProfileTable`, reconciles plan. Frontend MUST check `{verified}` before showing a success toast (else show "processing" and keep refetching).

## Gotchas
- `userProfileTable` has NOT NULL `trialStartDate`/`trialEndsAt` with no defaults — an insert of just `{userId, stripeCustomerId}` fails; set those to `now` (LokalRadar's trial is Stripe-owned, so they're unused here).
- After canceling a Stripe sub, `canManageBilling` stays true (the customer id persists on the profile) — that's expected; the portal still works.
