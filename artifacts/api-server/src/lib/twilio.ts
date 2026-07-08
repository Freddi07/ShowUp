/**
 * Twilio SMS sending via the Replit Twilio connection.
 * Credentials are fetched fresh from the connection API (they can rotate),
 * mirroring the Stripe client pattern.
 */

interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiKeySecret: string;
  fromNumber: string;
}

async function getTwilioCredentials(): Promise<TwilioCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. " +
        "Ensure the Twilio integration is connected via the Integrations tab.",
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=twilio`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Twilio credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: Array<{
      settings?: {
        account_sid?: string;
        api_key?: string;
        api_key_secret?: string;
        phone_number?: string;
      };
    }>;
  };
  const s = data.items?.[0]?.settings;

  if (!s?.account_sid || !s.api_key || !s.api_key_secret || !s.phone_number) {
    throw new Error(
      "Twilio integration not connected or missing settings. " +
        "Connect Twilio via the Integrations tab first.",
    );
  }

  return {
    accountSid: s.account_sid,
    apiKey: s.api_key,
    apiKeySecret: s.api_key_secret,
    fromNumber: s.phone_number,
  };
}

/**
 * Sends an SMS via the Twilio REST API and returns the message SID.
 * Throws on failure (caller decides how to surface it).
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const { accountSid, apiKey, apiKeySecret, fromNumber } =
    await getTwilioCredentials();

  const auth = Buffer.from(`${apiKey}:${apiKeySecret}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const json = (await resp.json().catch(() => null)) as
    | { sid?: string; message?: string; code?: number }
    | null;

  if (!resp.ok || !json?.sid) {
    const detail = json?.message ?? `${resp.status} ${resp.statusText}`;
    throw new Error(`Twilio send failed: ${detail}`);
  }

  return json.sid;
}
