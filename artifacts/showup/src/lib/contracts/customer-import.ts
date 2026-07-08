import { z } from 'zod';

export const CustomerImportResult = z.object({
  imported: z.number(),
  updated: z.number(),
  skipped: z.number(),
  appointmentsCreated: z.number(),
});
export type CustomerImportResult = z.infer<typeof CustomerImportResult>;
