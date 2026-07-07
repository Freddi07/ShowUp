import { z } from 'zod';

export const KontoProfile = z.object({
  name: z.string().nullable(),
  email: z.string(),
  businessType: z.string().nullable(),
  phone: z.string().nullable(),
});
export type KontoProfile = z.infer<typeof KontoProfile>;

export const KontoPatch = z.object({
  phone: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
});
export type KontoPatch = z.infer<typeof KontoPatch>;
