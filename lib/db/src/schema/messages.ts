import { index, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const templateTypeEnum = pgEnum("TemplateType", [
  "reminder_24h",
  "reminder_2h",
  "confirmation",
]);
export type TemplateType = (typeof templateTypeEnum.enumValues)[number];

export const templateLanguageEnum = pgEnum("TemplateLanguage", ["no", "en"]);
export type TemplateLanguage = (typeof templateLanguageEnum.enumValues)[number];

export const messageTemplateTable = pgTable(
  "MessageTemplate",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    type: templateTypeEnum("type").notNull(),
    language: templateLanguageEnum("language").notNull().default("no"),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    unique("MessageTemplate_userId_type_language_key").on(t.userId, t.type, t.language),
    index("MessageTemplate_userId_idx").on(t.userId),
  ],
);

export type MessageTemplate = typeof messageTemplateTable.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplateTable.$inferInsert;
