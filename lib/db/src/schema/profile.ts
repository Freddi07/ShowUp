import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userProfileTable = pgTable(
  "UserProfile",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().unique(),
    businessType: text("businessType"),
    // Onboarding wizard state. `onboardingCompleted` gates the first-run wizard;
    // `enabledSections` is a JSON array of optional dashboard section keys the
    // user chose to show (null = not onboarded / show everything).
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    enabledSections: text("enabledSections"),
    phone: text("phone"),
    trialStartDate: timestamp("trialStartDate").notNull(),
    trialEndsAt: timestamp("trialEndsAt").notNull(),
    stripeCustomerId: text("stripeCustomerId"),
    stripePaymentMethodId: text("stripePaymentMethodId"),
    paymentMethodCollected: boolean("paymentMethodCollected").notNull().default(false),
    subscriptionStatus: text("subscriptionStatus"),
    // Subscription tier: 'starter' | 'pro' | 'business'. Null while on trial or
    // with no active plan. Set from the Stripe product at checkout verify.
    plan: text("plan"),
    // Per-user ingest API key for automatically adding customers from external
    // platforms (Zapier/Make/webhooks). Null until the user generates one.
    apiKey: text("apiKey").unique(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("UserProfile_userId_idx").on(t.userId)],
);

export type UserProfile = typeof userProfileTable.$inferSelect;
export type InsertUserProfile = typeof userProfileTable.$inferInsert;
