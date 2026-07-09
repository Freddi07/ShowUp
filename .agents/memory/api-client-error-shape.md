---
name: API client error shape (showup/lokalradar web)
description: How to read backend error messages from thrown client errors in the React apps
---

The generated `@workspace/api-client-react` hooks use `custom-fetch.ts`, which on a
non-2xx response throws an `ApiError` whose **parsed JSON body is in `err.data`**
(e.g. `err.data.error` = the backend's Norwegian/user-facing message). `err.message`
is a formatted `"HTTP <status> <statusText>: <detail>"` string.

**Rule:** to surface a backend error message in a toast, read `err?.data?.error`
(fall back to a friendly default). Do NOT use `err?.cause?.error` — that field does
not exist on `ApiError` and silently yields the generic fallback.

**Why:** several existing pages (e.g. lokalradar `konkurrenter.tsx`) copy the wrong
`err?.cause?.error` pattern, so backend messages like plan-limit / validation errors
never reached the user. Confirmed against `lib/api-client-react/src/custom-fetch.ts`
(`ApiError.data`).

**How to apply:** any new mutation error handler in the showup or lokalradar web
apps should use `err?.data?.error`. If touching an older page with `err?.cause?.error`,
fix it too.
