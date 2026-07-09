import { Router } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  customerTable,
  scheduledReminderTable,
} from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { sendSms } from "../lib/twilio";
import { enqueueRemindersForAppointment } from "../lib/reminders";

const router = Router();
router.use(requireUser);

const STATUSES = [
  "PENDING",
  "REMINDED",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULE_REQUESTED",
] as const;
type Status = (typeof STATUSES)[number];

/** Loads an appointment together with its owning customer, scoped to the user. */
async function loadOwnedAppointment(id: string, userId: string) {
  const [row] = await db
    .select({ appointment: appointmentTable, customer: customerTable })
    .from(appointmentTable)
    .innerJoin(customerTable, eq(appointmentTable.customerId, customerTable.id))
    .where(and(eq(appointmentTable.id, id), eq(customerTable.userId, userId)))
    .limit(1);
  return row ?? null;
}

function serialize(a: typeof appointmentTable.$inferSelect) {
  return {
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    reminderAt: a.reminderAt.toISOString(),
    status: a.status,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    twilioSid: a.twilioSid ?? null,
  };
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /appointments — all appointments belonging to the signed-in business.
 * Used by the mobile app's dashboard. Ownership is via the linked customer.
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;

    const customers = await db
      .select({ id: customerTable.id })
      .from(customerTable)
      .where(eq(customerTable.userId, userId));
    const customerIds = customers.map((c) => c.id);

    if (customerIds.length === 0) {
      return res.json({ items: [] });
    }

    const rows = await db
      .select()
      .from(appointmentTable)
      .where(inArray(appointmentTable.customerId, customerIds))
      .orderBy(asc(appointmentTable.scheduledAt));

    const items = rows.map((r) => ({
      id: r.id,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      scheduledAt: r.scheduledAt.toISOString(),
      reminderAt: r.reminderAt.toISOString(),
      status: r.status,
      twilioSid: r.twilioSid ?? null,
      customerId: r.customerId ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return res.json({ items });
  } catch (err) {
    console.error("[appointments] list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /appointments — create an appointment for one of the user's customers. */
router.post("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const customerId =
      typeof req.body?.customerId === "string" ? req.body.customerId : "";
    const scheduledAt = parseDate(req.body?.scheduledAt);
    if (!customerId || !scheduledAt) {
      res.status(400).json({ error: "Kunde og tidspunkt er påkrevd" });
      return;
    }

    const [customer] = await db
      .select()
      .from(customerTable)
      .where(and(eq(customerTable.id, customerId), eq(customerTable.userId, userId)))
      .limit(1);
    if (!customer) {
      res.status(404).json({ error: "Kunde ikke funnet" });
      return;
    }
    if (!customer.phone) {
      res
        .status(400)
        .json({ error: "Kunden mangler telefonnummer. Legg til det først." });
      return;
    }

    // Default the reminder to 24h before the appointment (never in the past).
    let reminderAt = parseDate(req.body?.reminderAt);
    if (!reminderAt) {
      reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    }

    const [created] = await db
      .insert(appointmentTable)
      .values({
        clientName: customer.name,
        clientPhone: customer.phone,
        scheduledAt,
        reminderAt,
        customerId: customer.id,
        status: "PENDING",
      })
      .returning();

    // Schedule automatic reminders (best-effort; never blocks creation).
    try {
      await enqueueRemindersForAppointment(created, userId);
    } catch (e) {
      console.error("[appointments] enqueue reminders failed:", e);
    }

    res.status(201).json(serialize(created));
  } catch (err) {
    console.error("[appointments] create error:", err);
    res.status(500).json({ error: "Kunne ikke opprette avtale" });
  }
});

/** PATCH /appointments/:id — edit date/time, reminder time, or status. */
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const owned = await loadOwnedAppointment(req.params.id, userId);
    if (!owned) {
      res.status(404).json({ error: "Avtale ikke funnet" });
      return;
    }

    const updates: Partial<typeof appointmentTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (req.body?.scheduledAt !== undefined) {
      const d = parseDate(req.body.scheduledAt);
      if (!d) {
        res.status(400).json({ error: "Ugyldig tidspunkt" });
        return;
      }
      updates.scheduledAt = d;
    }
    if (req.body?.reminderAt !== undefined) {
      const d = parseDate(req.body.reminderAt);
      if (!d) {
        res.status(400).json({ error: "Ugyldig påminnelsestidspunkt" });
        return;
      }
      updates.reminderAt = d;
    }
    if (req.body?.status !== undefined) {
      if (!STATUSES.includes(req.body.status as Status)) {
        res.status(400).json({ error: "Ugyldig status" });
        return;
      }
      updates.status = req.body.status as Status;
    }

    const [updated] = await db
      .update(appointmentTable)
      .set(updates)
      .where(eq(appointmentTable.id, owned.appointment.id))
      .returning();

    res.json(serialize(updated));
  } catch (err) {
    console.error("[appointments] update error:", err);
    res.status(500).json({ error: "Kunne ikke oppdatere avtale" });
  }
});

/** DELETE /appointments/:id — remove an appointment. */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const owned = await loadOwnedAppointment(req.params.id, userId);
    if (!owned) {
      res.status(404).json({ error: "Avtale ikke funnet" });
      return;
    }
    await db
      .delete(appointmentTable)
      .where(eq(appointmentTable.id, owned.appointment.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[appointments] delete error:", err);
    res.status(500).json({ error: "Kunne ikke slette avtale" });
  }
});

/** POST /appointments/:id/remind — send an SMS reminder to the customer now. */
router.post("/:id/remind", async (req, res) => {
  try {
    const userId = req.user!.id;
    const owned = await loadOwnedAppointment(req.params.id, userId);
    if (!owned) {
      res.status(404).json({ error: "Avtale ikke funnet" });
      return;
    }
    const appt = owned.appointment;
    if (!appt.clientPhone) {
      res.status(400).json({ error: "Avtalen mangler telefonnummer" });
      return;
    }

    // Format in Norwegian local time (server runs in UTC).
    const dato = appt.scheduledAt.toLocaleDateString("nb-NO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Oslo",
    });
    const tid = appt.scheduledAt.toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Oslo",
    });
    const body =
      typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim()
        : `Hei ${appt.clientName}, dette er en påminnelse om timen din ${dato} kl. ${tid}. ` +
          `Svar JA for å bekrefte eller NEI for å avlyse.`;

    let sid: string;
    try {
      sid = await sendSms(appt.clientPhone, body);
    } catch (smsErr) {
      console.error("[appointments] SMS send failed:", smsErr);
      res
        .status(502)
        .json({ error: "Kunne ikke sende SMS. Sjekk SMS-tilkoblingen." });
      return;
    }

    const [updated] = await db
      .update(appointmentTable)
      .set({ status: "REMINDED", twilioSid: sid, updatedAt: new Date() })
      .where(eq(appointmentTable.id, appt.id))
      .returning();

    // A manual reminder supersedes any still-pending automatic ones.
    await db
      .update(scheduledReminderTable)
      .set({
        status: "SKIPPED",
        lastError: "Manual reminder sent",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledReminderTable.appointmentId, appt.id),
          eq(scheduledReminderTable.status, "PENDING"),
        ),
      );

    res.json(serialize(updated));
  } catch (err) {
    console.error("[appointments] remind error:", err);
    res.status(500).json({ error: "Kunne ikke sende påminnelse" });
  }
});

export default router;
