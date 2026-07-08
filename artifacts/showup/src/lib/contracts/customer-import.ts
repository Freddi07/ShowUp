import { z } from 'zod';

export const CustomerImportResult = z.object({
  imported: z.number(),
  updated: z.number(),
  skipped: z.number(),
  appointmentsCreated: z.number(),
  // True when the plan's customer limit stopped some new customers being added.
  limitReached: z.boolean().optional(),
});
export type CustomerImportResult = z.infer<typeof CustomerImportResult>;
