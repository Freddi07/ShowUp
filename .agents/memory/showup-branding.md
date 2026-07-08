---
name: BookPling brand vs internal "showup" identifiers
description: Product is branded "BookPling" but all internal identifiers stay "showup" — do not "fix" the mismatch
---

# Display brand = "BookPling", internal names = "showup"

The product's user-facing brand was renamed **ShowUp → BookPling** (domain: bookpling.com).
Only *display strings* were changed (brand.ts `siteName`, index.html title/meta, email
sender+copy, landing/setup/integrations copy, mobile app name + headers, Stripe plan display
names, billing fallback, Cliniko User-Agent).

**All internal identifiers deliberately still say `showup`** and must NOT be renamed:
- pnpm package names (`@workspace/showup`, `@workspace/showup-mobile`), artifact dir names,
  workflow names.
- mobile Expo `slug`/`scheme` = `showup-mobile` (renaming breaks deep links/build identity).
- React component `ShowUpLandingClient` + file `showup-landing.tsx`.
- seed test login `test@showup.no` / password `ShowUp!2026`.
- deployment/preview URLs `showup-8.polsia.app` and the support email `showup-8@polsia.app`.

**Why:** renaming packages/dirs/slugs is a high-risk refactor that breaks imports, routing,
and the Expo build; the brand rename does not require it. If you see `showup` in code, check
whether it's a display string (rebrand it) or an internal identifier (leave it).

## Two runtime follow-ups NOT done in code (env-side)
- `EMAIL_FROM` env override can still surface "ShowUp"; the code *fallback* is now BookPling.
  To send from bookpling.com, verify the domain in Resend and set `EMAIL_FROM`.
- Existing Stripe products keep their old "ShowUp …" names until re-seeded; the seed script
  now says BookPling but re-running risks duplicate products — reconcile deliberately.
