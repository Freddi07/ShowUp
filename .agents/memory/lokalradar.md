---
name: LokalRadar foundation
description: Architecture & conventions for the LokalRadar product (separate artifact sharing showup's api-server/db/auth)
---

# LokalRadar

Norwegian all-in-one AI tool for small businesses (competitor monitoring + marketing assistant). A **separate product/artifact** from BookPling (showup) but reuses the shared infrastructure. All user-facing text is Norwegian bokmål; no emojis in the UI.

## Stack decision
- **Reuses the existing stack, NOT the brief's Next.js+Supabase.** Frontend: Vite+React+wouter+Tailwind+shadcn. Backend: the shared `api-server` (Express+Drizzle+Postgres+better-auth). AI via existing Anthropic integration.
- **Why:** the monorepo already runs this stack end-to-end; a second stack would double the ops surface for no benefit. User approved.

## Routing / origin
- `showup` owns `/`; LokalRadar is at previewPath `/lokalradar/`. Both served from the **same host/origin** via Replit's path proxy, so LokalRadar calls `/api/*` and uses better-auth exactly like showup — **no cross-origin/trustedOrigins problem** (better-auth already trusts the replit domains). Signup/login/session just work same-origin.
- Frontend auth plumbing lives in `artifacts/lokalradar/src/lib/` (auth-client, api-client, env, compat/next-navigation) — mirrors showup's files.

## Backend namespace
- All routes under `/api/lokalradar/*` (router `artifacts/api-server/src/routes/lokalradar.ts`, mounted in `routes/index.ts`). `requireUser` on the whole router; every query filters by `userId` for tenant isolation.
- Business profile is **get-or-create on first access** (one row per user, `userId` unique). Onboarding state is `onboardingCompleted` on that row (NOT showup's `/api/onboarding`).

## Plan limits (billing wired later)
- Plan read from `LokalBusiness.plan` (default `gratis`). Limits: gratis = 1 competitor / 5 generations, pro = 10 / 100, bedrift = unlimited (null).
- **Competitor-cap enforcement MUST be atomic:** count-then-insert inside `db.transaction` + `pg_advisory_xact_lock(hashtext(userId))`, else concurrent requests bypass the cap (same pattern as showup customers.ts). Verified: 5 concurrent creates on gratis → 1×201, 4×403.

## Conventions that bit / matter
- OpenAPI schemas prefixed `Lokal*` to avoid TS2308 collisions with showup schemas; nullable = `type: ["string","null"]`; every op needs entity-shaped body `$ref` names.
- Backend validates body field **types** and returns 400 (don't silently coerce/drop) — code review flagged silent-drop as a contract gap.
- Frontend: always use generated query-key helpers (e.g. `getListLokalAlertsQueryKey()`), never ad-hoc keys like `["/api/alerts"]`, or mutation invalidation won't refresh the view.
