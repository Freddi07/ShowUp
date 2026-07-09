// better-auth React client. Client-safe: NO server secrets. The auth endpoints
// are mounted at /api/auth/* on the shared API server, which is reached at the
// same origin as this app through Replit's path-based proxy.
import { createAuthClient } from 'better-auth/react';
import { env } from '@/lib/env';

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
