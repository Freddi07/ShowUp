/**
 * MessageBird / Bird SMS sending + inbound webhook token verification.
 *
 * Uses the modern Bird Channels API (https://api.bird.com), which is what new
 * Bird accounts (access keys prefixed "bk_...") authenticate against. Sending
 * requires an active SMS channel (a number installed in the Bird dashboard);
 * the message is sent through that channel, which is also the sender shown on
 * the phone. Inbound replies are delivered to the channel's webhook (configured
 * to point at /api/sms/inbound).
 *
 * Credentials come from Replit Secrets:
 *   MESSAGEBIRD_ACCESS_KEY - Bird access key with SMS messaging scope
 * Required config (non-secret):
 *   MESSAGEBIRD_WORKSPACE_ID - Bird workspace UUID (from the dashboard URL)
 *   MESSAGEBIRD_CHANNEL_ID   - the SMS channel UUID to send through
 * Optional config (non-secret):
 *   MESSAGEBIRD_WEBHOOK_TOKEN - shared secret we embed in the inbound webhook URL
 *                   and verify on each inbound call.
 */

import crypto from "node:crypto";

interface BirdConfig {
  accessKey: string;
  workspaceId: string;
  channelId: string;
}

function getBirdConfig(): BirdConfig {
  const accessKey = process.env.MESSAGEBIRD_ACCESS_KEY;
  const workspaceId = process.env.MESSAGEBIRD_WORKSPACE_ID;
  const channelId = process.env.MESSAGEBIRD_CHANNEL_ID;

  if (!accessKey || !workspaceId || !channelId) {
    throw new Error(
      "Missing MessageBird/Bird config. Set MESSAGEBIRD_ACCESS_KEY (secret), " +
        "MESSAGEBIRD_WORKSPACE_ID and MESSAGEBIRD_CHANNEL_ID.",
    );
  }

  return { accessKey, workspaceId, channelId };
}

/**
 * Normalise a phone number to E.164 (with leading "+"), which the Bird API
 * expects as an identifierValue. A bare 8-digit Norwegian number is prefixed
 * with 47, and a leading "00" international prefix becomes "+".
 */
export function toRecipient(raw: string): string {
  let d = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = `47${d}`;
  return d ? `+${d}` : "";
}

/**
 * Sends an SMS via the Bird Channels API and returns the message id.
 * Throws on failure.
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { accessKey, workspaceId, channelId } = getBirdConfig();

  const payload = {
    receiver: { contacts: [{ identifierValue: toRecipient(to) }] },
    body: { type: "text", text: { text: body } },
  };

  const url = `https://api.bird.com/workspaces/${workspaceId}/channels/${channelId}/messages`;
  const resp = await fetch(url, {
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
    code?: string;
    message?: string;
  } | null;

  if (!resp.ok || !json?.id) {
    const detail =
      json?.message || json?.code || `${resp.status} ${resp.statusText}`;
    throw new Error(`MessageBird/Bird send failed: ${detail}`);
  }

  return json.id;
}

/**
 * Verifies the shared-secret token we embed in the inbound webhook URL.
 *
 * We embed `?token=<MESSAGEBIRD_WEBHOOK_TOKEN>` in the webhook URL configured on
 * the Bird SMS channel and check it on each call. Returns false when the token
 * is not configured (caller decides the fallback) or does not match.
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
