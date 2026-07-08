import { Router } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { serializeCustomers, upsertCustomer } from "../lib/customers";

const router = Router();
router.use(requireUser);

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
    }
    res.json({ imported, updated, skipped });
  } catch (err) {
    console.error("[customers] import error:", err);
    res.status(500).json({ error: "Import feilet" });
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
