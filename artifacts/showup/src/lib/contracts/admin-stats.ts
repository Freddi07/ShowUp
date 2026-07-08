import { z } from 'zod';

export const AdminStatsResponse = z.object({
  totalUsers: z.number(),
  bannedUsers: z.number(),
  newUsers7d: z.number(),
  activeSubscriptions: z.number(),
  trialingUsers: z.number(),
  totalCustomers: z.number(),
  totalAppointments: z.number(),
  appointmentsByStatus: z.object({
    PENDING: z.number(),
    REMINDED: z.number(),
    CONFIRMED: z.number(),
    CANCELLED: z.number(),
    RESCHEDULE_REQUESTED: z.number(),
  }),
});
export type AdminStatsResponse = z.infer<typeof AdminStatsResponse>;
