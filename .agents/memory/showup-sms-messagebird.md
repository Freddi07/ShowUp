---
name: ShowUp SMS via MessageBird
description: SMS provider is MessageBird (classic REST API). Send + inbound reply webhook, why classic over Bird API, two-way number requirement.
---

# ShowUp / BookPling SMS via MessageBird

SMS (appointment reminders + customer replies JA/NEI/FLYTT → confirm/cancel/reschedule)
goes through **MessageBird**, wired in a single provider module (`sendSms(to, body): Promise<string>`
plus an inbound-webhook token verifier). Only that module + its importers change per provider.

**Why MessageBird's classic REST API, not the new Bird API:**
The new Bird API (`api.bird.com/workspaces/{ws}/channels/{ch}/messages`) requires a
purchased number + compliance approval + installed channel — the same KYC wall that
blocked earlier providers. The **classic REST API** (`https://rest.messagebird.com/messages`,
`Authorization: AccessKey <key>`, body `{originator, recipients:[msisdn], body}`) is the
easy path: an alphanumeric sender ("BookPling") sends outbound in Norway with no number
to buy.

**Two-way replies still need a number.** Alphanumeric senders are one-way. To receive
JA/NEI/FLYTT replies, the user must have a dedicated MessageBird virtual number whose
inbound webhook points at `/api/sms/inbound`.

**Env:** `MESSAGEBIRD_ACCESS_KEY` (secret, live key). Non-secret: `MESSAGEBIRD_ORIGINATOR`
(default "BookPling"), `MESSAGEBIRD_WEBHOOK_TOKEN` (shared secret embedded as `?token=` in
the webhook URL; webhook verified fail-closed in production, warn in dev).

**Inbound payload fields:** MessageBird posts `originator` (sender) + `body` (text) — NOT
Sveve's `number`/`msg`. Handler accepts GET query or POST body.

**Provider history:** rejected Vonage, Twilio, Telnyx (signup/verify failed), Sveve. Twilio
is still connected in the project (secrets present) but user declined it. `twilioSid` is a
legacy schema COLUMN name storing the returned SMS message id — left as-is (renaming needs a
migration); it is not provider-specific behavior.

**Phone normalization:** strip non-digits; strip leading "00"; if 8 digits, prefix "47".
Inbound appointment matching uses last-8-digits + most-recent REMINDED (heuristic, inherent
to free-text SMS replies — no provider returns a correlation key on a reply).
