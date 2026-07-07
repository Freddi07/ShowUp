import { z } from 'zod';

export const AppointmentStatusSchema = z.enum([
  'PENDING',
  'REMINDED',
  'CONFIRMED',
  'CANCELLED',
  'RESCHEDULE_REQUESTED',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const AppointmentCreate = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  scheduledAt: z.string().datetime(),
  reminderAt: z.string().datetime(),
});
export type AppointmentCreate = z.infer<typeof AppointmentCreate>;

export const AppointmentItem = AppointmentCreate.extend({
  id: z.string(),
  status: AppointmentStatusSchema,
  twilioSid: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AppointmentItem = z.infer<typeof AppointmentItem>;

export const AppointmentList = z.object({
  items: z.array(AppointmentItem),
});
export type AppointmentList = z.infer<typeof AppointmentList>;
