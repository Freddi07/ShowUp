import { index, pgEnum, pgTable, text, timestamp, json, unique } from "drizzle-orm/pg-core";

export const integrationProviderEnum = pgEnum("IntegrationProvider", [
  "google_calendar",
  "microsoft_outlook",
  "fresha",
  "opus_dental",
  "tripletex",
  "booksy",
  "automaster",
  "emekaniker",
  "visma",
  "fiken",
  "cliniko",
  // Booking-source providers added for the integrations foundation.
  "generic_webhook",
  "timma",
  "onlinebooq",
  "calendly",
]);
export type IntegrationProvider = (typeof integrationProviderEnum.enumValues)[number];

export const integrationStatusEnum = pgEnum("IntegrationStatus", [
  "connected",
  "disconnected",
  "error",
  "syncing",
]);
export type IntegrationStatus = (typeof integrationStatusEnum.enumValues)[number];

export const integrationTable = pgTable(
  "Integration",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    status: integrationStatusEnum("status").notNull().default("disconnected"),
    credentialsEncrypted: text("credentialsEncrypted").notNull().default(""),
    /** External account/resource id (e.g. calendar id). Non-secret. */
    externalAccountId: text("externalAccountId"),
    /** Last sync/connection error message shown in the dashboard (non-secret). */
    lastError: text("lastError"),
    lastSyncedAt: timestamp("lastSyncedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("Integration_userId_provider_key").on(t.userId, t.provider),
    index("Integration_userId_idx").on(t.userId),
    index("Integration_status_idx").on(t.status),
  ],
);

export const syncedAppointmentTable = pgTable(
  "SyncedAppointment",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    integrationId: text("integrationId")
      .notNull()
      .references(() => integrationTable.id, { onDelete: "cascade" }),
    externalId: text("externalId").notNull(),
    appointmentData: json("appointmentData").notNull(),
    syncedAt: timestamp("syncedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("SyncedAppointment_integrationId_externalId_key").on(t.integrationId, t.externalId),
    index("SyncedAppointment_userId_idx").on(t.userId),
    index("SyncedAppointment_integrationId_idx").on(t.integrationId),
  ],
);

export type Integration = typeof integrationTable.$inferSelect;
export type SyncedAppointment = typeof syncedAppointmentTable.$inferSelect;
