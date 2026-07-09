# LokalRadar

LokalRadar is a Norwegian SaaS that watches a local business's competitors (prices, reviews, web presence) and auto-writes ready-to-use marketing (posts, review replies, SEO copy) so owners don't have to.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the shared API server
- `pnpm --filter @workspace/lokalradar run dev` — run the LokalRadar web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; interactive — prefer SQL for additive DDL)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Backend: Express 5 (`artifacts/api-server`) — shared service; LokalRadar lives under `/api/lokalradar/*`
- Frontend: React 19 + Vite + wouter (`artifacts/lokalradar`), served at base path `/lokalradar/`
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- API codegen: Orval from `lib/api-spec/openapi.yaml` → `@workspace/api-client-react` (hooks) + `@workspace/api-zod`
- Auth: better-auth (email + Google); billing: Stripe (test mode)

## Where things live

- API contracts (source of truth): `lib/api-spec/openapi.yaml` — run codegen after editing
- DB schema: `lib/db/src/schema/` (`auth`, `profile`, `settings`, `lokalradar`)
- LokalRadar backend: `artifacts/api-server/src/routes/lokalradar.ts` + `src/lib/lokalradar/`
- LokalRadar frontend: `artifacts/lokalradar/src/` (pages, components)
- Stripe billing helpers: `artifacts/api-server/src/lib/lokalradar/billing.ts`

## Architecture decisions

- Single shared Express API server hosts LokalRadar; identity (`user`/`session`) and billing (`userProfile.stripeCustomerId`, Stripe schema) are shared infrastructure, not product-specific.
- LokalRadar's frontend uses generated Orval hooks for CRUD/read endpoints, but `apiFetch` (manual) for `/api/lokalradar/billing/*` and `/api/lokalradar/chat` to avoid codegen churn on fast-moving endpoints.
- Stripe plans are resolved at runtime from the synced `stripe` schema via product metadata `{ app: "lokalradar", tier }` — no hardcoded price ids.

## Product

- Norwegian (bokmål) UI. User-facing brand is **LokalRadar**; all internal ids (package/dir/slug, test login `test@showup.no`) stay `showup`/`lokalradar` — do not rename.
- Free (Gratis) + paid Pro (199 NOK/mo, 14-day trial) and Bedrift (399 NOK/mo) plans.
- No SMS features and no Facebook/Instagram integrations (per product spec). Notifications are in-system + email only.

## User preferences

- Focus is LokalRadar only. The former ShowUp/BookPling product (web + mobile + booking/SMS/reminders backend) was removed on 2026-07-09; keep the codebase LokalRadar-only.

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`, and restart the lokalradar web workflow if Vite shows a transient "Failed to load generated api" error (orval clears the output dir mid-build).
- `@workspace/db` needs `tsc --build` after schema edits before dependents typecheck (codegen's `typecheck:libs` does this).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
