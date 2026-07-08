import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { sendSms } from "../lib/vonage";

const router = Router();
router.use(requireUser);

// The "Svar" view shows appointments that have been reminded and any reply the
// customer sent back. Pending (never-reminded) appointments are not replies.
const REPLY_STATUSES = [
  "REMINDED",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULE_REQUESTED",
] as const;
type ReplyStatus = (typeof REPLY_STATUSES)[number];

/** GET /svar?status=&page=&limit= — list the signed-in user's reminded appointments. */
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const statusParam =
      typeof req.query.status === "string" ? req.query.status : "all";
    const page = Math.max(0, Number(req.query.page) || 0);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const statuses: ReplyStatus[] = REPLY_STATUSES.includes(
      statusParam as ReplyStatus,
    )
      ? [statusParam as ReplyStatus]
      : [...REPLY_STATUSES];

    const where = and(
      eq(customerTable.userId, userId),
      inArray(appointmentTable.status, statuses),
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointmentTable)
      .innerJoin(customerTable, eq(appointmentTable.customerId, customerTable.id))
      .where(where);

    const rows = await db
      .select({ a: appointmentTable })
      .from(appointmentTable)
      .innerJoin(customerTable, eq(appointmentTable.customerId, customerTable.id))
      .where(where)
      .orderBy(desc(appointmentTable.updatedAt))
      .limit(limit)
      .offset(page * limit);

    res.json({
      total: count,
      items: rows.map(({ a }) => ({
        id: a.id,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        scheduledAt: a.scheduledAt.toISOString(),
        status: a.status,
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[svar] list error:", err);
    res.status(500).json({ error: "Kunne ikke hente svar" });
  }
});

const ALL_STATUSES = ["PENDING", ...REPLY_STATUSES] as const;

/** PATCH /svar/:id — update status, or send a follow-up ("purring") SMS. */
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [owned] = await db
      .select({ a: appointmentTable })
      .from(appointmentTable)
      .innerJoin(customerTable, eq(appointmentTable.customerId, customerTable.id))
      .where(
        and(
          eq(appointmentTable.id, req.params.id),
          eq(customerTable.userId, userId),
        ),
      )
      .limit(1);
    if (!owned) {
      res.status(404).json({ error: "Fant ikke avtalen" });
      return;
    }
    const appt = owned.a;

    if (req.body?.action === "send_followup") {
      if (!appt.clientPhone) {
        res.status(400).json({ error: "Avtalen mangler telefonnummer" });
        return;
      }
      const body =
        `Hei ${appt.clientName}, vi har ennå ikke fått svar om timen din. ` +
        `Svar JA for å bekrefte eller NEI for å avlyse.`;
      try {
        await sendSms(appt.clientPhone, body);
      } catch (smsErr) {
        console.error("[svar] follow-up SMS failed:", smsErr);
        res.status(502).json({ error: "Kunne ikke sende purring" });
        return;
      }
      await db
        .update(appointmentTable)
        .set({ updatedAt: new Date() })
        .where(eq(appointmentTable.id, appt.id));
      res.json({ ok: true });
      return;
    }

    const status = req.body?.status;
    if (
      typeof status === "string" &&
      (ALL_STATUSES as readonly string[]).includes(status)
    ) {
      await db
        .update(appointmentTable)
        .set({ status: status as (typeof ALL_STATUSES)[number], updatedAt: new Date() })
        .where(eq(appointmentTable.id, appt.id));
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ugyldig forespørsel" });
  } catch (err) {
    console.error("[svar] patch error:", err);
    res.status(500).json({ error: "Kunne ikke oppdatere" });
  }
});

export default router;
