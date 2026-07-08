import { Router } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { serializeCustomers, upsertCustomer } from "../lib/customers";

const router = Router();
router.use(requireUser);

/**
 * Resolve an imported appointment value into a canonical UTC Date.
 * - Strings with an explicit timezone (…Z or ±HH:MM) are absolute instants.
 * - Naive "YYYY-MM-DDTHH:MM" strings are wall-clock times interpreted in
 *   Europe/Oslo, so the stored instant is stable no matter where the import ran.
 * Returns null for missing/invalid input.
 */
function parseAppointmentAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const s = value.trim();
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (m) {
    const [, Y, Mo, D, H, Mi] = m.map(Number);
    const utcGuess = Date.UTC(Y, Mo - 1, D, H, Mi);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcGuess));
    const g: Record<string, string> = {};
    for (const p of parts) g[p.type] = p.value;
    let hour = Number(g.hour);
    if (hour === 24) hour = 0;
    const asUtcOfLocal = Date.UTC(
      Number(g.year),
      Number(g.month) - 1,
      Number(g.day),
      hour,
      Number(g.minute),
      Number(g.second),
    );
    const offset = asUtcOfLocal - utcGuess;
    return new Date(utcGuess - offset);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** GET /customers?q=&source= — list the signed-in user's customers. */
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const source = typeof req.query.source === "string" ? req.query.source : "";

    const conds = [eq(customerTable.userId, userId)];
    if (q) {
      conds.push(
        or(
          ilike(customerTable.name, `%${q}%`),
          ilike(customerTable.phone, `%${q}%`),
        )!,
      );
    }
    if (source) conds.push(eq(customerTable.source, source));

    const rows = await db
      .select()
      .from(customerTable)
      .where(and(...conds))
      .orderBy(asc(customerTable.name));

    res.json({ items: await serializeCustomers(rows) });
  } catch (err) {
    console.error("[customers] list error:", err);
    res.status(500).json({ error: "Kunne ikke hente kunder" });
  }
});

/** POST /customers — manually add a single customer. */
router.post("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Navn er påkrevd" });
      return;
    }
    const { customer } = await upsertCustomer(userId, {
      name,
      phone: req.body?.phone,
      email: req.body?.email,
      source: "manual",
    });
    const [serialized] = await serializeCustomers([customer]);
    res.status(201).json(serialized);
  } catch (err) {
    console.error("[customers] create error:", err);
    res.status(500).json({ error: "Kunne ikke lagre kunde" });
  }
});

/** POST /customers/import — bulk import (e.g. from a CSV export). */
router.post("/import", async (req, res) => {
  try {
    const userId = req.user!.id;
    const list = Array.isArray(req.body?.customers) ? req.body.customers : null;
    if (!list) {
      res.status(400).json({ error: "Ugyldig importdata" });
      return;
    }
    if (list.length > 5000) {
      res
        .status(413)
        .json({ error: "For mange rader. Del opp filen i biter på maks 5000." });
      return;
    }
    const source =
      typeof req.body?.source === "string" && req.body.source.trim()
        ? req.body.source.trim()
        : "import";

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let appointmentsCreated = 0;
    for (const item of list.slice(0, 5000)) {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      if (!name) {
        skipped++;
        continue;
      }
      const result = await upsertCustomer(userId, {
        name,
        phone: item?.phone,
        email: item?.email,
        externalId: item?.externalId,
        source,
      });
      if (result.created) imported++;
      else updated++;

      // Register an appointment when the row carries a valid datetime and the
      // customer has a phone (required to send the reminder). De-duplicate on
      // (customer, scheduledAt) so re-importing the same file is safe.
      const scheduledAt = parseAppointmentAt(item?.appointmentAt);
      const customer = result.customer;
      if (scheduledAt && customer.phone) {
        const [dup] = await db
          .select({ id: appointmentTable.id })
          .from(appointmentTable)
          .where(
            and(
              eq(appointmentTable.customerId, customer.id),
              eq(appointmentTable.scheduledAt, scheduledAt),
            ),
          )
          .limit(1);
        if (!dup) {
          await db.insert(appointmentTable).values({
            clientName: customer.name,
            clientPhone: customer.phone,
            scheduledAt,
            reminderAt: new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000),
            customerId: customer.id,
            status: "PENDING",
          });
          appointmentsCreated++;
        }
      }
    }
    res.json({ imported, updated, skipped, appointmentsCreated });
  } catch (err) {
    console.error("[customers] import error:", err);
    res.status(500).json({ error: "Import feilet" });
  }
});

/** DELETE /customers/:id — remove a customer and all their appointments. */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [existing] = await db
      .select()
      .from(customerTable)
      .where(
        and(eq(customerTable.id, req.params.id), eq(customerTable.userId, userId)),
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Kunde ikke funnet" });
      return;
    }
    // Appointments reference the customer, so remove them first.
    await db
      .delete(appointmentTable)
      .where(eq(appointmentTable.customerId, existing.id));
    await db.delete(customerTable).where(eq(customerTable.id, existing.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[customers] delete error:", err);
    res.status(500).json({ error: "Kunne ikke slette kunde" });
  }
});

/** GET /customers/:id — one customer with its appointments. */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [customer] = await db
      .select()
      .from(customerTable)
      .where(
        and(
          eq(customerTable.id, req.params.id),
          eq(customerTable.userId, userId),
        ),
      )
      .limit(1);
    if (!customer) {
      res.status(404).json({ error: "Ikke funnet" });
      return;
    }
    const appts = await db
      .select()
      .from(appointmentTable)
      .where(eq(appointmentTable.customerId, customer.id))
      .orderBy(desc(appointmentTable.scheduledAt));

    res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      source: customer.source,
      externalId: customer.externalId,
      appointmentCount: appts.length,
      lastVisitAt: appts[0]?.scheduledAt.toISOString() ?? null,
      createdAt: customer.createdAt.toISOString(),
      appointments: appts.map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt.toISOString(),
        reminderAt: a.reminderAt.toISOString(),
        status: a.status,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        twilioSid: a.twilioSid ?? null,
      })),
    });
  } catch (err) {
    console.error("[customers] detail error:", err);
    res.status(500).json({ error: "Kunne ikke hente kunde" });
  }
});

export default router;
