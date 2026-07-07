import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appointmentStatusEnum = pgEnum("AppointmentStatus", [
  "PENDING",
  "REMINDED",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULE_REQUESTED",
]);
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];

export const customerTable = pgTable(
  "Customer",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId"),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    externalId: text("externalId"),
    source: text("source"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("Customer_userId_idx").on(t.userId),
    index("Customer_externalId_idx").on(t.externalId),
    index("Customer_source_idx").on(t.source),
  ],
);

export const appointmentTable = pgTable(
  "Appointment",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientName: text("clientName").notNull(),
    clientPhone: text("clientPhone").notNull(),
    scheduledAt: timestamp("scheduledAt").notNull(),
    reminderAt: timestamp("reminderAt").notNull(),
    status: appointmentStatusEnum("status").notNull().default("PENDING"),
    twilioSid: text("twilioSid"),
    customerId: text("customerId").references(() => customerTable.id),
    externalId: text("externalId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("Appointment_status_reminderAt_idx").on(t.status, t.reminderAt),
    index("Appointment_customerId_idx").on(t.customerId),
    index("Appointment_externalId_idx").on(t.externalId),
  ],
);

export type Customer = typeof customerTable.$inferSelect;
export type InsertCustomer = typeof customerTable.$inferInsert;
export type Appointment = typeof appointmentTable.$inferSelect;
export type InsertAppointment = typeof appointmentTable.$inferInsert;
