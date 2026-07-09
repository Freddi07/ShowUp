/**
 * Signed, expiring state for OAuth redirect flows (Google Calendar, and future
 * OAuth calendar connectors).
 *
 * The OAuth callback is a public route (the browser lands on it after the
 * provider redirect), so it cannot rely on the session to know which user
 * started the flow. Instead we carry a tamper-proof `state` param: an HMAC over
 * a small JSON payload signed with a server secret. The callback verifies the
 * signature and expiry, then trusts the embedded userId. This also doubles as
 * CSRF protection because the value is unguessable and short-lived.
 */
import crypto from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    // Fail closed: without a real secret, `state` could be forged, letting an
    // attacker bind their calendar tokens to another tenant via the callback.
    throw new Error(
      "OAuth state signing requires BETTER_AUTH_SECRET or SESSION_SECRET to be set",
    );
  }
  return secret;
}

export interface OAuthState {
  userId: string;
  provider: string;
  /** The exact redirect_uri used in the auth request; reused on token exchange. */
  redirectUri: string;
}

export function signState(payload: OAuthState): string {
  const body = {
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyState(token: string): OAuthState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.exp !== "number" || p.exp < Date.now()) return null;
  if (
    typeof p.userId !== "string" ||
    typeof p.provider !== "string" ||
    typeof p.redirectUri !== "string"
  ) {
    return null;
  }
  return { userId: p.userId, provider: p.provider, redirectUri: p.redirectUri };
}
