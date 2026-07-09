/**
 * AI setup assistant.
 *
 * - GET  /assistant/conversations        list the signed-in user's conversations
 * - GET  /assistant/conversations/:id    load one conversation's messages
 * - POST /assistant/chat                 stream a reply (SSE) with tool use
 *
 * The chat endpoint runs an agentic loop: it streams Claude's text to the
 * browser, and whenever the model requests a tool it executes it (scoped to the
 * tenant), feeds the result back, and continues until a final answer. Only the
 * natural-language turns are persisted — tool results, webhook secrets and OAuth
 * links are streamed live but never written to the message log.
 */
import { Router } from "express";
import type { Request } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import {
  assistantConversationTable,
  assistantMessageTable,
} from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { buildSystemPrompt, type IntegrationStatusLine } from "../lib/assistant/knowledge";
import {
  ASSISTANT_TOOLS,
  runAssistantTool,
  type AssistantToolContext,
} from "../lib/assistant/tools";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireUser);

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;
const MAX_TOOL_ROUNDS = 6;

/** Build the request origin (proto://host) for links the tools return. */
function requestOrigin(req: Request): string {
  const host = req.get("host") ?? "";
  const proto = host.includes("localhost") ? req.protocol : "https";
  return `${proto}://${host}`;
}

/** GET /assistant/conversations — the user's conversations, newest first. */
router.get("/conversations", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: assistantConversationTable.id,
        title: assistantConversationTable.title,
        updatedAt: assistantConversationTable.updatedAt,
      })
      .from(assistantConversationTable)
      .where(eq(assistantConversationTable.userId, req.user!.id))
      .orderBy(desc(assistantConversationTable.updatedAt))
      .limit(50);
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "[assistant] list conversations failed");
    res.status(500).json({ error: "Kunne ikke hente samtaler" });
  }
});

/** GET /assistant/conversations/:id — one conversation's messages (tenant-scoped). */
router.get("/conversations/:id", async (req, res) => {
  try {
    const [conv] = await db
      .select()
      .from(assistantConversationTable)
      .where(
        and(
          eq(assistantConversationTable.id, req.params.id),
          eq(assistantConversationTable.userId, req.user!.id),
        ),
      )
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Samtale ikke funnet" });
      return;
    }
    const messages = await db
      .select({
        role: assistantMessageTable.role,
        content: assistantMessageTable.content,
        createdAt: assistantMessageTable.createdAt,
      })
      .from(assistantMessageTable)
      .where(eq(assistantMessageTable.conversationId, conv.id))
      .orderBy(asc(assistantMessageTable.createdAt));
    res.json({
      id: conv.id,
      title: conv.title,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "[assistant] load conversation failed");
    res.status(500).json({ error: "Kunne ikke hente samtalen" });
  }
});

/** Load the live per-tenant integration status lines for the system prompt. */
async function loadStatusLines(
  ctx: AssistantToolContext,
): Promise<IntegrationStatusLine[]> {
  const result = (await runAssistantTool(ctx, "get_integration_status", {})) as {
    items?: Array<{
      provider: string;
      label: string;
      status: string;
      implemented: boolean;
    }>;
  };
  return (result.items ?? []).map((i) => ({
    provider: i.provider,
    label: i.label,
    status: i.status,
    implemented: i.implemented,
  }));
}

/** POST /assistant/chat — stream a reply over SSE, running tools as needed. */
router.post("/chat", async (req, res) => {
  const userId = req.user!.id;
  const body = req.body as { conversationId?: unknown; message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    res.status(400).json({ error: "Meldingen kan ikke være tom" });
    return;
  }

  // Resolve or create the conversation (before we switch to SSE).
  let conversationId: string;
  try {
    if (typeof body.conversationId === "string" && body.conversationId) {
      const [conv] = await db
        .select({ id: assistantConversationTable.id })
        .from(assistantConversationTable)
        .where(
          and(
            eq(assistantConversationTable.id, body.conversationId),
            eq(assistantConversationTable.userId, userId),
          ),
        )
        .limit(1);
      if (!conv) {
        res.status(404).json({ error: "Samtale ikke funnet" });
        return;
      }
      conversationId = conv.id;
    } else {
      const title = message.slice(0, 60);
      const [conv] = await db
        .insert(assistantConversationTable)
        .values({ userId, title })
        .returning({ id: assistantConversationTable.id });
      conversationId = conv.id;
    }

    // Persist the user turn and load prior history for context.
    await db
      .insert(assistantMessageTable)
      .values({ conversationId, userId, role: "user", content: message });
    const history = await db
      .select({
        role: assistantMessageTable.role,
        content: assistantMessageTable.content,
      })
      .from(assistantMessageTable)
      .where(eq(assistantMessageTable.conversationId, conversationId))
      .orderBy(asc(assistantMessageTable.createdAt));

    const ctx: AssistantToolContext = { userId, origin: requestOrigin(req) };
    const system = buildSystemPrompt(await loadStatusLines(ctx));

    // Switch to SSE.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const sse = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    sse({ type: "start", conversationId });

    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    let aborted = false;
    let currentStream: ReturnType<typeof anthropic.messages.stream> | null = null;
    req.on("close", () => {
      aborted = true;
      currentStream?.abort();
    });

    // Exact sensitive strings produced by tools this turn (webhook secrets,
    // URLs, OAuth links). These are streamed live to the UI but scrubbed from
    // the assistant text before it is persisted, so a durable chat log can never
    // contain a secret even if the model echoes one back in its prose.
    const sensitiveValues = new Set<string>();
    const collectSensitive = (result: unknown) => {
      if (!result || typeof result !== "object") return;
      const r = result as Record<string, unknown>;
      for (const key of ["secret", "webhookUrl", "authUrl"]) {
        const v = r[key];
        if (typeof v === "string" && v.length >= 8) sensitiveValues.add(v);
      }
    };
    const redact = (text: string) => {
      let out = text;
      for (const v of sensitiveValues) out = out.split(v).join("[skjult]");
      return out;
    };

    let fullResponse = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS && !aborted; round++) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools: ASSISTANT_TOOLS,
        messages,
      });
      currentStream = stream;

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
          sse({ type: "text", content: event.delta.text });
        }
      }

      const final = await stream.finalMessage();
      if (final.stop_reason !== "tool_use") break;

      // Execute every requested tool, feed results back, and loop.
      messages.push({ role: "assistant", content: final.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of final.content) {
        if (block.type !== "tool_use") continue;
        sse({ type: "tool", name: block.name, status: "running" });
        const result = await runAssistantTool(
          ctx,
          block.name,
          (block.input ?? {}) as Record<string, unknown>,
        );
        collectSensitive(result);
        sse({ type: "tool_result", name: block.name, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (!aborted) {
      // Persist only the natural-language answer (no tool output / secrets).
      const safeResponse = redact(fullResponse);
      if (safeResponse.trim()) {
        await db.insert(assistantMessageTable).values({
          conversationId,
          userId,
          role: "assistant",
          content: safeResponse,
        });
      }
      await db
        .update(assistantConversationTable)
        .set({ updatedAt: new Date() })
        .where(eq(assistantConversationTable.id, conversationId));
      sse({ type: "done", conversationId });
    }
    res.end();
  } catch (err) {
    logger.error({ err }, "[assistant] chat failed");
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ type: "error", error: "Assistenten møtte en feil. Prøv igjen." })}\n\n`,
      );
      res.end();
    } else {
      res.status(500).json({ error: "Assistenten er utilgjengelig akkurat nå." });
    }
  }
});

export default router;
