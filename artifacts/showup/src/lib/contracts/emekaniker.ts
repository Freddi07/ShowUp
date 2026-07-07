import { z } from 'zod';

export const EmekanikerUploadResponseSchema = z.object({
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

export const EmekanikerStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastUploadAt: z.string().nullable(),
  appointmentCount: z.number(),
});

export type EmekanikerUploadResponse = z.infer<typeof EmekanikerUploadResponseSchema>;
export type EmekanikerStatusResponse = z.infer<typeof EmekanikerStatusResponseSchema>;
