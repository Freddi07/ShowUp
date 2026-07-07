import { z } from 'zod';

export const FikenCredentialsSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  companySlug: z.string(),
  integrationId: z.string().optional(),
});

export const FikenContactSchema = z.object({
  contactId: z.number(),
  name: z.string().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isCustomer: z.boolean().optional(),
});

export const FikenCompanySchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const FikenConnectResponseSchema = z.object({
  redirectUrl: z.string(),
});

export const FikenStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type FikenCredentials = z.infer<typeof FikenCredentialsSchema>;
export type FikenContact = z.infer<typeof FikenContactSchema>;
export type FikenCompany = z.infer<typeof FikenCompanySchema>;
export type FikenConnectResponse = z.infer<typeof FikenConnectResponseSchema>;
export type FikenStatusResponse = z.infer<typeof FikenStatusResponseSchema>;
