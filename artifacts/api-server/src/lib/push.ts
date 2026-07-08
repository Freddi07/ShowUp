import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { pushTokenTable } from "@workspace/db/schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  /** Arbitrary payload delivered to the app; used for deep-linking on tap. */
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/** Expo push tokens always look like ExponentPushToken[...] or ExpoPushToken[...]. */
function isExpoToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

/**
 * Send a push notification to every registered device for a user. Best-effort:
 * network/API failures are logged, never thrown, so a failed push can't break
 * the inbound-SMS flow that triggers it. Tokens Expo reports as unregistered
 * are pruned so we stop pushing to uninstalled apps.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<void> {
  try {
    const rows = await db
      .select({ token: pushTokenTable.token })
      .from(pushTokenTable)
      .where(eq(pushTokenTable.userId, userId));

    const tokens = rows.map((r) => r.token).filter(isExpoToken);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error(
        `[push] Expo push API responded ${res.status}: ${await res.text()}`,
      );
      return;
    }

    const payload = (await res.json()) as { data?: ExpoTicket[] };
    const tickets = payload.data ?? [];
    const dead: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        dead.push(tokens[i]);
      } else if (ticket.status === "error") {
        console.warn(`[push] ticket error: ${ticket.message ?? "unknown"}`);
      }
    });

    if (dead.length) {
      await db.delete(pushTokenTable).where(inArray(pushTokenTable.token, dead));
      console.info(`[push] pruned ${dead.length} unregistered token(s)`);
    }
  } catch (err) {
    console.error("[push] sendPushToUser failed:", err);
  }
}
