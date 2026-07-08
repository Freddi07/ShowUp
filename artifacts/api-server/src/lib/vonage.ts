/**
 * Vonage SMS sending + inbound webhook signature verification.
 *
 * Uses the Vonage SMS API (https://rest.nexmo.com/sms/json) authenticated with
 * an API key + secret. Credentials come from Replit Secrets:
 *   VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM
 * Inbound webhooks are verified with an optional signature secret:
 *   VONAGE_SIGNATURE_SECRET (+ VONAGE_SIGNATURE_METHOD, default "sha256")
 */

import crypto from "node:crypto";

interface VonageCredentials {
  apiKey: string;
  apiSecret: string;
  /** Sender: an owned Vonage number (E.164) or an alphanumeric sender ID. */
  from: string;
}

function getVonageCredentials(): VonageCredentials {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM;

  if (!apiKey || !apiSecret || !from) {
    throw new Error(
      "Missing Vonage credentials. Set VONAGE_API_KEY, VONAGE_API_SECRET " +
        "and VONAGE_FROM as Replit Secrets.",
    );
  }

  return { apiKey, apiSecret, from };
}

/**
 * Sends an SMS via the Vonage SMS API and returns the Vonage message id.
 * Throws on failure (caller decides how to surface it).
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { apiKey, apiSecret, from } = getVonageCredentials();

  // Vonage expects the recipient in international format without a leading "+".
  const form = new URLSearchParams({
    api_key: apiKey,
    api_secret: apiSecret,
    from,
    to: to.replace(/\D/g, ""),
    text: body,
  });

  const resp = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await resp.json().catch(() => null)) as {
    messages?: Array<{
      status?: string;
      "message-id"?: string;
      "error-text"?: string;
    }>;
  } | null;

  const msg = json?.messages?.[0];

  // Vonage returns HTTP 200 with a per-message "status" string; "0" means sent.
  if (!resp.ok || !msg || msg.status !== "0" || !msg["message-id"]) {
    const detail =
      msg?.["error-text"] ??
      (msg?.status ? `status ${msg.status}` : `${resp.status} ${resp.statusText}`);
    throw new Error(`Vonage send failed: ${detail}`);
  }

  return msg["message-id"];
}

/**
 * Verifies the signature Vonage attaches to signed inbound webhooks.
 *
 * The signature is computed over the request params (excluding `sig`), sorted by
 * key, joined as `&key=value` with `&`/`=` in values replaced by `_`, then
 * hashed with the account's configured method keyed by the signature secret.
 * Returns false when no secret is configured (caller decides the fallback).
 */
export function verifyVonageSignature(params: Record<string, unknown>): boolean {
  const secret = process.env.VONAGE_SIGNATURE_SECRET;
  if (!secret) return false;

  const sig = typeof params.sig === "string" ? params.sig : "";
  if (!sig) return false;

  const method = (process.env.VONAGE_SIGNATURE_METHOD || "sha256").toLowerCase();

  // Vonage excludes the `sig` param and any empty-valued params from the base
  // string, sorts the rest by key, and joins them as `&key=value` with `&`/`=`
  // inside values replaced by `_`.
  const base = Object.keys(params)
    .filter((key) => key !== "sig" && String(params[key]) !== "")
    .sort()
    .map((key) => `&${key}=${String(params[key]).replace(/[&=]/g, "_")}`)
    .join("");

  let expected: string;
  if (method === "md5hash") {
    expected = crypto.createHash("md5").update(base + secret).digest("hex");
  } else {
    const algo =
      method === "md5"
        ? "md5"
        : method === "sha1"
          ? "sha1"
          : method === "sha512"
            ? "sha512"
            : "sha256";
    expected = crypto.createHmac(algo, secret).update(base).digest("hex");
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected.toUpperCase()),
      Buffer.from(sig.toUpperCase()),
    );
  } catch {
    return false;
  }
}
