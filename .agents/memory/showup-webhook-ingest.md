---
name: ShowUp public webhook ingest
description: How inbound booking webhooks are received & verified, and the ENCRYPTION_KEY runtime dependency.
---

# Public inbound booking webhooks (generic_webhook provider)

Rules learned building the generic-webhook integration; they generalize to any
future signed public endpoint in the api-server.

- **Raw body before json.** The public webhook route must be registered in
  `app.ts` BEFORE `express.json()` using `express.raw({ type: "*/*" })`, exactly
  like the Stripe webhook. HMAC must run over the exact received bytes; once
  `express.json()` reparses/reserializes, the signature no longer matches.

- **Verify signature BEFORE parsing JSON.** The endpoint is unauthenticated and
  internet-facing. Parsing the body before checking the HMAC lets any caller
  force parse work (resource-exhaustion vector). The provider's `verifyWebhook`
  takes the raw string, checks the timing-safe HMAC first, and only then
  `JSON.parse`s. **Why:** flagged in code review as a blocking security issue.
  **How to apply:** any new signed public route — verify over raw bytes first,
  parse on success only.

- **Rate limit needs a global window + pruning.** Per-key (integrationId) limiting
  alone is exploitable because the key is attacker-controlled (unknown ids still
  create buckets before the 404). Add a coarse global window and prune expired
  buckets past a size cap.

- **ENCRYPTION_KEY is a hard runtime dependency.** Integration credentials
  (incl. the webhook signing secret) are stored AES-256-GCM encrypted via
  `lib/integrations/crypto.ts`. Without the `ENCRYPTION_KEY` secret, connect /
  regenerate return HTTP 503 (`encryption_not_configured`) and the live feature
  is dormant. It must be provided via `requestSecrets` (never `setEnvVars`).
  Task #19 (OAuth calendar connectors) needs it too.

- **Testing without the live key.** The running server has no ENCRYPTION_KEY, so
  end-to-end HTTP tests can't hit connect. Verify logic by bundling a script
  (esbuild) with a temporary `ENCRYPTION_KEY=...` env and driving
  `handleIntegrationWebhook` with a fake req/res through the real db+ingest path.
