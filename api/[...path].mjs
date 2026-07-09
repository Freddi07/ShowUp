// Vercel serverless function (catch-all).
//
// This filename ([...path]) makes Vercel route EVERY `/api/*` request to this
// one function while preserving the original request URL (e.g.
// `/api/lokalradar/overview`, `/api/stripe/webhook`). That matters because the
// Express app matches concrete paths mounted under `/api`, so the full path
// must reach it unchanged.
//
// It re-exports the prebuilt, self-contained Express app bundle produced by the
// api-server's esbuild (`pnpm --filter @workspace/api-server run build`, run as
// part of `vercel-build`). The bundle inlines all workspace packages and app
// code, so no monorepo/TypeScript resolution happens at deploy time.
//
// An Express app is a valid Node request handler, so Vercel invokes this
// default export directly.
export { default } from "../artifacts/api-server/dist/serverless.mjs";
