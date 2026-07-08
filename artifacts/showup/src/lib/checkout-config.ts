// Stripe Checkout payment links — set the VITE_* vars below at build time.
// Each link is a Stripe Payment Link created with a 14-day trial and
//   success_url: <app>/signup/payment?session_id={CHECKOUT_SESSION_ID}
// Regenerate them with: pnpm --filter @workspace/scripts run seed-stripe

export type PlanId = 'starter' | 'pro' | 'business';

// Starter link doubles as the signup checkout link.
export const SIGNUP_CHECKOUT_URL: string =
  import.meta.env.VITE_SIGNUP_CHECKOUT_URL ?? '';

export const PLAN_CHECKOUT_URLS: Record<PlanId, string> = {
  starter: import.meta.env.VITE_CHECKOUT_URL_STARTER ?? '',
  pro: import.meta.env.VITE_CHECKOUT_URL_PRO ?? '',
  business: import.meta.env.VITE_CHECKOUT_URL_BUSINESS ?? '',
};

/**
 * Binds a checkout URL to the authenticated user so the server can verify
 * ownership (see POST /api/billing/verify). Payment Links accept
 * client_reference_id and prefilled_email as query parameters.
 * Returns '' if no base URL is configured.
 */
export function withCheckoutBinding(
  url: string,
  userId: string,
  email?: string | null,
): string {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return (
    `${url}${sep}client_reference_id=${encodeURIComponent(userId)}` +
    (email ? `&prefilled_email=${encodeURIComponent(email)}` : '')
  );
}
