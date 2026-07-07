import { z } from 'zod';

export const StatsPeriod = z.object({
  sent: z.number(),
  confirmed: z.number(),
  cancelled: z.number(),
  rescheduleRequested: z.number(),
  noResponse: z.number(),
});
export type StatsPeriod = z.infer<typeof StatsPeriod>;

export const StatsRow = z.object({
  date: z.string(),
  sent: z.number(),
});
export type StatsRow = z.infer<typeof StatsRow>;

export const StatsResponse = z.object({
  last7d: StatsPeriod,
  last30d: StatsPeriod,
  total: StatsPeriod,
  dailySeries: z.array(StatsRow),
});
export type StatsResponse = z.infer<typeof StatsResponse>;
