---
name: ShowUp plan entitlements
description: How plan tiers are enforced in ShowUp — what is gated, effective-plan resolution, and the atomic customer-cap pattern.
---

# ShowUp plan tier enforcement

## What is actually enforceable
Of the three advertised plans (Starter 199kr / Pro 499kr / Business 999kr), the **only concrete, unambiguous software difference is the customer cap**: Starter 100, Pro 500, Business unlimited. SMS + e-post påminnelser are in *all* plans; "alle kanaler" and support tiers are marketing, not distinct features.

**"Avansert statistikk" was deliberately NOT gated** — the frontend calls `/api/stats` + `/api/stats/export` but there is **no backend route** for them in api-server (only a legacy `_api_nextjs_backup/stats/route.ts`). Do not gate a feature that has no working backend. If stats are ever wired up, revisit gating.

## Effective-plan resolution (the rule)
`resolveEntitlements(profile)`:
- **active subscription** (`subscriptionStatus === 'active'`) → the stored `profile.plan` (defaults to starter if null).
- **active trial** (`trialEndsAt > now`, no active sub) → **business / unlimited** (standard SaaS "try everything").
- **else** (expired, no sub) → **starter floor (100)** — chosen to avoid a surprise hard-lockout, not zero.

**Why:** the user wanted cheaper plans to not get Business features; trial users should still be able to evaluate everything.

## Atomic customer-cap pattern (do not regress)
The cap check is a count-then-insert, which is **racy** — concurrent create/import/ingest for the same user could each read `count < limit` and all insert past the cap. Enforcement is made atomic by wrapping the count+insert of a **new** customer in a transaction that first takes a **per-user Postgres advisory lock**: `SELECT pg_advisory_xact_lock(hashtext($userId))`. This serializes all new-customer inserts for that user across every path.

**How to apply:** the cap is enforced at the shared `upsertCustomer(userId, input, { maxCustomers })` chokepoint — the single place all three creation paths (manual `POST /customers`, bulk `POST /customers/import`, public `POST /ingest/customers`) go through. Only the **new-row (created)** branch is capped; existing-match **updates are always allowed**. Passing `maxCustomers: null` (or omitting it) means unlimited. On breach it throws `CustomerLimitError` (routes map it to HTTP 403 `code: "customer_limit"`; import catches per-row → skips + sets `limitReached`).

Verified with a 10-way concurrent test at cap 3 → exactly 3 created, 7 rejected.
