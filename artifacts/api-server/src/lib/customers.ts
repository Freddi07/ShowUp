import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";

type CustomerRow = typeof customerTable.$inferSelect;

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  externalId?: string | null;
}

export interface SerializedCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  externalId: string | null;
  appointmentCount: number;
  lastVisitAt: string | null;
  createdAt: string;
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Insert or update a customer for a user, de-duplicating by externalId, then
 * phone, then email. Used by manual add, CSV import, and the public API ingest.
 */
export async function upsertCustomer(
  userId: string,
  input: CustomerInput,
): Promise<{ customer: CustomerRow; created: boolean }> {
  const name = clean(input.name) ?? "";
  const phone = clean(input.phone);
  const email = clean(input.email)?.toLowerCase() ?? null;
  const source = clean(input.source);
  const externalId = clean(input.externalId);

  let existing: CustomerRow | undefined;
  if (externalId) {
    [existing] = await db
      .select()
      .from(customerTable)
      .where(
        and(
          eq(customerTable.userId, userId),
          eq(customerTable.externalId, externalId),
        ),
      )
      .limit(1);
  }
  if (!existing && phone) {
    [existing] = await db
      .select()
      .from(customerTable)
      .where(
        and(eq(customerTable.userId, userId), eq(customerTable.phone, phone)),
      )
      .limit(1);
  }
  if (!existing && email) {
    [existing] = await db
      .select()
      .from(customerTable)
      .where(
        and(eq(customerTable.userId, userId), eq(customerTable.email, email)),
      )
      .limit(1);
  }

  if (existing) {
    const [updated] = await db
      .update(customerTable)
      .set({
        name: name || existing.name,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        source: source ?? existing.source,
        externalId: externalId ?? existing.externalId,
        updatedAt: new Date(),
      })
      .where(eq(customerTable.id, existing.id))
      .returning();
    return { customer: updated, created: false };
  }

  const [created] = await db
    .insert(customerTable)
    .values({ userId, name, phone, email, source, externalId })
    .returning();
  return { customer: created, created: true };
}

/** Attach appointment counts and last-visit dates to customer rows. */
export async function serializeCustomers(
  rows: CustomerRow[],
): Promise<SerializedCustomer[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const aggs = await db
    .select({
      customerId: appointmentTable.customerId,
      count: sql<number>`count(*)::int`,
      lastVisit: sql<string | null>`max(${appointmentTable.scheduledAt})`,
    })
    .from(appointmentTable)
    .where(inArray(appointmentTable.customerId, ids))
    .groupBy(appointmentTable.customerId);

  const byId = new Map(aggs.map((a) => [a.customerId, a]));
  return rows.map((r) => {
    const agg = byId.get(r.id);
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.source,
      externalId: r.externalId,
      appointmentCount: agg?.count ?? 0,
      lastVisitAt: agg?.lastVisit ? new Date(agg.lastVisit).toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
