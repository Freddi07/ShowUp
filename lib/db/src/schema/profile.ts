import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userProfileTable = pgTable(
  "UserProfile",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().unique(),
    businessType: text("businessType"),
    phone: text("phone"),
    trialStartDate: timestamp("trialStartDate").notNull(),
    trialEndsAt: timestamp("trialEndsAt").notNull(),
    stripeCustomerId: text("stripeCustomerId"),
    stripePaymentMethodId: text("stripePaymentMethodId"),
    paymentMethodCollected: boolean("paymentMethodCollected").notNull().default(false),
    subscriptionStatus: text("subscriptionStatus"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("UserProfile_userId_idx").on(t.userId)],
);

export type UserProfile = typeof userProfileTable.$inferSelect;
export type InsertUserProfile = typeof userProfileTable.$inferInsert;
