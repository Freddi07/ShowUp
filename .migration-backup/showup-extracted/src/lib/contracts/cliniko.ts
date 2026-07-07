import { z } from 'zod';

export const ClinikoPatientSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const ClinikoAppointmentSchema = z.object({
  id: z.number(),
  starts_at: z.string(),
  ends_at: z.string().optional(),
  patient_id: z.number().nullable().optional(),
  appointment_type: z.object({ name: z.string() }).optional(),
  cancellation_note: z.string().nullable().optional(),
});

export const ClinikoAppointmentListSchema = z.object({
  appointments: z.array(ClinikoAppointmentSchema),
  links: z.object({ next: z.string().optional() }).optional(),
});

export const ClinikoConnectResponseSchema = z.object({
  success: z.boolean(),
  provider: z.literal('cliniko'),
});

export const ClinikoStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type ClinikoPatient = z.infer<typeof ClinikoPatientSchema>;
export type ClinikoAppointment = z.infer<typeof ClinikoAppointmentSchema>;
export type ClinikoConnectResponse = z.infer<typeof ClinikoConnectResponseSchema>;
export type ClinikoStatusResponse = z.infer<typeof ClinikoStatusResponseSchema>;
