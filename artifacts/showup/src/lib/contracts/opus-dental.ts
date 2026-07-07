import { z } from 'zod';

export const OpusDentalUploadResponseSchema = z.object({
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

export type OpusDentalUploadResponse = z.infer<typeof OpusDentalUploadResponseSchema>;

// CSV row expected columns
export const OpusDentalRowSchema = z.object({
  Navn: z.string().min(1, 'Navn er påkrevd'),
  Telefon: z.string().optional(),
  Dato: z.string().min(1, 'Dato er påkrevd'),
  Klokkeslett: z.string().optional(),
});

export type OpusDentalRow = z.infer<typeof OpusDentalRowSchema>;

// Opus Dental status response
export const OpusDentalStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastUploadAt: z.string().nullable(),
  appointmentCount: z.number(),
});

export type OpusDentalStatusResponse = z.infer<typeof OpusDentalStatusResponseSchema>;
