import { Router } from "express";
import { and, count, desc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  customerTable,
  integrationTable,
  messageTemplateTable,
  notificationSettingsTable,
  passwordResetTokenTable,
  sessionTable,
  syncedAppointmentTable,
  userProfileTable,
  userTable,
} from "@workspace/db/schema";
import { auth } from "../lib/auth";
import { isAdminEmail, requireAdminEmail } from "../middlewares/require-user";

const router = Router();

// Every route below is restricted to the admin email allowlist.
router.use(requireAdminEmail);

const APP_URL =
  process.env.APP_URL ??
  process.env.BETTER_AUTH_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3001");

/** GET /admin/stats — aggregate platform metrics. */
router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      [{ value: totalUsers }],
      [{ value: bannedUsers }],
      [{ value: newUsers7d }],
      [{ value: activeSubscriptions }],
      [{ value: trialingUsers }],
      [{ value: totalCustomers }],
      [{ value: totalAppointments }],
      apptByStatus,
    ] = await Promise.all([
      db.select({ value: count() }).from(userTable),
      db
        .select({ value: count() })
        .from(userTable)
        .where(eq(userTable.banned, true)),
      db
        .select({ value: count() })
        .from(userTable)
        .where(gte(userTable.createdAt, sevenDaysAgo)),
      db
        .select({ value: count() })
        .from(userProfileTable)
        .where(eq(userProfileTable.subscriptionStatus, "active")),
      db
        .select({ value: count() })
        .from(userProfileTable)
        .where(
          or(
            eq(userProfileTable.subscriptionStatus, "trialing"),
            and(
              isNull(userProfileTable.subscriptionStatus),
              gt(userProfileTable.trialEndsAt, now),
            ),
          ),
        ),
      db.select({ value: count() }).from(customerTable),
      db.select({ value: count() }).from(appointmentTable),
      db
        .select({ status: appointmentTable.status, value: count() })
        .from(appointmentTable)
        .groupBy(appointmentTable.status),
    ]);

    const appointmentsByStatus: Record<string, number> = {
      PENDING: 0,
      REMINDED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      RESCHEDULE_REQUESTED: 0,
    };
    for (const row of apptByStatus) {
      appointmentsByStatus[row.status] = row.value;
    }

    res.json({
      totalUsers,
      bannedUsers,
      newUsers7d,
      activeSubscriptions,
      trialingUsers,
      totalCustomers,
      totalAppointments,
      appointmentsByStatus,
    });
  } catch (err) {
    console.error("[admin] stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

/** GET /admin/users — list all users with profile + last-login info. */
router.get("/users", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        banned: userTable.banned,
        createdAt: userTable.createdAt,
        businessType: userProfileTable.businessType,
        subscriptionStatus: userProfileTable.subscriptionStatus,
        trialEndsAt: userProfileTable.trialEndsAt,
      })
      .from(userTable)
      .leftJoin(
        userProfileTable,
        eq(userProfileTable.userId, userTable.id),
      )
      .orderBy(desc(userTable.createdAt));

    const lastLoginRows = await db
      .select({
        userId: sessionTable.userId,
        last: sql<string>`max(${sessionTable.createdAt})`,
      })
      .from(sessionTable)
      .groupBy(sessionTable.userId);
    const lastLoginMap = new Map(
      lastLoginRows.map((r) => [r.userId, r.last]),
    );

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? null,
      banned: Boolean(u.banned),
      businessType: u.businessType ?? null,
      subscriptionStatus: u.subscriptionStatus ?? null,
      trialEndsAt: u.trialEndsAt ? u.trialEndsAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      lastLogin: lastLoginMap.get(u.id)
        ? new Date(lastLoginMap.get(u.id) as string).toISOString()
        : null,
    }));

    res.json({ users, total: users.length });
  } catch (err) {
    console.error("[admin] users error:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

async function getUserById(id: string) {
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** POST /admin/users/:id/reset-password — email the user a reset link. */
router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: `${APP_URL}/reset-password` },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] reset-password error:", err);
    res.status(500).json({ error: "Failed to send reset link" });
  }
});

/** PATCH /admin/users/:id/ban */
router.patch("/users/:id/ban", async (req, res) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (isAdminEmail(target.email) || target.id === req.user?.id) {
      res.status(403).json({ error: "Cannot ban an administrator" });
      return;
    }
    await db
      .update(userTable)
      .set({ banned: true, updatedAt: new Date() })
      .where(eq(userTable.id, target.id));
    // Revoke active sessions so the ban takes effect immediately.
    await db.delete(sessionTable).where(eq(sessionTable.userId, target.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] ban error:", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

/** PATCH /admin/users/:id/unban */
router.patch("/users/:id/unban", async (req, res) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db
      .update(userTable)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, target.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] unban error:", err);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

/** DELETE /admin/users/:id */
router.delete("/users/:id", async (req, res) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (isAdminEmail(target.email) || target.id === req.user?.id) {
      res.status(403).json({ error: "Cannot delete an administrator" });
      return;
    }
    // Most user-owned tables reference userId as a plain column (no FK cascade),
    // so remove all of them in a single transaction before the user row.
    // Sessions & accounts cascade via FK when the user row is removed.
    const uid = target.id;
    await db.transaction(async (tx) => {
      await tx
        .delete(notificationSettingsTable)
        .where(eq(notificationSettingsTable.userId, uid));
      await tx
        .delete(passwordResetTokenTable)
        .where(eq(passwordResetTokenTable.userId, uid));
      await tx
        .delete(messageTemplateTable)
        .where(eq(messageTemplateTable.userId, uid));
      await tx
        .delete(syncedAppointmentTable)
        .where(eq(syncedAppointmentTable.userId, uid));
      await tx
        .delete(integrationTable)
        .where(eq(integrationTable.userId, uid));
      await tx.delete(customerTable).where(eq(customerTable.userId, uid));
      await tx
        .delete(userProfileTable)
        .where(eq(userProfileTable.userId, uid));
      await tx.delete(userTable).where(eq(userTable.id, uid));
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] delete error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
