---
name: ShowUp mobile native social login
description: How the Expo app does Google (social) sign-in via a server bridge, and the Set-Cookie forwarding bug it exposed
---

# ShowUp mobile native social login

The Expo app can't reuse the web social flow directly because the OAuth
PKCE/state cookie must live in the **in-app browser** session, not the app's
`fetch` cookie jar.

## The bridge pattern
- App opens `GET /api/mobile-oauth/<provider>?returnUrl=<deeplink>` in
  `expo-web-browser` `openAuthSessionAsync`.
- That server route starts better-auth social sign-in **server-side**
  (`auth.handler` POST `/sign-in/social` with a relative `callbackURL`),
  forwards the resulting Set-Cookie (state/PKCE) to the in-app browser, and 302s
  to the provider.
- Provider → better-auth callback sets the session cookie → redirects to
  `GET /api/mobile-oauth/complete`, which reads the signed session-token cookie
  value and deep-links back to the app with `?token=<value>`.
- **The signed session-cookie value IS a valid `Authorization: Bearer` token**
  (the bearer plugin verifies the `value.signature` HMAC), so the app stores it
  exactly like the token from email sign-in. No `@better-auth/expo` package
  needed — plain `expo-web-browser` + `expo-linking`.

## Gotchas (each cost a round-trip)
- **Express route order:** declare `/complete` BEFORE `/:provider` or Express
  matches "complete" as a provider → 404.
- **Multi Set-Cookie forwarding:** the express→better-auth bridge originally did
  `response.headers.forEach((v,k)=>res.setHeader(k,v))`. `Headers.forEach`
  **collapses multiple Set-Cookie into one comma-joined string**, which breaks
  OAuth (it sets several cookies: state, PKCE, session) on **both web and
  mobile**. Fix: forward `response.headers.getSetCookie()` entries with
  `res.append("set-cookie", …)` and skip set-cookie in the forEach.
  **Why:** email sign-in only sets one cookie so it hid the bug; OAuth exposed it.
- **returnUrl open-redirect = token theft:** the deep-link token is a real bearer
  token. `returnUrl` MUST be restricted to the app-owned `showup-mobile://`
  scheme in production (a remote attacker can't register it). `exp://` and the
  exact `REPLIT_EXPO_DEV_DOMAIN` https host are allowed **in dev only**. Never
  allow wildcard public suffixes (`*.replit.dev`, `*.exp.direct`).

## Testability
- Full round-trip needs a real Google login + a build where `showup-mobile://`
  resolves (dev/standalone build; Expo Go yields `exp://`). Can't be verified in
  the Replit web preview — verify the bridge routes with curl (302 to provider,
  400 on bad returnUrl, `/complete` deep-links with error when no session).
- No extra Google config for mobile: OAuth still uses the api-server web callback
  (`{baseURL}/api/auth/callback/google`); the app scheme is reached via our
  `/complete` redirect, not a Google redirect URI.
