// Admin access is restricted to a single owner email.
// Keep this in sync with the backend ADMIN_EMAILS env (default below).
export const ADMIN_EMAIL: string = (
  import.meta.env.VITE_ADMIN_EMAIL ?? 'snillefredrik@gmail.com'
).toLowerCase();

export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
