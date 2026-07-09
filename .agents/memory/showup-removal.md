---
name: ShowUp removal — monorepo is now LokalRadar-only
description: Durable invariants from deleting the ShowUp product; what stays shared and why "showup" naming lingers
---

# ShowUp removed (2026-07-09) — LokalRadar-only monorepo

The ShowUp/BookPling product (appointment reminders + SMS, web + Expo) was deleted so the monorepo hosts only LokalRadar. Older `showup-*` memory topics describing that code were pruned. The specifics of *which* files/routes were deleted are in git history — below are the invariants that survive the change.

## Invariant: DB tables were NOT dropped
Per user choice the ShowUp *code/schema* was removed but the live DB tables (Customer, Appointment, NotificationSettings, PushToken, integrations, etc.) still exist — orphaned but intact and reversible. Do not assume they're gone, and don't expect a clean `drizzle push` diff without accounting for them.

## Invariant: shared infra is NOT ShowUp — keep it
The Express `api-server` is a shared host, not a ShowUp app. These are shared and load-bearing for LokalRadar: better-auth (`/api/auth/*`, `lib/auth.ts`), `lib/email.ts` (auth/welcome/reset via Resend — never ShowUp-specific), logger, `require-user` middleware, Stripe client/init/webhook sync, and DB schema `auth`/`profile`(`userProfileTable` holds `stripeCustomerId`)/`settings`(`passwordResetTokenTable` only)/`lokalradar`. Don't delete these as "leftover ShowUp."

## Invariant: "showup" naming is legacy internal id, not a live product
Package/dir/slug ids and the test login `test@showup.no` intentionally stay `showup` (see branding memory). Seeing "showup" in identifiers does not mean a ShowUp product exists.
