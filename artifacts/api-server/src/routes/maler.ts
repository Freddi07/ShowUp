import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  messageTemplateTable,
  type TemplateLanguage,
  type TemplateType,
} from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();
router.use(requireUser);

const TEMPLATE_TYPES = ["reminder_24h", "reminder_2h", "confirmation"] as const;
const TEMPLATE_LANGUAGES = ["no", "en"] as const;
const MAX_BODY_LENGTH = 1600;

function isTemplateType(value: unknown): value is TemplateType {
  return (
    typeof value === "string" &&
    (TEMPLATE_TYPES as readonly string[]).includes(value)
  );
}

function isTemplateLanguage(value: unknown): value is TemplateLanguage {
  return (
    typeof value === "string" &&
    (TEMPLATE_LANGUAGES as readonly string[]).includes(value)
  );
}

/** GET /maler — list the signed-in user's message templates. */
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db
      .select()
      .from(messageTemplateTable)
      .where(eq(messageTemplateTable.userId, userId))
      .orderBy(desc(messageTemplateTable.updatedAt));

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        language: r.language,
        body: r.body,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[maler] list error:", err);
    res.status(500).json({ error: "Kunne ikke hente maler" });
  }
});

/** PUT /maler/:type — create or update a template for the signed-in user. */
router.put("/:type", async (req, res) => {
  try {
    const userId = req.user!.id;

    const type = req.params.type;
    if (!isTemplateType(type)) {
      res.status(400).json({ error: "Ugyldig maltype" });
      return;
    }

    const language = req.body?.language;
    const body = req.body?.body;
    if (!isTemplateLanguage(language)) {
      res.status(400).json({ error: "Ugyldig språk" });
      return;
    }
    if (
      typeof body !== "string" ||
      body.length < 1 ||
      body.length > MAX_BODY_LENGTH
    ) {
      res.status(400).json({ error: "Ugyldig meldingstekst" });
      return;
    }

    const [row] = await db
      .insert(messageTemplateTable)
      .values({ userId, type, language, body })
      .onConflictDoUpdate({
        target: [
          messageTemplateTable.userId,
          messageTemplateTable.type,
          messageTemplateTable.language,
        ],
        set: { body, updatedAt: new Date() },
      })
      .returning();

    res.json({
      id: row.id,
      type: row.type,
      language: row.language,
      body: row.body,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[maler] save error:", err);
    res.status(500).json({ error: "Kunne ikke lagre mal" });
  }
});

export default router;
