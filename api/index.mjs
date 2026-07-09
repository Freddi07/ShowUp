// Vercel serverless function.
//
// Re-exports the prebuilt, self-contained Express app bundle produced by the
// api-server's esbuild (`pnpm --filter @workspace/api-server run build`, run as
// part of `vercel-build`). The bundle inlines all workspace packages and app
// code, so no monorepo/TypeScript resolution happens at deploy time.
//
// An Express app is a valid Node request handler, so Vercel invokes this
// default export directly. vercel.json rewrites every `/api/*` request here.
export { default } from "../artifacts/api-server/dist/serverless.mjs";
