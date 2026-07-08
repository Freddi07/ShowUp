import crypto from "node:crypto";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable } from "@workspace/db/schema";

const router = Router();

/** Keep only digits so "+47 992 69 968" and "004799269968" compare equal. */
function digits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

/** Map a customer's SMS reply to an appointment status, or null if unclear. */
function classifyReply(
  body: string,
): "CONFIRMED" | "CANCELLED" | "RESCHEDULE_REQUESTED" | null {
  const text = body.trim().toLowerCase();
  if (!text) return null;
  const first = text.split(/\s+/)[0].replace(/[.!,]/g, "");

  const yes = ["ja", "j", "yes", "y", "ok", "okei", "bekreft", "bekrefter"];
  const no = ["nei", "n", "no", "avlys", "kanseller", "avbestill", "cancel"];
  const move = ["flytt", "flytte", "ombook", "ombestill", "endre", "reschedule"];

  if (yes.includes(first)) return "CONFIRMED";
  if (no.includes(first)) return "CANCELLED";
  if (move.includes(first) || text.includes("ny tid") || text.includes("annen tid")) {
    return "RESCHEDULE_REQUESTED";
  }
  return null;
}

/**
 * Validate Twilio's request signature (HMAC-SHA1 over the exact webhook URL +
 * sorted POST params, keyed by the auth token). The URL must match what the
 * Twilio number is configured to call.
 */
function isValidTwilioSignature(req: {
  header: (name: string) => string | undefined;
  body: Record<string, unknown>;
}): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.header("x-twilio-signature");
  if (!token || !signature) return false;

  const url =
    process.env.TWILIO_WEBHOOK_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/sms/inbound`
      : "");
  if (!url) return false;

  const params = req.body ?? {};
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + String(params[key]))
      .join("");
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * PUBLIC: POST /sms/inbound
 * Twilio calls this when a customer replies to a reminder SMS. We match the
 * reply to the most recent reminded/pending appointment for that phone number
 * and update its status (JA→bekreftet, NEI→avlyst, FLYTT→ombestilling).
 */
router.post("/inbound", async (req, res) => {
  try {
    const valid = isValidTwilioSignature(req);
    if (!valid && process.env.NODE_ENV === "production") {
      res.status(403).type("text/xml").send("<Response/>");
      return;
    }
    if (!valid) {
      console.warn(
        "[sms] Twilio signature check failed — processing anyway (non-production).",
      );
    }

    const from = digits(req.body?.From);
    const body = typeof req.body?.Body === "string" ? req.body.Body : "";
    const decision = classifyReply(body);

    if (from && decision) {
      const last8 = from.slice(-8);
      // A reply only makes sense for an appointment whose reminder was actually
      // sent, so we match REMINDED appointments and pick the most recent one for
      // this phone (the reminder they are most likely responding to).
      const candidates = await db
        .select()
        .from(appointmentTable)
        .where(eq(appointmentTable.status, "REMINDED"))
        .orderBy(desc(appointmentTable.updatedAt))
        .limit(500);
      const match = candidates.find(
        (a) => digits(a.clientPhone).slice(-8) === last8,
      );
      if (match) {
        // Atomic guard: only apply if it is still REMINDED, so a concurrent
        // dashboard action or duplicate reply cannot clobber a resolved status.
        const updated = await db
          .update(appointmentTable)
          .set({ status: decision, updatedAt: new Date() })
          .where(
            and(
              eq(appointmentTable.id, match.id),
              eq(appointmentTable.status, "REMINDED"),
            ),
          )
          .returning({ id: appointmentTable.id });
        if (updated.length) {
          console.info(
            `[sms] reply from ${from} → ${decision} (appointment ${match.id})`,
          );
        } else {
          console.warn(
            `[sms] reply from ${from} skipped — appointment ${match.id} no longer awaiting reply`,
          );
        }
      } else {
        console.warn(`[sms] reply from ${from} matched no reminded appointment`);
      }
    }

    // Empty TwiML: acknowledge without sending an auto-reply.
    res.type("text/xml").send("<Response/>");
  } catch (err) {
    console.error("[sms] inbound error:", err);
    res.type("text/xml").send("<Response/>");
  }
});

export default router;
