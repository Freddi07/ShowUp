---
name: ShowUp in-dashboard AI setup assistant
description: Architecture + gotchas for the dashboard chat assistant that does integration setup via Claude tool use
---

# In-dashboard AI setup assistant

A dashboard chat widget (floating button → panel) that answers product questions
and performs integration setup for the signed-in tenant via Claude tool use.

## Shape
- Model `claude-sonnet-4-6` via the Replit AI Integrations Anthropic proxy
  (`@workspace/integrations-anthropic-ai`, pre-configured SDK; no own key).
- Backend streams SSE with an agentic tool-use loop: stream text_delta → on
  `stop_reason==="tool_use"` run tools, append assistant blocks + a tool_result
  user turn, loop (bounded rounds). Tools are all tenant-scoped by `userId` and
  re-implement the same primitives the integration routes use (catalog, crypto,
  webhook-secret gen, google auth url + signed state, sync).
- Client consumes the stream with fetch + ReadableStream, parsing `data: {json}`
  frames; NOT a generated/orval hook (integration endpoints aren't in openapi).

## Secret persistence — the important lesson
**Persisting raw model output can leak tool secrets.** The model is fed
tool_result content (webhook secret, OAuth URL) and will happily echo it back in
its prose, which then gets written to the durable chat log.
**Why:** a prompt guardrail ("don't repeat the secret") is only a soft
mitigation — the model sometimes ignores it.
**How to apply:** collect the exact sensitive strings returned by tools this turn
into a Set, and string-replace them out of the assistant text before the DB
insert (hard server-side redaction). Do this for ANY feature that logs LLM
output produced alongside sensitive tool results.

## Gotcha: adding a big dep breaks the Expo/Metro workflow transiently
Adding a large package to the workspace (here `@anthropic-ai/sdk`) can make the
mobile Expo workflow crash on boot with `ENOENT ... watch '.../sdk_tmp_XXXX/...'`
— Metro watches ALL of node_modules and a fresh pnpm install leaves a temp
extraction dir that vanishes mid-watch.
**Fix:** it's transient; once the install settles the `_tmp_` dir is gone —
just restart the mobile workflow. Not a code bug.

## Test account gate
Use the seeded test account (email + password are set by
`artifacts/api-server/build-seed.mjs` / `src/seed.ts` — read them there, do NOT
copy credentials into memory). The dashboard is gated by
`UserProfile.onboardingCompleted`; a freshly-seeded test user lands on
/onboarding, so set `onboardingCompleted=true` (SQL) before e2e tests can reach
/dashboard.
