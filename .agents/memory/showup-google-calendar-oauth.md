---
name: ShowUp Google Calendar OAuth
description: Why calendar connectors use per-tenant OAuth (not Replit connectors), and the redirect-URI + fail-closed constraints that flow from it
---

# Calendar connectors on ShowUp/BookPling

## Per-tenant OAuth, NOT Replit managed connectors
Replit managed connectors authorize exactly ONE account per provider (developer-authorized at build time). ShowUp is multi-tenant SaaS — every business must connect their OWN calendar. So calendar integrations use standard per-tenant OAuth with the app's own Google client (reusing the existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` already set for better-auth social login), NOT the connector system.

**Why:** the connector model binds a single external account; it cannot represent many tenants each with their own calendar.

## Owner setup step (unavoidable, one-time)
The Google Cloud OAuth app must list the redirect URI `https://<public-host>/api/integrations/google_calendar/callback` in its Authorized redirect URIs. This is a console paste, no code. Without it Google returns redirect_uri_mismatch. Tell the user this whenever setting up / debugging a fresh environment or new domain.

## Redirect-URI consistency
The redirect_uri used to build the consent URL MUST byte-match the one sent at token exchange. We build it from the request host at `oauth-url` time and carry it inside the signed `state`, then reuse that exact value in the callback. Don't recompute it independently in the callback.

## OAuth state = CSRF + identity
The callback is a PUBLIC route (browser lands there post-consent, no session), mounted BEFORE the session-authed integrations router. Identity comes from a signed, expiring `state` (HMAC over {userId, provider, redirectUri} using BETTER_AUTH_SECRET/SESSION_SECRET). **State signing must fail closed** — no hardcoded fallback secret — or an attacker could forge state and bind their calendar tokens to another tenant.

## Polling model
Calendar bookings are pulled (not webhook): a 5-min loop syncs every connected OAuth integration. `fetchNewBookings` scans the primary calendar's upcoming timed events (skips all-day/cancelled), maps to bookings, and relies on the idempotent ledger ingest for dedup. Token refresh happens inside the provider and persists the new encrypted creds itself (it has integrationId + crypto), so the loop never touches token plumbing. Known gap: reschedules/cancellations in Google are not propagated (dedup-by-event-id skips them).
