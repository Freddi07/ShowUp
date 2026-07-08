/**
 * MessageBird (Bird) SMS sending + inbound webhook token verification.
 *
 * Uses the classic MessageBird REST API (https://rest.messagebird.com/messages)
 * authenticated with an API access key. This is the simplest MessageBird path:
 * an alphanumeric sender ("BookPling") works for outbound in Norway with no
 * number to purchase. Receiving replies (JA/NEI/FLYTT) still requires a
 * dedicated virtual number on the MessageBird side whose inbound webhook points
 * at /api/sms/inbound.
 *
 * Credentials come from Replit Secrets:
 *   MESSAGEBIRD_ACCESS_KEY - live API access key (Dashboard -> Developers -> API access)
 * Optional config (non-secret):
 *   MESSAGEBIRD_ORIGINATOR - sender shown on the phone. Alphanumeric (max 11
 *                   chars, no ÆØÅ) for one-way, or the virtual number in
 *                   international format for two-way replies. Default "BookPling".
 *   MESSAGEBIRD_WEBHOOK_TOKEN - shared secret we embed in the inbound webhook URL
 *                   and verify on each inbound call.
 */

import crypto from "node:crypto";

interface MessageBirdConfig {
  accessKey: string;
  originator: string;
}

function getMessageBirdConfig(): MessageBirdConfig {
  const accessKey = process.env.MESSAGEBIRD_ACCESS_KEY;

  if (!accessKey) {
    throw new Error(
      "Missing MessageBird credentials. Set MESSAGEBIRD_ACCESS_KEY as a Replit Secret.",
    );
  }

  return {
    accessKey,
    originator: process.env.MESSAGEBIRD_ORIGINATOR || "BookPling",
  };
}

/**
 * Normalise a phone number to international MSISDN digits (no "+").
 * MessageBird needs a country code, so a bare 8-digit Norwegian number is
 * prefixed with 47, and a leading "00" international prefix is stripped.
 */
export function toRecipient(raw: string): string {
  let d = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = `47${d}`;
  return d;
}

/**
 * Sends an SMS via the MessageBird REST API and returns the message id.
 * Throws on failure.
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { accessKey, originator } = getMessageBirdConfig();

  const payload = {
    originator,
    recipients: [toRecipient(to)],
    body,
  };

  const resp = await fetch("https://rest.messagebird.com/messages", {
    method: "POST",
    headers: {
      Authorization: `AccessKey ${accessKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await resp.json().catch(() => null)) as {
    id?: string;
    errors?: Array<{ description?: string; code?: number }>;
  } | null;

  if (!resp.ok || !json?.id) {
    const detail =
      json?.errors
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `${resp.status} ${resp.statusText}`;
    throw new Error(`MessageBird send failed: ${detail}`);
  }

  return json.id;
}

/**
 * Verifies the shared-secret token we embed in the inbound webhook URL.
 *
 * We embed `?token=<MESSAGEBIRD_WEBHOOK_TOKEN>` in the webhook URL configured on
 * the MessageBird number/flow and check it on each call. Returns false when the
 * token is not configured (caller decides the fallback) or does not match.
 */
export function verifyWebhookToken(params: Record<string, unknown>): boolean {
  const expected = process.env.MESSAGEBIRD_WEBHOOK_TOKEN;
  if (!expected) return false;

  const got = typeof params.token === "string" ? params.token : "";
  if (!got) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
