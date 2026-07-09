import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * LokalRadar schema. All tables are user-scoped (userId references the shared
 * better-auth user). Kept in its own module so the BookPling (showup) tables
 * stay untouched. Table names are prefixed "Lokal" to avoid any collision.
 */

export const lokalBusinessTable = pgTable(
  "LokalBusiness",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // One business profile per user.
    userId: text("userId").notNull().unique(),
    name: text("name"),
    orgNumber: text("orgNumber"),
    industry: text("industry"),
    location: text("location"),
    website: text("website"),
    googlePlaceId: text("googlePlaceId"),
    notifyEmail: boolean("notifyEmail").notNull().default(true),
    notifyInApp: boolean("notifyInApp").notNull().default(true),
    // instant | daily | weekly
    alertFrequency: text("alertFrequency").notNull().default("daily"),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    // gratis | pro | bedrift
    plan: text("plan").notNull().default("gratis"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("LokalBusiness_userId_idx").on(t.userId)],
);

export const lokalCompetitorTable = pgTable(
  "LokalCompetitor",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    website: text("website"),
    googlePlaceId: text("googlePlaceId"),
    location: text("location"),
    notes: text("notes"),
    // idle | scanning | ok | error
    status: text("status").notNull().default("idle"),
    lastError: text("lastError"),
    lastCheckedAt: timestamp("lastCheckedAt"),
    // When the most recent meaningful change was detected.
    lastChangeAt: timestamp("lastChangeAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("LokalCompetitor_userId_idx").on(t.userId)],
);

export const lokalSnapshotTable = pgTable(
  "LokalSnapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    competitorId: text("competitorId")
      .notNull()
      .references(() => lokalCompetitorTable.id),
    // web | reviews
    kind: text("kind").notNull(),
    contentHash: text("contentHash"),
    data: jsonb("data"),
    capturedAt: timestamp("capturedAt").notNull().defaultNow(),
  },
  (t) => [
    index("LokalSnapshot_competitorId_idx").on(t.competitorId),
    index("LokalSnapshot_kind_idx").on(t.kind),
  ],
);

export const lokalAlertTable = pgTable(
  "LokalAlert",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    competitorId: text("competitorId"),
    // e.g. website_change | new_review | rating_drop | marketing_tip
    type: text("type").notNull(),
    // info | warning | critical
    severity: text("severity").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("LokalAlert_userId_idx").on(t.userId),
    index("LokalAlert_read_idx").on(t.read),
  ],
);

export const lokalGenerationTable = pgTable(
  "LokalGeneration",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    // google_post | social_post | review_reply | seo_tip
    kind: text("kind").notNull(),
    channel: text("channel"),
    prompt: text("prompt"),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("LokalGeneration_userId_idx").on(t.userId)],
);

export const lokalReviewTable = pgTable(
  "LokalReview",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    competitorId: text("competitorId"),
    source: text("source"),
    author: text("author"),
    rating: integer("rating"),
    text: text("text"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("LokalReview_userId_idx").on(t.userId)],
);

export type LokalBusiness = typeof lokalBusinessTable.$inferSelect;
export type InsertLokalBusiness = typeof lokalBusinessTable.$inferInsert;
export type LokalCompetitor = typeof lokalCompetitorTable.$inferSelect;
export type InsertLokalCompetitor = typeof lokalCompetitorTable.$inferInsert;
export type LokalAlert = typeof lokalAlertTable.$inferSelect;
export type InsertLokalAlert = typeof lokalAlertTable.$inferInsert;
export type LokalGeneration = typeof lokalGenerationTable.$inferSelect;
export type LokalReview = typeof lokalReviewTable.$inferSelect;
export type LokalSnapshot = typeof lokalSnapshotTable.$inferSelect;
