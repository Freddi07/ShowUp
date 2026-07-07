import { z } from 'zod';

export const TripletexCustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  customerNumber: z.string().nullable(),
});

export const TripletexAppointmentSchema = z.object({
  id: z.number(),
  date: z.string(),
  customerId: z.number().nullable(),
  description: z.string().nullable(),
  duration: z.number().nullable(),
  appointmentType: z.string().nullable(),
});

export const TripletexCustomerListSchema = z.object({
  fullResultSize: z.number(),
  value: z.array(TripletexCustomerSchema),
});

export const TripletexAppointmentListSchema = z.object({
  fullResultSize: z.number(),
  value: z.array(TripletexAppointmentSchema),
});

export type TripletexCustomer = z.infer<typeof TripletexCustomerSchema>;
export type TripletexAppointment = z.infer<typeof TripletexAppointmentSchema>;
export type TripletexCustomerList = z.infer<typeof TripletexCustomerListSchema>;
export type TripletexAppointmentList = z.infer<typeof TripletexAppointmentListSchema>;

// API response shapes
export const TripletexConnectResponseSchema = z.object({
  success: z.boolean(),
  provider: z.literal('tripletex'),
});

export const TripletexSyncResponseSchema = z.object({
  synced: z.number(),
});

export const TripletexStatusResponseSchema = z.object({
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  customerCount: z.number(),
});

export type TripletexConnectResponse = z.infer<typeof TripletexConnectResponseSchema>;
export type TripletexSyncResponse = z.infer<typeof TripletexSyncResponseSchema>;
export type TripletexStatusResponse = z.infer<typeof TripletexStatusResponseSchema>;
