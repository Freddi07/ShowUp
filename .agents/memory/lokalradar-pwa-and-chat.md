---
name: LokalRadar PWA + AI advisor chat
description: Base-path PWA asset rule under Vite, and the LokalRadar streaming advisor chat design
---

# LokalRadar PWA under a proxied sub-path (`/lokalradar/`)

**Rule:** In `index.html`, reference public PWA assets (manifest, apple-touch-icon)
with **plain root-relative paths** (`/manifest.webmanifest`, `/apple-touch-icon.png`)
— NOT `%BASE_URL%...`.

**Why:** Vite rebases root-relative URLs in `index.html` by prepending `base`
(the same mechanism that makes `<link href="/favicon.svg">` work). Using
`%BASE_URL%manifest.webmanifest` gets the base applied *twice* →
`/lokalradar/lokalradar/manifest.webmanifest` (404 in dev and prod). Verified by
curling the served HTML: root-relative correctly resolves to
`/lokalradar/manifest.webmanifest`.

**How to apply:** For any Vite app hosted under a base path, manifest/icon links in
index.html = root-relative. But the **service worker registration in JS** must use
`import.meta.env.BASE_URL` (e.g. `` `${BASE_URL}sw.js` `` with `scope: BASE_URL`) —
JS is not run through the HTML rebasing, so it needs the base explicitly. Register
the SW only under `import.meta.env.PROD` (a dev SW breaks Vite HMR / serves stale
modules), so installability is only testable on the published build.

# LokalRadar AI advisor chat

- One rolling conversation per user in `LokalChatMessage` (userId/role/content/createdAt).
  Endpoints under `/api/lokalradar/chat`: `GET /messages`, `POST /` (SSE stream),
  `POST /reset`. Uses SSE via direct `fetch` (generated orval hooks can't stream);
  history load + reset use plain `apiFetch`. No OpenAPI/codegen changes needed.
- Prune stored rows to the last N (100) after each assistant turn — the history
  *limit* sent to Claude does not bound *storage*; without pruning, per-user rows
  grow unbounded. (Flagged in code review.)
- System prompt is built from the tenant's real data (business profile, competitor
  latest web/reviews snapshots, recent alerts, own review stats) and instructs the
  model to answer in Norwegian and never invent competitor facts. Mirror the SSE
  pattern from `artifacts/showup/.../assistant-widget.tsx` (start/text/done/error).
- Wrap the client-side per-frame `JSON.parse` in try/catch and skip malformed
  frames so one bad chunk doesn't break the stream.

# Live alerts

- No websockets/Realtime — Varsler + dashboard use React Query `refetchInterval`
  (30s). The generated `useGetLokalOverview` hook requires a `queryKey` when you
  pass a `query` options object (use `getGetLokalOverviewQueryKey()`).
