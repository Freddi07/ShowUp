import { z } from 'zod';

export const FreshaCustomerSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  })
  .passthrough();

export const FreshaAppointmentSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    starts_at: z.string().optional(),
    service_name: z.string().optional(),
    staff_name: z.string().optional(),
    client: FreshaCustomerSchema.optional(),
    client_id: z.union([z.string(), z.number()]).nullable().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const FreshaAppointmentListSchema = z
  .object({
    data: z.array(FreshaAppointmentSchema),
  })
  .passthrough();

export const FreshaWebhookEventSchema = z
  .object({
    event_type: z.string(),
    data: FreshaAppointmentSchema.optional(),
  })
  .passthrough();

export const FreshaConnectResponseSchema = z.object({
  success: z.boolean(),
  provider: z.literal('fresha'),
});

export const FreshaStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type FreshaAppointment = z.infer<typeof FreshaAppointmentSchema>;
export type FreshaWebhookEvent = z.infer<typeof FreshaWebhookEventSchema>;
export type FreshaConnectResponse = z.infer<typeof FreshaConnectResponseSchema>;
export type FreshaStatusResponse = z.infer<typeof FreshaStatusResponseSchema>;
