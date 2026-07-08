---
name: Expo e2e testing (ShowUp mobile)
description: How to point the Playwright testing subagent at the Expo web app
---

# Testing the ShowUp Expo mobile app end-to-end

**The tester must navigate to the absolute Expo dev URL, not `/mobile/`.**
Expo apps bypass the shared path-routing proxy, so the proxy path returns
HTTP 502 in the tester's browser (blank white screen). Build the absolute URL
from `$REPLIT_EXPO_DEV_DOMAIN` and pass it to the testing subagent; allow ~30s
for the first bundle.

**Why:** the Screenshot tool resolves Expo via `$REPLIT_EXPO_DEV_DOMAIN`
automatically, but the Playwright tester defaults to the proxy path and reports
`unable` with 502s if pointed at `/mobile/`.

**Seeded test login:** the demo account's password is only set when the seed
runs. If login returns 401 even though the account + credential row exist, run
the api-server seed script to (re)set demo data and the password.
