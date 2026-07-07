/**
 * Frontend environment variables for the Vite/React client.
 * Server-side secrets (Twilio, Stripe secret, DB, etc.) live in the API server only.
 *
 * NEXT_PUBLIC_* names are preserved for backward compatibility with existing
 * components that reference them. Map to VITE_* in your .env file:
 *   VITE_APP_URL=https://...
 *   VITE_API_URL=/api
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_...
 */
export const env = {
  NEXT_PUBLIC_APP_URL:
    (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin,
  NEXT_PUBLIC_API_URL:
    (import.meta.env.VITE_API_URL as string | undefined) ?? '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '',
} as const;
