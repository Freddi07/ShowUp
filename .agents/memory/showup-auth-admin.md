---
name: ShowUp auth & admin
description: better-auth password-reset endpoint names and the admin-dashboard access model.
---

# ShowUp auth & admin

## better-auth password reset endpoint names
The request-a-reset endpoint is **`POST /api/auth/request-password-reset`** (body `{ email, redirectTo }`),
**not** `/forgot-password` or `/forget-password` (both 404). The reset-submit endpoint is
`POST /api/auth/reset-password` (`{ newPassword, token }`).

**Why:** A frontend page was silently POSTing to `/api/auth/forgot-password` → 404, so no reset email ever sent.
**How to apply:** When wiring password reset, prefer the client helper `authClient.requestPasswordReset(...)`
or hit `/api/auth/request-password-reset`. The server's `emailAndPassword.sendResetPassword` builds the reset
URL from `APP_URL` regardless of the `redirectTo` value.

## Admin dashboard access = email allowlist (not role)
Admin access is gated by an **email allowlist**, not the better-auth `role` field, per an explicit product
requirement ("only <owner email> can access"). Backend: `requireAdminEmail` middleware checks the session
email against `ADMIN_EMAILS` (comma-separated env, default the owner address). Frontend: `isAdminEmail()`
(`VITE_ADMIN_EMAIL`) gates the `/admin` route page, dashboard shell, and nav — keep all four in sync.

**Why:** Requirement is a single-owner admin; role-based control would let any role=admin user in.
**Operational invariant:** signup is open and email verification is not enforced, so the owner account for
the allowlisted email must exist and never be relinquished — otherwise someone could register that email on a
fresh/reset DB and become admin. Do NOT add an `emailVerified===true` requirement unless a verification flow
exists first (it would lock out the real owner).

## Deleting a user removes tenant data manually
Only `session`/`account` FK-cascade off `user`. All other user-owned tables key on a plain `userId` text
column (userProfile, customer, integration, syncedAppointment, messageTemplate, notificationSettings,
passwordResetToken). The admin delete route deletes them explicitly inside one `db.transaction` before the
user row, or they orphan.
