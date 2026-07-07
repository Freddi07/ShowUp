---
name: ShowUp SMS (Twilio)
description: SMS provider choice, how to verify connector creds, and the backend gap
---

# ShowUp SMS (Twilio)

**Decision:** SMS goes through the **Twilio Replit connector** (`connectors.proxy("twilio", …)`),
same pattern as Resend — credentials stay in the connector, not in code. The old app used raw
`TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` env vars + the `twilio` npm SDK; prefer the connector.

**Verifying connector creds:** `listConnections("twilio")` in the CodeExecution sandbox **redacts
secrets**, so any direct Twilio REST call using those values returns `401 Authenticate`. That 401 is
expected and does NOT mean the connection is broken — verify the send path from app code via the
connector proxy, not from the sandbox. The connection's non-secret `settings.phone_number` IS
readable there.

**Backend gap:** as of this work, nothing in the running app sends SMS. The reminder sender
(`send-reminders.js`) and the inbound SMS-reply webhook live only in `_api_nextjs_backup/` and still
reference Prisma (this project uses Drizzle). Sending from the dashboard requires building an SMS
module + reply webhook + the appointment/reminder data layer into the API server.

**Norway sending:** for a Norwegian appointment-reminder service, prefer an **alphanumeric Sender ID**
("ShowUp") over a purchased number — supported in Norway, no A2P registration. US numbers/A2P are the
heavy path and not needed for Norway. Trial accounts only text verified numbers until upgraded.
