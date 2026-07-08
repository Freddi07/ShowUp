import { Router } from "express";
import { auth } from "../lib/auth";

const router = Router();

/**
 * Native social sign-in bridge for the Expo app.
 *
 * The mobile app can't reuse the web social flow directly: the OAuth
 * PKCE/state cookie must be set inside the in-app browser session (a plain
 * `fetch` from the app would store it in the wrong cookie jar). So the app
 * opens `/api/mobile-oauth/<provider>` in an in-app browser, we start the
 * better-auth OAuth there, and after the provider callback we hand the signed
 * session token back to the app via its deep link (`returnUrl`).
 *
 * The signed session-cookie value is itself a valid `Authorization: Bearer`
 * token (verified by the bearer plugin), so the app stores it exactly like the
 * token it gets from email sign-in.
 */

/**
 * Only allow handing the (bearer-equivalent) session token to the Expo app's
 * own deep links. The `showup-mobile://` custom scheme is app-owned — a remote
 * attacker can't register it to read the token — so it's the sole production
 * target. `exp://` (Expo Go) and the exact Expo web dev domain are convenience
 * targets for on-device/preview testing and are allowed in development only,
 * so a crafted `returnUrl` can never exfiltrate a real token in production.
 */
function isAllowedReturnUrl(u: string): boolean {
  if (!u) return false;
  // App-owned custom scheme — safe in every environment.
  if (u.startsWith("showup-mobile://")) return true;

  if (process.env.NODE_ENV === "production") return false;

  // Development-only testing targets.
  if (u.startsWith("exp://")) return true;
  const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
  if (expoDomain) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "https:" && parsed.hostname === expoDomain;
    } catch {
      return false;
    }
  }
  return false;
}

/** Copy Set-Cookie headers from a fetch Response onto the Express response. */
function forwardSetCookies(
  from: Response,
  res: import("express").Response,
): void {
  const cookies =
    (from.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  for (const cookie of cookies) res.append("set-cookie", cookie);
}

/** Extract the signed session-token cookie value from a Cookie header. */
function readSessionToken(cookieHeader: string): string | null {
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    if (name.endsWith("session_token")) {
      return part.slice(eq + 1) || null;
    }
  }
  return null;
}

const SUPPORTED = new Set(["google", "apple"]);

// After the provider callback set the session cookie, deep-link the app with
// the token (or an error flag if the session is missing). Declared before the
// `/:provider` route so Express doesn't match "complete" as a provider.
router.get("/complete", (req, res) => {
  const returnUrl = String(req.query.returnUrl ?? "");
  if (!isAllowedReturnUrl(returnUrl)) {
    res.status(400).send("Invalid returnUrl");
    return;
  }
  const sep = returnUrl.includes("?") ? "&" : "?";
  const token = readSessionToken(req.headers.cookie ?? "");
  if (!token) {
    res.redirect(`${returnUrl}${sep}error=auth_failed`);
    return;
  }
  res.redirect(`${returnUrl}${sep}token=${encodeURIComponent(token)}`);
});

// Start the OAuth flow inside the in-app browser.
router.get("/:provider", async (req, res) => {
  const provider = req.params.provider;
  if (!SUPPORTED.has(provider)) {
    res.status(404).send("Unknown provider");
    return;
  }
  const returnUrl = String(req.query.returnUrl ?? "");
  if (!isAllowedReturnUrl(returnUrl)) {
    res.status(400).send("Invalid returnUrl");
    return;
  }

  const origin = `${req.protocol}://${req.headers.host}`;
  const completePath = `/api/mobile-oauth/complete?returnUrl=${encodeURIComponent(returnUrl)}`;

  const request = new Request(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider,
      callbackURL: completePath,
      errorCallbackURL: completePath,
    }),
  });

  try {
    const authRes = await auth.handler(request);
    const data = (await authRes.json()) as { url?: string };
    forwardSetCookies(authRes, res);
    if (!data.url) {
      res.status(500).send("Could not start sign-in");
      return;
    }
    res.redirect(data.url);
  } catch (err) {
    console.error("[mobile-oauth] start error:", err);
    res.status(500).send("Auth service error");
  }
});

export default router;
