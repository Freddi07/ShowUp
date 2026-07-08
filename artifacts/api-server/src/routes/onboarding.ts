import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();

/** Optional dashboard sections the onboarding wizard can toggle. */
const OPTIONAL_SECTIONS = ["integrations", "kunder", "statistikk", "maler", "svar"];

function parseSections(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
    return null;
  } catch {
    return null;
  }
}

/** GET /onboarding — the signed-in user's onboarding state. */
router.get("/", requireUser, async (req, res) => {
  try {
    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, req.user!.id))
      .limit(1);

    return res.json({
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      businessType: profile?.businessType ?? null,
      enabledSections: parseSections(profile?.enabledSections ?? null),
    });
  } catch (err) {
    console.error("[onboarding] get error:", err);
    return res.status(500).json({ error: "Kunne ikke hente onboarding" });
  }
});

/** PATCH /onboarding — update business type, enabled sections, completion. */
router.patch("/", requireUser, async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      businessType?: unknown;
      onboardingCompleted?: unknown;
      enabledSections?: unknown;
    };

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.businessType === "string" || body.businessType === null) {
      update.businessType = body.businessType;
    }
    if (typeof body.onboardingCompleted === "boolean") {
      update.onboardingCompleted = body.onboardingCompleted;
    }
    if (body.enabledSections === null) {
      update.enabledSections = null;
    } else if (Array.isArray(body.enabledSections)) {
      const clean = body.enabledSections.filter(
        (s): s is string =>
          typeof s === "string" && OPTIONAL_SECTIONS.includes(s),
      );
      update.enabledSections = JSON.stringify(clean);
    }

    const [updated] = await db
      .update(userProfileTable)
      .set(update)
      .where(eq(userProfileTable.userId, req.user!.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Profil ikke funnet" });
    }

    return res.json({
      onboardingCompleted: updated.onboardingCompleted ?? false,
      businessType: updated.businessType ?? null,
      enabledSections: parseSections(updated.enabledSections ?? null),
    });
  } catch (err) {
    console.error("[onboarding] patch error:", err);
    return res.status(500).json({ error: "Kunne ikke lagre onboarding" });
  }
});

export default router;
