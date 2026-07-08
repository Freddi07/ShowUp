---
name: ShowUp SMS via Twilio
description: SMS provider is Twilio (official SDK). Send + inbound reply webhook with signature verification, why Twilio won after a long provider search.
---

# ShowUp / BookPling SMS via Twilio

SMS (appointment reminders + customer replies JA/NEI/FLYTT → confirm/cancel/reschedule)
goes through **Twilio**, wired in a single provider module (`sendSms(to, body): Promise<string>`
plus an inbound signature verifier). Only that module + its importers change per provider.

**Why Twilio won.** The user serially rejected/failed at Vonage, Twilio (initially), Telnyx,
Sveve, and MessageBird/Bird. Every failure was on the SAME step: provisioning a
compliance-approved sending/receiving NUMBER. That is a universal telecom requirement, not a
provider quirk — no provider skips it. Twilio was the only path already past that wall: the
project's Twilio account already had an active SMS number and the inbound webhook already
pointed at `/api/sms/inbound`. So switching cost only code, no new provisioning.

**Why:** don't hand a frustrated user "another provider" when the blocker is
account/number provisioning — it just repeats the wall. Check for an already-provisioned
option first (Twilio creds were sitting in secrets the whole time).

**Trial-account caveat.** The Twilio account is a TRIAL: `messages.create` to an unverified
number throws error **21608** ("unverified recipient"). This is the likely reason Twilio
"felt bad" before. Fix = add funds / upgrade (a top-up, NOT a compliance process); then it
sends to anyone. Error 21608 on a send is a healthy smoke-test signal, not a wiring bug.
The trial number is US (+1); a Norwegian sender would need buying a NO number (own compliance).

**Implementation notes.**
- Uses the official `twilio` npm SDK for both send and `twilio.validateRequest`.
- Inbound security = Twilio request signature (X-Twilio-Signature), verified with the auth
  token. The signed URL is reconstructed as `${req.protocol}://${req.get("host")}${req.originalUrl}`
  — this relies on `app.set("trust proxy", true)` so protocol/host reflect the public URL
  Twilio was configured to call. Fail-closed (403) in production, warn-and-process in dev.
- Inbound fields: Twilio POSTs form-encoded `From` (sender) + `Body` (text); ack with empty
  TwiML `<Response></Response>` (text/xml) so Twilio sends no auto-reply.
- Phone normalization: strip non-digits; strip leading "00"; if 8 digits prefix "47"; return
  E.164 with leading "+".
- `twilioSid` is a legacy schema COLUMN storing the returned message id — kept as-is (rename
  needs a migration).
