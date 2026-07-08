import { z } from 'zod';

export const TrialStatusSchema = z.object({
  trialActive: z.boolean(),
  trialEndsAt: z.string().nullable(),
  paymentMethodCollected: z.boolean(),
  subscriptionStatus: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
});

export const BillingVerifyResponseSchema = z.object({
  verified: z.boolean(),
  plan: z.string().optional(),
});

export type TrialStatus = z.infer<typeof TrialStatusSchema>;
export type BillingVerifyResponse = z.infer<typeof BillingVerifyResponseSchema>;
