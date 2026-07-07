// Stripe Checkout payment link — set NEXT_PUBLIC_SIGNUP_CHECKOUT_URL at build time.
// Create the link via the Stripe MCP (create_payment_link) with:
//   success_url: https://showup-8.polsia.app/signup/payment?session_id={CHECKOUT_SESSION_ID}
//   trial_period_days: 14
export const SIGNUP_CHECKOUT_URL: string = process.env.NEXT_PUBLIC_SIGNUP_CHECKOUT_URL ?? '';
