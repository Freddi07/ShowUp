import { z } from 'zod';

export const FakturaItem = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  invoicePdf: z.string().nullable(),
});
export type FakturaItem = z.infer<typeof FakturaItem>;

export const FakturaList = z.object({
  items: z.array(FakturaItem),
});
export type FakturaList = z.infer<typeof FakturaList>;
