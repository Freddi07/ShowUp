/**
 * Twilio SMS sending + inbound webhook signature verification.
 *
 * Uses the official `twilio` SDK, authenticated with the account SID + auth
 * token. The account already has an SMS-capable number and its inbound webhook
 * is configured to POST replies to /api/sms/inbound.
 *
 * Credentials come from Replit Secrets:
 *   TWILIO_ACCOUNT_SID  - account SID
 *   TWILIO_AUTH_TOKEN   - auth token (also the webhook signing key)
 *   TWILIO_PHONE_NUMBER - the "from" number in E.164 (e.g. +16592762665)
 */

import twilio from "twilio";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Missing Twilio credentials. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN " +
        "and TWILIO_PHONE_NUMBER as Replit Secrets.",
    );
  }

  return { accountSid, authToken, from };
}

/**
 * Normalise a phone number to E.164 (with leading "+"), which Twilio expects.
 * A bare 8-digit Norwegian number is prefixed with 47, and a leading "00"
 * international prefix becomes "+".
 */
export function toRecipient(raw: string): string {
  let d = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = `47${d}`;
  return d ? `+${d}` : "";
}

/**
 * Sends an SMS via Twilio and returns the message SID.
 * Throws on failure (including trial-account "unverified recipient" errors).
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { accountSid, authToken, from } = getTwilioConfig();
  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    to: toRecipient(to),
    from,
    body,
  });

  return message.sid;
}

/**
 * Verifies Twilio's X-Twilio-Signature on an inbound webhook using the official
 * SDK. `fullUrl` must be the exact URL Twilio was configured to call, and
 * `params` the POST body fields. Returns false when the token or signature is
 * missing so the caller can decide the fallback.
 */
export function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, unknown>,
  signature: string | undefined,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  return twilio.validateRequest(
    authToken,
    signature,
    fullUrl,
    params as Record<string, string>,
  );
}
