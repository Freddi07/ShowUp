import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Persisted history for the in-dashboard AI setup assistant.
 *
 * Every conversation and message is scoped to the owning business (`userId`)
 * so history is strictly per-tenant. We store ONLY the natural-language turns
 * (user prompts and the assistant's text answers) — never tool results, webhook
 * secrets, or OAuth tokens. Those are streamed live to the browser during a
 * turn but deliberately kept out of the durable log.
 */
export const assistantConversationTable = pgTable(
  "AssistantConversation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    /** Short human label derived from the first user message. */
    title: text("title"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("AssistantConversation_userId_idx").on(t.userId)],
);

export const assistantMessageTable = pgTable(
  "AssistantMessage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => assistantConversationTable.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    /** "user" | "assistant" */
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("AssistantMessage_conversationId_idx").on(t.conversationId),
    index("AssistantMessage_userId_idx").on(t.userId),
  ],
);

export type AssistantConversation =
  typeof assistantConversationTable.$inferSelect;
export type InsertAssistantConversation =
  typeof assistantConversationTable.$inferInsert;
export type AssistantMessage = typeof assistantMessageTable.$inferSelect;
export type InsertAssistantMessage = typeof assistantMessageTable.$inferInsert;
