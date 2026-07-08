---
name: Expo mobile ↔ better-auth cross-origin auth
description: How the Expo app authenticates against the shared better-auth Express backend, and the trustedOrigins gotcha.
---

# Expo mobile + better-auth (shared backend)

The Expo app (web build + native) authenticates against the same better-auth
Express backend as the web app, using **bearer tokens** (not cookies):

- Server: add the `bearer()` plugin from `better-auth/plugins`.
- Mobile signs in via `POST /api/auth/sign-in/email`, reads the
  **`set-auth-token` response header** (the full `token.signature` value), and
  stores it. It then sends `Authorization: Bearer <token>` on every request
  (wired through the generated api-client's `setAuthTokenGetter`).
- Server `auth.api.getSession({ headers })` accepts that bearer token.

## Gotcha: trustedOrigins must include the Expo domain

**Symptom:** sign-in works with `curl` (no Origin header) but the mobile web
build gets **403 / "Feil e-post eller passord"**.

**Why:** better-auth enforces an origin check on sign-in. The Expo app is
served from a *different* Replit domain (`$REPLIT_EXPO_DEV_DOMAIN`,
`*.spock.replit.dev`) than the API (`$REPLIT_DEV_DOMAIN`), so the browser sends
a cross-origin `Origin` header that better-auth rejects unless it is in
`trustedOrigins`.

**How to apply:** add `https://${REPLIT_EXPO_DEV_DOMAIN}` plus wildcard Replit
domains (`https://*.replit.dev`, `https://*.spock.replit.dev`,
`https://*.replit.app`) to better-auth `trustedOrigins`. Express `cors()` (open)
is enough for CORS itself; the blocker is better-auth's own origin check, not
CORS. Verify quickly with `curl -H "Origin: https://<expo-domain>"` — expect 200.

## Testing the Expo app

The testing subagent / Screenshot tool must hit the **Expo dev URL**
(`https://$REPLIT_EXPO_DEV_DOMAIN/`), NOT path `/` on the default preview —
Expo bypasses the shared proxy, so `/` serves the *web* artifact instead.
