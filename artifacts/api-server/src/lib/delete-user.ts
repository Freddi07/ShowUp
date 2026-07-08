import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentTable,
  customerTable,
  integrationTable,
  messageTemplateTable,
  notificationSettingsTable,
  passwordResetTokenTable,
  pushTokenTable,
  syncedAppointmentTable,
  userProfileTable,
  userTable,
} from "@workspace/db/schema";

/**
 * Permanently delete a user and all of their tenant-owned data.
 *
 * Most user-owned tables reference `userId` as a plain column (no FK cascade),
 * so they must be removed explicitly in a single transaction before the user
 * row. Sessions & accounts cascade via FK when the user row is removed.
 *
 * Shared by the admin "delete user" action and self-service account deletion.
 */
export async function deleteUserCompletely(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(notificationSettingsTable)
      .where(eq(notificationSettingsTable.userId, userId));
    await tx
      .delete(passwordResetTokenTable)
      .where(eq(passwordResetTokenTable.userId, userId));
    await tx
      .delete(messageTemplateTable)
      .where(eq(messageTemplateTable.userId, userId));
    await tx
      .delete(syncedAppointmentTable)
      .where(eq(syncedAppointmentTable.userId, userId));
    await tx
      .delete(integrationTable)
      .where(eq(integrationTable.userId, userId));
    await tx
      .delete(pushTokenTable)
      .where(eq(pushTokenTable.userId, userId));
    // Appointments reference customers via FK (no cascade) and have no userId
    // column, so delete the user's appointments (scoped through their customers)
    // before removing the customers themselves.
    await tx.delete(appointmentTable).where(
      inArray(
        appointmentTable.customerId,
        tx
          .select({ id: customerTable.id })
          .from(customerTable)
          .where(eq(customerTable.userId, userId)),
      ),
    );
    await tx.delete(customerTable).where(eq(customerTable.userId, userId));
    await tx
      .delete(userProfileTable)
      .where(eq(userProfileTable.userId, userId));
    await tx.delete(userTable).where(eq(userTable.id, userId));
  });
}
