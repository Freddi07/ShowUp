import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const passwordResetTokenTable = pgTable("password_reset_token", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokenTable.$inferSelect;
