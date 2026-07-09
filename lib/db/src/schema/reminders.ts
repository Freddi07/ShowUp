import {
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { appointmentTable } from "./customers";

/**
 * A single scheduled automatic reminder for an appointment.
 *
 * When an appointment is created (manually or via an integration), one row is
 * enqueued per enabled reminder offset (48h / 24h / 2h) from the owner's
 * NotificationSettings, with `sendAt` set to the moment it should fire. The
 * reminder scheduler polls this table, atomically claims due rows, sends on the
 * enabled channels (SMS / e-mail) and records the outcome. The unique
 * (appointmentId, offsetLabel) constraint makes enqueueing idempotent so the
 * same reminder is never scheduled — or sent — twice.
 */
export const scheduledReminderTable = pgTable(
  "ScheduledReminder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    appointmentId: text("appointmentId")
      .notNull()
      .references(() => appointmentTable.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    /** Which offset this reminder represents: "48h" | "24h" | "2h". */
    offsetLabel: text("offsetLabel").notNull(),
    /** When this reminder should be sent. */
    sendAt: timestamp("sendAt").notNull(),
    /** PENDING | SENDING | SENT | FAILED | SKIPPED */
    status: text("status").notNull().default("PENDING"),
    /** Per-channel send result, e.g. { sms: "<sid>", email: "<id>" }. Never tokens. */
    channels: json("channels"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("lastError"),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("ScheduledReminder_appointmentId_offsetLabel_key").on(
      t.appointmentId,
      t.offsetLabel,
    ),
    index("ScheduledReminder_status_sendAt_idx").on(t.status, t.sendAt),
    index("ScheduledReminder_appointmentId_idx").on(t.appointmentId),
  ],
);

export type ScheduledReminder = typeof scheduledReminderTable.$inferSelect;
export type InsertScheduledReminder =
  typeof scheduledReminderTable.$inferInsert;
