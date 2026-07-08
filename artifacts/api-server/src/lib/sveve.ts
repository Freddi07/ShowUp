/**
 * Sveve SMS sending + inbound webhook token verification.
 *
 * Uses the Sveve HTTP API (https://sveve.no/SMS/SendMessage) authenticated with
 * an account username + API password. Credentials come from Replit Secrets:
 *   SVEVE_USER    - account username
 *   SVEVE_PASSWD  - API password (Sveve portal: API -> API-nøkkel)
 * Optional config (non-secret):
 *   SVEVE_FROM    - sender name shown on the phone (max 11 chars, no ÆØÅ).
 *                   Note: with reply=true Sveve overrides this with a numeric
 *                   reply number, so it mainly matters for non-reply sends.
 *   SVEVE_WEBHOOK_TOKEN - shared secret we embed in the inbound webhook URL and
 *                   verify on each inbound call (Sveve webhooks are unsigned).
 */

import crypto from "node:crypto";

interface SveveCredentials {
  user: string;
  passwd: string;
  from: string;
}

function getSveveCredentials(): SveveCredentials {
  const user = process.env.SVEVE_USER;
  const passwd = process.env.SVEVE_PASSWD;

  if (!user || !passwd) {
    throw new Error(
      "Missing Sveve credentials. Set SVEVE_USER and SVEVE_PASSWD " +
        "as Replit Secrets.",
    );
  }

  return { user, passwd, from: process.env.SVEVE_FROM || "BookPling" };
}

/** Strip to digits; Sveve accepts bare Norwegian (8-digit) or with country code. */
function toRecipient(raw: string): string {
  return typeof raw === "string" ? raw.replace(/\D/g, "") : "";
}

/**
 * Sends an SMS via the Sveve API and returns the Sveve message id.
 *
 * `reply: true` makes the message replyable (Sveve assigns a numeric reply
 * sender and forwards any reply to our configured webhook), which is what powers
 * customer confirm/cancel/reschedule replies. Throws on failure.
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { user, passwd, from } = getSveveCredentials();

  const payload = {
    user,
    passwd,
    to: toRecipient(to),
    msg: body,
    from,
    reply: true,
    f: "json",
  };

  const resp = await fetch("https://sveve.no/SMS/SendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await resp.json().catch(() => null)) as {
    response?: {
      msgOkCount?: number;
      ids?: Array<number | string>;
      fatalError?: string;
      errors?: Array<{ number?: string; message?: string } | string>;
    };
  } | null;

  const r = json?.response;
  const id = r?.ids?.[0];

  if (!resp.ok || !r || r.fatalError || id === undefined || id === null) {
    const detail =
      r?.fatalError ||
      r?.errors
        ?.map((e) => (typeof e === "string" ? e : e.message))
        .filter(Boolean)
        .join("; ") ||
      `${resp.status} ${resp.statusText}`;
    throw new Error(`Sveve send failed: ${detail}`);
  }

  return String(id);
}

/**
 * Verifies the shared-secret token Sveve echoes back on inbound webhooks.
 *
 * Sveve webhooks carry no signature, so we embed `?token=<SVEVE_WEBHOOK_TOKEN>`
 * in the webhook URL configured in the Sveve portal and check it on each call.
 * Returns false when the token is not configured (caller decides the fallback)
 * or does not match.
 */
export function verifySveveToken(params: Record<string, unknown>): boolean {
  const expected = process.env.SVEVE_WEBHOOK_TOKEN;
  if (!expected) return false;

  const got = typeof params.token === "string" ? params.token : "";
  if (!got) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
