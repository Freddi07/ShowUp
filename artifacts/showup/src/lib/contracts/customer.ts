import { z } from 'zod';

export const CustomerCreate = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});
export type CustomerCreate = z.infer<typeof CustomerCreate>;

export const CustomerItem = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  source: z.string().nullable(),
  externalId: z.string().nullable(),
  appointmentCount: z.number(),
  lastVisitAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CustomerItem = z.infer<typeof CustomerItem>;

export const CustomerList = z.object({
  items: z.array(CustomerItem),
  // Total customers for the user (unfiltered) + plan limit (null = unlimited).
  total: z.number().optional(),
  limit: z.number().nullable().optional(),
});
export type CustomerList = z.infer<typeof CustomerList>;

export const AppointmentSummary = z.object({
  id: z.string(),
  scheduledAt: z.string(),
  reminderAt: z.string(),
  status: z.string(),
  clientName: z.string(),
  clientPhone: z.string().nullable(),
  twilioSid: z.string().nullable(),
});
export type AppointmentSummary = z.infer<typeof AppointmentSummary>;

/** Shape returned by the appointment create/edit/remind endpoints. */
export const AppointmentMutation = z.object({
  id: z.string(),
  scheduledAt: z.string(),
  reminderAt: z.string(),
  status: z.string(),
  clientName: z.string(),
  clientPhone: z.string().nullable(),
  twilioSid: z.string().nullable(),
});
export type AppointmentMutation = z.infer<typeof AppointmentMutation>;

export const CustomerDetail = CustomerItem.extend({
  appointments: z.array(AppointmentSummary),
});
export type CustomerDetail = z.infer<typeof CustomerDetail>;
