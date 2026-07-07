---
name: ShowUp Vite port decisions
description: Key architectural decisions and guardrails from porting ShowUp (Next.js) to Vite+React+Express in the Replit pnpm monorepo
---

## Routing: wouter at artifacts/showup/src/App.tsx
All client-side routing lives in `App.tsx` using wouter `<Switch>/<Route>`. Dashboard routes wrap pages in `<DashboardShell>`. Provider order: QueryClientProvider → ThemeProvider → AppProviders → WouterRouter → SiteNav+Router+SiteFooter+Toaster.

**Why:** Next.js App Router replaced by wouter; Vite has no file-based routing.

## next/navigation shim at src/lib/compat/next-navigation.ts
Files using `from 'next/navigation'` were mass-replaced to `from '@/lib/compat/next-navigation'`. Exports `useRouter`, `usePathname`, `useSearchParams`, `redirect` via wouter + window.location.

**How to apply:** Any new file using Next.js navigation hooks must import from the compat shim.

## Async server pages → client components
Next.js pages using `async function Page({ searchParams: Promise<...> })` crash in Vite. Convert to `'use client'` + `useSearchParams()`/`useParams()` hooks. Fixed: login, reset-password, kunder/[id], admin.

## Server-only files excluded from frontend tsconfig
These directories/files are in `artifacts/showup/tsconfig.json` `exclude` list so Vite never compiles them:
- `src/app/_api_nextjs_backup/**` — Next.js API routes (move to Express when porting)
- `src/lib/integrations/**`, `src/lib/stripe-billing/**`, `src/lib/stripe.ts`
- `src/lib/auth-config.ts`, `src/lib/business/**`, `src/lib/customers/**`, `src/lib/email/**`

**Why:** These files use server-only packages (twilio, stripe, prisma) not installed in the frontend.

## API routing: Replit path-based proxy
The Replit proxy routes `/api/*` directly to the API server (port 8080) and `/*` to Vite (port 20192). No Vite proxy config needed. The auth-client uses `baseURL: window.location.origin` which is correct — the browser sends to the same origin and the Replit proxy forwards `/api/auth/*` to the API server.

## better-auth configuration
- Server: `artifacts/api-server/src/lib/auth.ts` — drizzle adapter, email+password enabled, admin plugin, 14-day trial hook
- Client: `artifacts/showup/src/lib/auth-client.ts` — `createAuthClient({ baseURL: window.location.origin })`
- `BETTER_AUTH_URL` auto-detected from `REPLIT_DEV_DOMAIN` env var at runtime; no manual setting needed in dev
- `trustedOrigins` includes the Replit dev domain, localhost variants

**Why:** `BETTER_AUTH_SECRET` is required. Without it the server falls back to an insecure dev string and throws in production.

## drizzle-zod compatibility
`drizzle-zod@0.8.x` has a type conflict with `zod@^3.25.76` in this workspace (`ZodType` constraint mismatch). **Do not use `createInsertSchema` from drizzle-zod.** Use drizzle's built-in `$inferInsert` / `$inferSelect` instead.

## @opentelemetry/* in esbuild build.mjs
Was in the `external` list but better-auth depends on it at runtime. Removed from externals so esbuild bundles it. File: `artifacts/api-server/build.mjs`.

## lib/db TypeScript declarations
The api-server uses TypeScript project references to `lib/db`. Before running `pnpm --filter @workspace/api-server run typecheck`, always run `pnpm --filter @workspace/db exec tsc -p tsconfig.json` first to emit `.d.ts` files to `lib/db/dist/`.
