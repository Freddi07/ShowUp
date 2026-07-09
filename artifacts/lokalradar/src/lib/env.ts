/**
 * Frontend environment variables for the Vite/React client.
 * Server-side secrets live in the API server only.
 *
 * NEXT_PUBLIC_* names are preserved for compatibility with better-auth's
 * client and any shared components. Map to VITE_* in your .env file.
 */
export const env = {
  NEXT_PUBLIC_APP_URL:
    (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin,
  NEXT_PUBLIC_API_URL: (import.meta.env.VITE_API_URL as string | undefined) ?? '',
} as const;
