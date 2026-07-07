import { z } from 'zod';
import { AppointmentStatusSchema } from './appointment';

export const SvarStatusFilter = z.enum([
  'all',
  'CONFIRMED',
  'CANCELLED',
  'RESCHEDULE_REQUESTED',
  'REMINDED',
]);
export type SvarStatusFilter = z.infer<typeof SvarStatusFilter>;

export const SvarItem = z.object({
  id: z.string(),
  clientName: z.string(),
  clientPhone: z.string(),
  scheduledAt: z.string(),
  status: AppointmentStatusSchema,
  updatedAt: z.string(),
});
export type SvarItem = z.infer<typeof SvarItem>;

export const SvarList = z.object({
  items: z.array(SvarItem),
  total: z.number(),
});
export type SvarList = z.infer<typeof SvarList>;

export const SvarPatch = z.object({
  status: AppointmentStatusSchema.optional(),
  action: z.enum(['update_status', 'send_followup']).optional(),
});
export type SvarPatch = z.infer<typeof SvarPatch>;
