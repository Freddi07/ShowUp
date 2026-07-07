import { z } from 'zod';

export const MicrosoftOutlookConnectResponseSchema = z.object({ redirectUrl: z.string() });

export const MicrosoftOutlookStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  appointmentCount: z.number(),
});

export type MicrosoftOutlookConnectResponse = z.infer<typeof MicrosoftOutlookConnectResponseSchema>;
export type MicrosoftOutlookStatusResponse = z.infer<typeof MicrosoftOutlookStatusResponseSchema>;
