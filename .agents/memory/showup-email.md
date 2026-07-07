---
name: ShowUp email (Resend)
description: Email provider, the send contract, and the domain-verification gate
---

# ShowUp transactional email

**Decision:** email is sent server-side (API server) via the **Resend Replit connector**, not the
old Polsia proxy. The connector supplies auth — no API key in code or env.
**Why:** moving off Polsia's proxy was a launch requirement; the connector keeps the key out of code.

**Contract:** sends are **best-effort and non-blocking** — auth flows (signup, password reset) must
never wait on or fail from mail latency. `sendEmail` never throws; `dispatchEmail` is fire-and-forget
with a send timeout. Keep new email sends on this fire-and-forget path.

**Domain gate (user action, not code):** with the test sender `onboarding@resend.dev`, Resend only
delivers to the Resend account owner's own address; every other recipient 403s with
`validation_error`. To send to real users: verify a domain at resend.com/domains and set `EMAIL_FROM`
(e.g. `ShowUp <noreply@yourdomain.no>`). A 403 with that message means "domain not verified," not a
code bug.
