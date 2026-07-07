import { z } from 'zod';

export const IntegrationProviderSchema = z.enum([
  'google_calendar',
  'microsoft_outlook',
  'fresha',
  'opus_dental',
  'tripletex',
  'booksy',
  'automaster',
  'emekaniker',
  'visma',
  'fiken',
  'cliniko',
]);

export const IntegrationStatusSchema = z.enum(['connected', 'disconnected', 'error', 'syncing']);

export const IntegrationRowSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  status: IntegrationStatusSchema,
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const IntegrationConnectResponseSchema = z.object({
  success: z.boolean(),
  provider: IntegrationProviderSchema,
});

export const IntegrationStatusResponseSchema = z.object({
  connected: z.boolean(),
  status: IntegrationStatusSchema,
  lastSyncedAt: z.string().nullable(),
});

export const IntegrationSyncResponseSchema = z.object({
  synced: z.number(),
});

export type IntegrationRow = z.infer<typeof IntegrationRowSchema>;
export type IntegrationConnectResponse = z.infer<typeof IntegrationConnectResponseSchema>;
export type IntegrationStatusResponse = z.infer<typeof IntegrationStatusResponseSchema>;
export type IntegrationSyncResponse = z.infer<typeof IntegrationSyncResponseSchema>;
