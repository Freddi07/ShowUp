// Client-side stub — server-only admin auth removed for Vite.
// Use useSession() from @/lib/auth-client and check role client-side.

export type { SessionUser } from '@/lib/require-auth';

/** @deprecated Check session.user.role in client components */
export async function requireAdmin(_req?: Request): Promise<import('@/lib/require-auth').SessionUser> {
  throw Response.json({ error: 'Forbidden' }, { status: 403 });
}

/** @deprecated Check session.user.role in client components */
export async function getAdminUser(): Promise<import('@/lib/require-auth').SessionUser | null> {
  return null;
}
