// @polsia:framework-owned - DO NOT EDIT. Code installed by polsia/modules/better-auth@0.3.0. Drift = commit rejected.
//
// better-auth React client (v1.6.x). Client-safe: NO server secrets, NO
// server-only imports — safe to import from 'use client' components. baseURL
// comes from the client-scoped NEXT_PUBLIC_APP_URL in @/lib/env; the auth
// endpoints are mounted at /api/auth/* by the catch-all route handler.
// Includes adminClient so session.user.role is inferred and admin permission
// helpers are available to client UI. Server-side enforcement still belongs in
// route handlers and server helpers.

import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { env } from '@/lib/env';

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
