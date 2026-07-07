import { z } from 'zod';

export const AutomasterUploadResponseSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z
    .array(
      z.object({
        row: z.number(),
        message: z.string(),
      }),
    )
    .optional(),
});

export const AutomasterStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastUploadAt: z.string().nullable(),
  appointmentCount: z.number(),
});

export type AutomasterUploadResponse = z.infer<typeof AutomasterUploadResponseSchema>;
export type AutomasterStatusResponse = z.infer<typeof AutomasterStatusResponseSchema>;
