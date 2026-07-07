import { z } from 'zod';

export const BooksyCustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const BooksyAppointmentSchema = z.object({
  id: z.number(),
  date: z.string(),
  time: z.string().optional(),
  status: z.string().optional(),
  client: BooksyCustomerSchema.optional(),
  client_id: z.number().nullable().optional(),
});

export const BooksyAppointmentListSchema = z.object({
  data: z.array(BooksyAppointmentSchema),
});

export const BooksyConnectResponseSchema = z.object({
  success: z.boolean(),
  provider: z.literal('booksy'),
});

export const BooksyStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type BooksyCustomer = z.infer<typeof BooksyCustomerSchema>;
export type BooksyAppointment = z.infer<typeof BooksyAppointmentSchema>;
export type BooksyConnectResponse = z.infer<typeof BooksyConnectResponseSchema>;
export type BooksyStatusResponse = z.infer<typeof BooksyStatusResponseSchema>;
