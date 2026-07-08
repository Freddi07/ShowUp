import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";

const router = Router();

interface StatusRow {
  status: string;
}

function buildPeriod(rows: StatusRow[]) {
  const sent = rows.length;
  const confirmed = rows.filter((r) => r.status === "CONFIRMED").length;
  const cancelled = rows.filter((r) => r.status === "CANCELLED").length;
  const rescheduleRequested = rows.filter(
    (r) => r.status === "RESCHEDULE_REQUESTED",
  ).length;
  const noResponse = sent - confirmed - cancelled - rescheduleRequested;
  return { sent, confirmed, cancelled, rescheduleRequested, noResponse };
}

/** GET /stats — reminder & response statistics for the signed-in business. */
router.get("/", requireUser, async (req, res) => {
  try {
    const userId = req.user!.id;

    const customers = await db
      .select({ id: customerTable.id })
      .from(customerTable)
      .where(eq(customerTable.userId, userId));
    const customerIds = customers.map((c) => c.id);

    const empty = {
      sent: 0,
      confirmed: 0,
      cancelled: 0,
      rescheduleRequested: 0,
      noResponse: 0,
    };
    if (customerIds.length === 0) {
      return res.json({
        last7d: empty,
        last30d: empty,
        total: empty,
        dailySeries: [],
      });
    }

    const rows = await db
      .select({
        status: appointmentTable.status,
        createdAt: appointmentTable.createdAt,
      })
      .from(appointmentTable)
      .where(inArray(appointmentTable.customerId, customerIds));

    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recent = rows.filter((r) => r.createdAt >= ago30);
    const last30d = buildPeriod(recent);
    const last7d = buildPeriod(recent.filter((r) => r.createdAt >= ago7));
    const total = buildPeriod(rows);

    const dailyMap = new Map<string, number>();
    for (const r of recent) {
      const day = r.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }
    const dailySeries = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sent]) => ({ date, sent }));

    return res.json({ last7d, last30d, total, dailySeries });
  } catch (err) {
    console.error("[stats] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
