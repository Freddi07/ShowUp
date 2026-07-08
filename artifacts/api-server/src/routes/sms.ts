import type { Request, Response } from "express";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { appointmentTable, customerTable } from "@workspace/db/schema";
import { verifyTwilioSignature } from "../lib/twilio";
import { sendPushToUser } from "../lib/push";

/** Human-readable Norwegian copy for each status a reply can produce. */
const REPLY_COPY: Record<
  "CONFIRMED" | "CANCELLED" | "RESCHEDULE_REQUESTED",
  { title: string; verb: string }
> = {
  CONFIRMED: { title: "Time bekreftet", verb: "bekreftet timen" },
  CANCELLED: { title: "Time avlyst", verb: "avlyste timen" },
  RESCHEDULE_REQUESTED: {
    title: "Ønsker ny tid",
    verb: "ønsker å flytte timen",
  },
};

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
 * PUBLIC: POST /sms/inbound
 * Twilio calls this when a customer replies to a reminder SMS. The webhook body
 * is form-encoded and carries `From` (sender), `Body` (text) and `MessageSid`.
 * Twilio signs the request with X-Twilio-Signature, which we verify with the
 * auth token. We match the reply to the most recent reminded appointment for
 * that phone number and update its status (JA→bekreftet, NEI→avlyst,
 * FLYTT→ombestilling).
 */
async function handleInbound(req: Request, res: Response) {
  try {
    // Verify Twilio's request signature. Behind Replit's proxy (trust proxy is
    // on) req.protocol/host reflect the public URL Twilio was configured to
    // call. Fail closed in production (reject spoofable status changes); warn
    // but process in development.
    const bodyParams = (req.body as Record<string, unknown>) ?? {};
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const valid = verifyTwilioSignature(
      fullUrl,
      bodyParams,
      req.header("X-Twilio-Signature"),
    );
    if (!valid && process.env.NODE_ENV === "production") {
      res.status(403).send("Forbidden");
      return;
    }
    if (!valid) {
      console.warn(
        "[sms] Twilio signature missing/invalid — processing anyway (non-production).",
      );
    }

    // Twilio inbound payload: `From` is the sender, `Body` is the message text.
    const from = digits(bodyParams.From);
    const body = typeof bodyParams.Body === "string" ? bodyParams.Body : "";
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
          // Notify the owning professional instantly (best-effort). Ownership
          // runs appointment → customer → userId; skip if the appointment isn't
          // linked to a customer we can attribute.
          if (match.customerId) {
            const [owner] = await db
              .select({ userId: customerTable.userId })
              .from(customerTable)
              .where(eq(customerTable.id, match.customerId))
              .limit(1);
            if (owner?.userId) {
              const copy = REPLY_COPY[decision];
              await sendPushToUser(owner.userId, {
                title: copy.title,
                body: `${match.clientName} ${copy.verb}.`,
                data: {
                  appointmentId: match.id,
                  customerId: match.customerId,
                  status: decision,
                },
              });
            }
          }
        } else {
          console.warn(
            `[sms] reply from ${from} skipped — appointment ${match.id} no longer awaiting reply`,
          );
        }
      } else {
        console.warn(`[sms] reply from ${from} matched no reminded appointment`);
      }
    }

    // Acknowledge with empty TwiML so Twilio sends no auto-reply and does not
    // retry the delivery.
    res.type("text/xml").status(200).send("<Response></Response>");
  } catch (err) {
    console.error("[sms] inbound error:", err);
    res.type("text/xml").status(200).send("<Response></Response>");
  }
}

router.get("/inbound", handleInbound);
router.post("/inbound", handleInbound);

export default router;
