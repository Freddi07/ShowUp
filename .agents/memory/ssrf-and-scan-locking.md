---
name: SSRF guard + pool-safe scan locking
description: How to safely fetch user-supplied URLs server-side, and how to serialize long-running per-row jobs without a held transaction (learned on LokalRadar competitor scanning)
---

# Fetching user-supplied URLs safely (SSRF)

When the server fetches a URL the user controls (competitor website scraping, webhook probes, link previews), a plain `fetch`/`http.request` lets an authenticated user reach internal targets (cloud metadata `169.254.169.254`, `127.0.0.1:<internalport>`, private ranges, `localhost`).

**Two layers are required — one alone is a hole:**
1. **Custom DNS `lookup`** passed to `http.request`/`https.request` options. It validates every resolved IP against a private/loopback/link-local/ULA/multicast block-list *at connect time*, so it also covers redirect hops and defeats DNS-rebinding (the same block-list runs on the actual connection target).
2. **Synchronous IP-literal check** before the request. **Gotcha:** when the URL host is an IP literal (`http://127.0.0.1/`, `http://[::1]/`, `http://10.0.0.1/`), Node skips DNS entirely and connects directly, so the custom `lookup` never runs. You must `net.isIP(host)` + block-list check the literal yourself, or literals bypass everything. (`localhost` *is* caught by the lookup because it resolves; raw IPs are not.)

Also: follow redirects manually (cap the count) so each hop re-enters the guard; cap body size while streaming; set a connect/read timeout; restrict to http/https. `undici` is NOT importable as a bare specifier in this repo (Node ships it internally only) — use `node:http`/`node:https`, not an undici `Agent`.

**Why:** code review flagged SSRF as blocking; first fix (custom lookup only) still let IP-literal hosts through — verified `http://127.0.0.1:8080/` reached our own API and returned 404 until the synchronous literal check was added.

# Serializing long-running per-row work (scan locking)

`pg_advisory_xact_lock(...)` run via a standalone `db.execute(...)` **does nothing** — a transaction-scoped advisory lock is released the instant that implicit single-statement transaction ends, so the lock is gone before the rest of the job runs. Session-level advisory locks need the same pooled connection for lock+unlock, which drizzle/postgres-js pooling does not guarantee across separate `db.execute` calls.

**Pattern that works (pool-safe, no long-held transaction/connection during slow external HTTP + LLM calls):** an **atomic conditional-UPDATE claim** on a status column:
- `UPDATE ... SET status='scanning', lastCheckedAt=now WHERE id=? AND (status<>'scanning' OR lastCheckedAt IS NULL OR lastCheckedAt < staleThreshold) RETURNING id`.
- Empty result ⇒ another run holds the claim ⇒ return early. Postgres re-evaluates the WHERE against the row after taking the row lock, so exactly one concurrent caller wins.
- Include a **stale-timeout reclaim** (e.g. 2 min) so a crashed run (SIGKILL before the final status update) doesn't block the row forever.

**Why:** holding a DB transaction open across multi-second external HTTP + Claude calls risks `idle_in_transaction_session_timeout` kills and connection-pool exhaustion; the status-claim avoids holding any connection during the slow work.
