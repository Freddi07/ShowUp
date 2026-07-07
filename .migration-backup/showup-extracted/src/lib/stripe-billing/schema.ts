// @polsia:framework-owned - DO NOT EDIT. Code installed by polsia/modules/stripe-billing@0.1.0. Drift = commit rejected.
//
// Shared schemas for Polsia-managed Stripe billing results. Safe to import from
// client components: this file has no server-only imports and does not expose
// secrets or Stripe SDK code.

import { z } from 'zod';

export const checkoutSessionQuerySchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
});

export const verifiedPaymentSchema = z.object({
  amount_usd: z.number(),
  customer_email: z.string().email().nullable().optional(),
  product_name: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
});

export const checkoutVerificationResultSchema = z.object({
  verified: z.boolean(),
  payment: verifiedPaymentSchema.optional(),
  error: z.string().optional(),
});

export const subscriptionStatusResultSchema = z.object({
  active: z.boolean(),
  plan: z.string().optional(),
  monthly_amount: z.number().optional(),
  current_period_end: z.string().nullable().optional(),
  customer_email: z.string().email().optional(),
  error: z.string().optional(),
});

export type CheckoutVerificationResult = z.infer<typeof checkoutVerificationResultSchema>;
export type SubscriptionStatusResult = z.infer<typeof subscriptionStatusResultSchema>;
