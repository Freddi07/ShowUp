// Serverless entry for the Express API (used by Vercel).
//
// Unlike src/index.ts (the long-running server), this module does NOT call
// app.listen() or initStripe(). Vercel functions are ephemeral request
// handlers, so there is no port to bind and no place for a background sync
// loop. The Express app is exported directly as the request handler; real-time
// Stripe updates still arrive through the /api/stripe/webhook route.
import app from "./app";

export default app;
