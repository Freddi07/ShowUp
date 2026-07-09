import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { integrationTable, syncedAppointmentTable } from "@workspace/db/schema";
import { requireUser } from "../middlewares/require-user";
import { PROVIDER_CATALOG, getCatalogEntry } from "../lib/integrations/catalog";
import {
  ProviderNotImplementedError,
  getProvider,
  isProviderImplemented,
} from "../lib/integrations/registry";
import { decryptJSON } from "../lib/integrations/crypto";

const router = Router();
router.use(requireUser);

/** GET /integrations — the provider catalogue merged with the user's status. */
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db
      .select()
      .from(integrationTable)
      .where(eq(integrationTable.userId, userId));
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    const items = PROVIDER_CATALOG.map((c) => {
      const row = byProvider.get(c.provider);
      return {
        provider: c.provider,
        label: c.label,
        description: c.description,
        category: c.category,
        authType: c.authType,
        implemented: c.implemented && isProviderImplemented(c.provider),
        status: row?.status ?? "disconnected",
        lastSyncedAt: row?.lastSyncedAt?.toISOString() ?? null,
        lastError: row?.lastError ?? null,
      };
    });
    res.json({ items });
  } catch (err) {
    console.error("[integrations] list error:", err);
    res.status(500).json({ error: "Kunne ikke hente integrasjoner" });
  }
});

/** GET /integrations/bookings — the 10 most recent bookings ingested via any integration. */
router.get("/bookings", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db
      .select({
        id: syncedAppointmentTable.id,
        externalId: syncedAppointmentTable.externalId,
        syncedAt: syncedAppointmentTable.syncedAt,
        appointmentData: syncedAppointmentTable.appointmentData,
        provider: integrationTable.provider,
      })
      .from(syncedAppointmentTable)
      .innerJoin(
        integrationTable,
        eq(syncedAppointmentTable.integrationId, integrationTable.id),
      )
      .where(eq(syncedAppointmentTable.userId, userId))
      .orderBy(desc(syncedAppointmentTable.syncedAt))
      .limit(10);

    const items = rows.map((r) => {
      const data = (r.appointmentData ?? {}) as Record<string, unknown>;
      const catalog = getCatalogEntry(r.provider);
      return {
        id: r.id,
        externalId: r.externalId,
        provider: r.provider,
        providerLabel: catalog?.label ?? r.provider,
        clientName: typeof data.clientName === "string" ? data.clientName : null,
        scheduledAt:
          typeof data.scheduledAt === "string" ? data.scheduledAt : null,
        syncedAt: r.syncedAt.toISOString(),
      };
    });
    res.json({ items });
  } catch (err) {
    console.error("[integrations] bookings error:", err);
    res.status(500).json({ error: "Kunne ikke hente bookinger" });
  }
});

/**
 * POST /integrations/:provider/connect — provider-specific connect.
 * Foundation ships the plumbing only; each provider's real flow is added by the
 * dependent tasks and registered in the registry. Until then this reports 501.
 */
router.post("/:provider/connect", async (req, res) => {
  const provider = req.params.provider;
  if (!getCatalogEntry(provider)) {
    res.status(404).json({ error: "Ukjent leverandør" });
    return;
  }
  if (!isProviderImplemented(provider)) {
    res.status(501).json({
      error: "Denne koblingen er ikke tilgjengelig ennå.",
      code: "not_implemented",
    });
    return;
  }
  res.status(501).json({ error: "Not implemented", code: "not_implemented" });
});

/**
 * POST /integrations/:provider/sync — trigger a manual test sync.
 * Delegates to the provider's fetchNewBookings once implemented.
 */
router.post("/:provider/sync", async (req, res) => {
  const provider = req.params.provider;
  if (!getCatalogEntry(provider)) {
    res.status(404).json({ error: "Ukjent leverandør" });
    return;
  }
  if (!isProviderImplemented(provider)) {
    res.status(501).json({
      error: "Testsynk er ikke tilgjengelig for denne leverandøren ennå.",
      code: "not_implemented",
    });
    return;
  }
  res.status(501).json({ error: "Not implemented", code: "not_implemented" });
});

/** POST /integrations/:provider/disconnect — generic disconnect for any provider. */
router.post("/:provider/disconnect", async (req, res) => {
  try {
    const userId = req.user!.id;
    const provider = req.params.provider;
    if (!getCatalogEntry(provider)) {
      res.status(404).json({ error: "Ukjent leverandør" });
      return;
    }

    const [row] = await db
      .select()
      .from(integrationTable)
      .where(
        and(
          eq(integrationTable.userId, userId),
          eq(integrationTable.provider, provider as never),
        ),
      )
      .limit(1);

    // Best-effort remote teardown (webhook subscriptions, watch channels, …).
    if (row && isProviderImplemented(provider)) {
      try {
        const credentials = row.credentialsEncrypted
          ? decryptJSON<Record<string, unknown>>(row.credentialsEncrypted)
          : {};
        await getProvider(provider, {
          userId,
          integrationId: row.id,
          credentials,
        }).disconnect();
      } catch (err) {
        if (!(err instanceof ProviderNotImplementedError)) {
          console.error("[integrations] provider disconnect failed:", err);
        }
      }
    }

    if (row) {
      await db
        .update(integrationTable)
        .set({
          status: "disconnected",
          credentialsEncrypted: "",
          externalAccountId: null,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(integrationTable.id, row.id));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[integrations] disconnect error:", err);
    res.status(500).json({ error: "Kunne ikke koble fra" });
  }
});

export default router;
