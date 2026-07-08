/**
 * Telnyx SMS sending + inbound webhook signature verification.
 *
 * Uses the Telnyx Messaging API (https://api.telnyx.com/v2/messages)
 * authenticated with a single bearer API key. Credentials come from Replit
 * Secrets:
 *   TELNYX_API_KEY   - v2 API key ("KEY..."), sent as a bearer token
 *   TELNYX_FROM      - sender: a Telnyx number in E.164 (+47...) OR an
 *                      alphanumeric sender ID (e.g. "BookPling")
 * Optional:
 *   TELNYX_MESSAGING_PROFILE_ID - required only when TELNYX_FROM is an
 *                      alphanumeric sender ID; ignored otherwise
 *   TELNYX_PUBLIC_KEY - account Ed25519 public key (base64) used to verify
 *                      signed inbound webhooks
 */

import crypto from "node:crypto";

interface TelnyxCredentials {
  apiKey: string;
  /** Sender: a Telnyx number (E.164) or an alphanumeric sender ID. */
  from: string;
  /** Optional messaging profile, required for alphanumeric sender IDs. */
  messagingProfileId?: string;
}

function getTelnyxCredentials(): TelnyxCredentials {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Missing Telnyx credentials. Set TELNYX_API_KEY and TELNYX_FROM " +
        "as Replit Secrets.",
    );
  }

  return {
    apiKey,
    from,
    messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID || undefined,
  };
}

/**
 * Normalises a phone number to E.164 (leading "+"), defaulting to Norway (+47)
 * for bare local numbers. Telnyx requires the recipient in E.164 form.
 */
export function toE164(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  const d = s.replace(/\D/g, "");
  if (d.startsWith("00")) return "+" + d.slice(2); // international prefix
  if (d.length === 8) return "+47" + d; // bare Norwegian mobile
  if (d.startsWith("47") && d.length === 10) return "+" + d; // NO w/o "+"
  return "+" + d;
}

/**
 * Sends an SMS via the Telnyx Messaging API and returns the Telnyx message id.
 * Throws on failure (caller decides how to surface it).
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { apiKey, from, messagingProfileId } = getTelnyxCredentials();

  const payload: Record<string, unknown> = {
    from,
    to: toE164(to),
    text: body,
  };
  // Alphanumeric sender IDs must be tied to a messaging profile.
  if (messagingProfileId) payload.messaging_profile_id = messagingProfileId;

  const resp = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await resp.json().catch(() => null)) as {
    data?: { id?: string };
    errors?: Array<{ detail?: string; title?: string; code?: string }>;
  } | null;

  const id = json?.data?.id;
  if (!resp.ok || !id) {
    const detail =
      json?.errors
        ?.map((e) => e.detail || e.title)
        .filter(Boolean)
        .join("; ") || `${resp.status} ${resp.statusText}`;
    throw new Error(`Telnyx send failed: ${detail}`);
  }

  return id;
}

/**
 * Verifies the Ed25519 signature Telnyx attaches to webhooks.
 *
 * Telnyx signs `${timestamp}|${rawBody}` with the account private key and sends
 * the base64 signature in `telnyx-signature-ed25519` and the unix timestamp in
 * `telnyx-timestamp`. We verify against the account public key (base64, raw
 * 32-byte Ed25519 key) wrapped in an SPKI DER header. Returns false when the
 * public key is not configured (caller decides the fallback), the signature is
 * missing, or the timestamp is stale (replay protection).
 */
export function verifyTelnyxSignature(
  rawBody: Buffer | string,
  signatureB64: string,
  timestamp: string,
): boolean {
  const publicKeyB64 = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKeyB64) return false;
  if (!signatureB64 || !timestamp) return false;

  // Replay protection: reject timestamps more than 5 minutes from now.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const signed = Buffer.concat([Buffer.from(`${timestamp}|`, "utf8"), body]);

  try {
    // Wrap the raw 32-byte Ed25519 public key in the standard SPKI DER prefix
    // so Node can build a KeyObject from it.
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKeyB64, "base64"),
      ]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(null, signed, publicKey, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
