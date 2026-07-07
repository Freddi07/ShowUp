import { z } from 'zod';

export const VismaCredentialsSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  integrationId: z.string().optional(),
});

export const VismaContactSchema = z.object({
  customerId: z.string(),
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const VismaContactListSchema = z.object({
  Data: z.array(VismaContactSchema).optional(),
  data: z.array(VismaContactSchema).optional(),
});

export const VismaConnectResponseSchema = z.object({
  redirectUrl: z.string(),
});

export const VismaStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type VismaCredentials = z.infer<typeof VismaCredentialsSchema>;
export type VismaContact = z.infer<typeof VismaContactSchema>;
export type VismaConnectResponse = z.infer<typeof VismaConnectResponseSchema>;
export type VismaStatusResponse = z.infer<typeof VismaStatusResponseSchema>;
