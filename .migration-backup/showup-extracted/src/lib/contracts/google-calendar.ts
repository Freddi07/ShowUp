import { z } from 'zod';

export const GoogleCalendarConnectResponseSchema = z.object({ redirectUrl: z.string() });

export const GoogleCalendarStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  appointmentCount: z.number(),
});

export type GoogleCalendarConnectResponse = z.infer<typeof GoogleCalendarConnectResponseSchema>;
export type GoogleCalendarStatusResponse = z.infer<typeof GoogleCalendarStatusResponseSchema>;
