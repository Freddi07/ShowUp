// Client-side stub — server-only auth (next/headers) removed for Vite.
// Use useSession() from @/lib/auth-client for client-side auth checks.
// Server-side auth is handled by the Express API server.

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** @deprecated Use useSession() from @/lib/auth-client in client components */
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}

/** @deprecated Use useSession() from @/lib/auth-client in client components */
export async function requireAuth(_req?: Request): Promise<SessionUser> {
  throw Response.json({ error: 'Unauthorized' }, { status: 401 });
}
