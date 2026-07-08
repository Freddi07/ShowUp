import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationSettingsTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();

const DEFAULTS = {
  remind48h: false,
  remind24h: true,
  remind2h: false,
  channelSms: true,
  channelEmail: false,
  autoFollowUp: false,
};

type SettingsShape = typeof DEFAULTS;
const KEYS = Object.keys(DEFAULTS) as (keyof SettingsShape)[];

function serialize(row: {
  remind48h: boolean;
  remind24h: boolean;
  remind2h: boolean;
  channelSms: boolean;
  channelEmail: boolean;
  autoFollowUp: boolean;
}): SettingsShape {
  return {
    remind48h: row.remind48h,
    remind24h: row.remind24h,
    remind2h: row.remind2h,
    channelSms: row.channelSms,
    channelEmail: row.channelEmail,
    autoFollowUp: row.autoFollowUp,
  };
}

/** GET /notification-settings — current settings (defaults if none saved). */
router.get("/", requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [row] = await db
      .select()
      .from(notificationSettingsTable)
      .where(eq(notificationSettingsTable.userId, userId))
      .limit(1);
    return res.json(row ? serialize(row) : DEFAULTS);
  } catch (err) {
    console.error("[notification-settings] get error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /notification-settings — upsert notification settings. */
router.put("/", requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const body = (req.body ?? {}) as Partial<SettingsShape>;

    const patch: Partial<SettingsShape> = {};
    for (const key of KEYS) {
      if (typeof body[key] === "boolean") {
        patch[key] = body[key];
      }
    }

    const [existing] = await db
      .select()
      .from(notificationSettingsTable)
      .where(eq(notificationSettingsTable.userId, userId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(notificationSettingsTable)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(notificationSettingsTable.userId, userId))
        .returning();
      return res.json(serialize(updated));
    }

    const [created] = await db
      .insert(notificationSettingsTable)
      .values({ userId, ...DEFAULTS, ...patch })
      .returning();
    return res.json(serialize(created));
  } catch (err) {
    console.error("[notification-settings] put error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
