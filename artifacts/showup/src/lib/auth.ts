// Stub — server-side auth is handled by the API server.
// The frontend uses auth-client.ts (better-auth/react) for session management.
// This stub prevents Vite from failing if this file is transitively imported.

export const auth = {
  api: {
    getSession: async () => null as null,
    handler: async () => new Response('Not implemented', { status: 501 }),
  },
};
