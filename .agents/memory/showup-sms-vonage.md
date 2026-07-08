---
name: ShowUp SMS via Vonage
description: SMS provider is Vonage (SMS API), not Twilio — credentials, inbound webhook, and signature quirks
---

# ShowUp SMS = Vonage (SMS API)

ShowUp sends/receives SMS reminders through **Vonage**, not Twilio. There is **no Replit
integration for Vonage**, so credentials are plain Replit Secrets (not a managed connection):
`VONAGE_API_KEY`, `VONAGE_API_SECRET`, `VONAGE_FROM` (owned number in international digits OR
alphanumeric sender ID), and optional `VONAGE_SIGNATURE_SECRET` (+ `VONAGE_SIGNATURE_METHOD`,
default `sha256`).

**Why:** user switched providers; Twilio (which had both a managed connection and secrets)
was fully removed from the active api-server. The old `TWILIO_*` secrets may still linger and
can be deleted once Vonage is confirmed in production.

## Gotchas

- **Outbound** uses the SMS API `https://rest.nexmo.com/sms/json` with api_key/secret in the
  POST body. Success = HTTP 200 AND per-message `status === "0"`; the returned `message-id` is
  stored in the appointment's SID field (internally still named after Twilio — column not
  renamed, no migration).
- Recipient (`to`) must be **international digits with no `+`** — normalize by stripping all
  non-digits. Do NOT strip the `from` (may be an alphanumeric sender ID).
- Norwegian ÆØÅ are in the GSM-7 basic charset, so no `type=unicode` needed (that would halve
  segment length).
- **Inbound webhook** (`/api/sms/inbound`) must accept **both GET and POST** — Vonage's inbound
  method is dashboard-configurable. Sender is `msisdn`, message is `text`. Respond `200 OK`
  (not TwiML) so Vonage stops retrying.
- **Signature canonicalization** (signed callbacks): exclude `sig` AND empty-valued params,
  sort keys, join as `&key=value` (leading `&`, replace `&`/`=` in values with `_`). For
  `md5hash`: `md5(base + secret)`. For hmac methods (`sha256` etc.): `hmac(method, secret)` over
  base, compare case-insensitively. Getting empty-param exclusion or the leading `&` wrong makes
  every real signed callback fail.
- **Fail-closed in production:** inbound rejects (403) when signature is missing/invalid in
  production; warns-but-processes only outside production. Never fail-open in prod — the endpoint
  is public and a spoofed "NEI" would cancel appointments.
