/**
 * Seed script — populates realistic Norwegian appointment data so the
 * BookPling web + mobile apps have something to show. Also sets a known
 * password for the test account for end-to-end verification.
 *
 * Run via: node ./build-seed.mjs  (bundles this file and executes it)
 */
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  customerTable,
  userTable,
  accountTable,
} from "@workspace/db/schema";
import { auth } from "./lib/auth";

type Status =
  | "PENDING"
  | "REMINDED"
  | "CONFIRMED"
  | "CANCELLED"
  | "RESCHEDULE_REQUESTED";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface CustomerSeed {
  name: string;
  phone: string;
  email: string | null;
  source: string;
  appointments: {
    scheduledAt: Date;
    status: Status;
    createdAt?: Date;
    twilioSid?: string;
  }[];
}

function sid() {
  return "SM" + Math.random().toString(36).slice(2, 14).padEnd(12, "0");
}

// A busy hair salon / service business roster.
const TEST_CUSTOMERS: CustomerSeed[] = [
  {
    name: "Ingrid Johansen",
    phone: "+4791234567",
    email: "ingrid.johansen@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(0, 9, 0), status: "CONFIRMED", twilioSid: sid() },
      { scheduledAt: at(-14, 10, 30), status: "CONFIRMED", twilioSid: sid() },
      { scheduledAt: at(-42, 11, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Lars Berg",
    phone: "+4792345678",
    email: "lars.berg@outlook.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(0, 11, 0), status: "CANCELLED", twilioSid: sid() },
      { scheduledAt: at(-21, 13, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Sofie Andersen",
    phone: "+4793456789",
    email: "sofie.a@gmail.com",
    source: "booksy",
    appointments: [
      { scheduledAt: at(0, 14, 30), status: "REMINDED", twilioSid: sid() },
      { scheduledAt: at(-7, 15, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Mohammed Ali",
    phone: "+4794567890",
    email: null,
    source: "manual",
    appointments: [
      {
        scheduledAt: at(1, 9, 30),
        status: "RESCHEDULE_REQUESTED",
        twilioSid: sid(),
      },
      { scheduledAt: at(-30, 9, 30), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Emma Nilsen",
    phone: "+4795678901",
    email: "emma.nilsen@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(1, 12, 0), status: "CONFIRMED", twilioSid: sid() },
      { scheduledAt: at(2, 16, 0), status: "PENDING" },
    ],
  },
  {
    name: "Jakob Hansen",
    phone: "+4796789012",
    email: "jakob.h@icloud.com",
    source: "fresha",
    appointments: [
      { scheduledAt: at(2, 10, 0), status: "REMINDED", twilioSid: sid() },
      { scheduledAt: at(-3, 14, 0), status: "CANCELLED", twilioSid: sid() },
      { scheduledAt: at(-60, 10, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Nora Pedersen",
    phone: "+4797890123",
    email: "nora.pedersen@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(3, 9, 0), status: "CONFIRMED", twilioSid: sid() },
      { scheduledAt: at(-10, 11, 30), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Oliver Kristiansen",
    phone: "+4798901234",
    email: null,
    source: "manual",
    appointments: [
      { scheduledAt: at(3, 15, 30), status: "PENDING" },
      { scheduledAt: at(-5, 13, 0), status: "CANCELLED", twilioSid: sid() },
    ],
  },
  {
    name: "Maja Olsen",
    phone: "+4799012345",
    email: "maja.olsen@gmail.com",
    source: "cliniko",
    appointments: [
      { scheduledAt: at(4, 10, 30), status: "REMINDED", twilioSid: sid() },
      { scheduledAt: at(-2, 9, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Henrik Larsen",
    phone: "+4790112233",
    email: "henrik.larsen@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(5, 11, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
];

// A smaller roster for the second account.
const FREDRIK_CUSTOMERS: CustomerSeed[] = [
  {
    name: "Anne Bakke",
    phone: "+4791100220",
    email: "anne.bakke@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(0, 10, 0), status: "CONFIRMED", twilioSid: sid() },
      { scheduledAt: at(2, 13, 0), status: "REMINDED", twilioSid: sid() },
    ],
  },
  {
    name: "Petter Solberg",
    phone: "+4791100330",
    email: null,
    source: "manual",
    appointments: [
      { scheduledAt: at(1, 9, 30), status: "CANCELLED", twilioSid: sid() },
      { scheduledAt: at(-8, 15, 0), status: "CONFIRMED", twilioSid: sid() },
    ],
  },
  {
    name: "Kari Ruud",
    phone: "+4791100440",
    email: "kari.ruud@gmail.com",
    source: "manual",
    appointments: [
      { scheduledAt: at(3, 12, 0), status: "PENDING" },
    ],
  },
];

async function seedForUser(userId: string, customers: CustomerSeed[]) {
  // Clear existing seeded data for idempotency.
  const existing = await db
    .select({ id: customerTable.id })
    .from(customerTable)
    .where(eq(customerTable.userId, userId));
  for (const c of existing) {
    await db
      .delete(appointmentTable)
      .where(eq(appointmentTable.customerId, c.id));
  }
  await db.delete(customerTable).where(eq(customerTable.userId, userId));

  for (const c of customers) {
    const [customer] = await db
      .insert(customerTable)
      .values({
        userId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        source: c.source,
      })
      .returning();

    for (const a of c.appointments) {
      const created = a.createdAt ?? new Date(a.scheduledAt.getTime() - 2 * DAY);
      await db.insert(appointmentTable).values({
        clientName: c.name,
        clientPhone: c.phone,
        scheduledAt: a.scheduledAt,
        reminderAt: new Date(a.scheduledAt.getTime() - DAY),
        status: a.status,
        twilioSid: a.twilioSid ?? null,
        customerId: customer.id,
        createdAt: created,
        updatedAt: created,
      });
    }
  }
}

async function ensurePassword(email: string, password: string) {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (!user) {
    console.log(`[seed] user ${email} not found — skipping password reset`);
    return;
  }
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const [cred] = await db
    .select()
    .from(accountTable)
    .where(
      and(
        eq(accountTable.userId, user.id),
        eq(accountTable.providerId, "credential"),
      ),
    )
    .limit(1);
  if (cred) {
    await db
      .update(accountTable)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(accountTable.id, cred.id));
  } else {
    await db.insert(accountTable).values({
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`[seed] password set for ${email}`);
  return user.id;
}

async function main() {
  const [testUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, "test@showup.no"))
    .limit(1);
  const [fredrik] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, "snillefredrik@gmail.com"))
    .limit(1);

  if (testUser) {
    await seedForUser(testUser.id, TEST_CUSTOMERS);
    console.log(`[seed] seeded ${TEST_CUSTOMERS.length} customers for test@showup.no`);
  }
  if (fredrik) {
    await seedForUser(fredrik.id, FREDRIK_CUSTOMERS);
    console.log(`[seed] seeded ${FREDRIK_CUSTOMERS.length} customers for snillefredrik@gmail.com`);
  }

  await ensurePassword("test@showup.no", "ShowUp!2026");

  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
