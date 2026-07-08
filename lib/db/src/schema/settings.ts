import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notificationSettingsTable = pgTable(
  "NotificationSettings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().unique(),
    remind48h: boolean("remind48h").notNull().default(false),
    remind24h: boolean("remind24h").notNull().default(true),
    remind2h: boolean("remind2h").notNull().default(false),
    channelSms: boolean("channelSms").notNull().default(true),
    channelEmail: boolean("channelEmail").notNull().default(false),
    autoFollowUp: boolean("autoFollowUp").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("NotificationSettings_userId_idx").on(t.userId)],
);

export const pushTokenTable = pgTable(
  "PushToken",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    token: text("token").notNull().unique(),
    platform: text("platform"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("PushToken_userId_idx").on(t.userId)],
);

export const passwordResetTokenTable = pgTable("password_reset_token", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type NotificationSettings = typeof notificationSettingsTable.$inferSelect;
export type InsertNotificationSettings = typeof notificationSettingsTable.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokenTable.$inferSelect;
export type PushToken = typeof pushTokenTable.$inferSelect;
export type InsertPushToken = typeof pushTokenTable.$inferInsert;
