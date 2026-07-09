/**
 * Google Calendar provider (per-tenant OAuth).
 *
 * Each business connects their OWN Google account via the standard OAuth
 * consent flow using the app's Google client (GOOGLE_CLIENT_ID/SECRET). We store
 * their access + refresh tokens encrypted, then poll the primary calendar for
 * upcoming events and turn each into a booking (idempotent via the ledger).
 *
 * Token lifecycle: `ensureValidToken` refreshes an expired access token with the
 * stored refresh token and persists the new value itself (it has the
 * integrationId + crypto), so the polling loop never handles token plumbing.
 */
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { integrationTable } from "@workspace/db/schema";
import { encryptJSON } from "../crypto";
import { ProviderNotImplementedError } from "../registry";
import type {
  BookingSyncProvider,
  NormalizedBooking,
  ProviderContext,
} from "../types";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** Read-only access to the user's calendars/events is all we need. */
export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

/** How far ahead we look for upcoming appointments on each poll. */
const LOOKAHEAD_DAYS = 90;

export interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function buildGoogleAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: params.redirectUri,
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    // Force a consent screen so Google always returns a refresh token, even if
    // the user previously authorised this client for another scope (login).
    prompt: "consent",
    state: params.state,
  });
  return `${AUTH_ENDPOINT}?${q.toString()}`;
}

export async function exchangeGoogleCode(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleCredentials> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token || !data.refresh_token) {
    throw new Error("Google did not return the expected tokens");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("Google token refresh returned no access token");
  }
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
    resource?: boolean;
    self?: boolean;
  }>;
}

/** Pull the first plausible phone number out of free text (best-effort). */
function extractPhone(text: string): string | null {
  const match = text.match(/(\+?\d[\d\s()./-]{6,}\d)/);
  if (!match) return null;
  const cleaned = match[1].replace(/[^\d+]/g, "");
  const digitCount = cleaned.replace(/\D/g, "").length;
  return digitCount >= 8 ? cleaned : null;
}

function mapEvent(event: GoogleEvent): NormalizedBooking | null {
  if (!event.id || event.status === "cancelled") return null;
  // Only timed events are appointments; skip all-day (date-only) entries.
  const startDateTime = event.start?.dateTime;
  if (!startDateTime) return null;
  const scheduledAt = new Date(startDateTime);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  const summary = typeof event.summary === "string" ? event.summary.trim() : "";
  const guest = (event.attendees ?? []).find(
    (a) => a.email && !a.organizer && !a.resource && !a.self,
  );
  const name =
    guest?.displayName?.trim() ||
    guest?.email ||
    summary ||
    "Kalenderavtale";
  const email = guest?.email ?? null;
  const phone = extractPhone(
    [event.description, event.location, summary].filter(Boolean).join("\n"),
  );

  return {
    externalId: String(event.id),
    scheduledAt,
    customer: { name, phone, email },
    raw: {
      clientName: name,
      scheduledAt: scheduledAt.toISOString(),
      summary,
    },
  };
}

export function createGoogleCalendarProvider(
  ctx: ProviderContext,
): BookingSyncProvider {
  const creds = { ...(ctx.credentials as Partial<GoogleCredentials>) };

  async function ensureValidToken(): Promise<string> {
    if (!creds.accessToken || !creds.refreshToken) {
      throw new Error("Google Kalender er ikke tilkoblet");
    }
    // Refresh a little before expiry to avoid mid-request 401s.
    if (creds.expiresAt && creds.expiresAt - Date.now() > 60_000) {
      return creds.accessToken;
    }
    const refreshed = await refreshAccessToken(creds.refreshToken);
    creds.accessToken = refreshed.accessToken;
    creds.expiresAt = refreshed.expiresAt;
    if (ctx.integrationId) {
      await db
        .update(integrationTable)
        .set({
          credentialsEncrypted: encryptJSON({
            accessToken: creds.accessToken,
            refreshToken: creds.refreshToken,
            expiresAt: creds.expiresAt,
          }),
          updatedAt: new Date(),
        })
        .where(eq(integrationTable.id, ctx.integrationId));
    }
    return creds.accessToken;
  }

  return {
    async connect() {
      // Google uses a redirect-based OAuth flow handled by dedicated routes.
      throw new ProviderNotImplementedError("google_calendar");
    },

    async disconnect() {
      const token = creds.refreshToken ?? creds.accessToken;
      if (!token) return;
      try {
        await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch {
        // Best-effort: local disconnect proceeds regardless.
      }
    },

    async fetchNewBookings(): Promise<NormalizedBooking[]> {
      const accessToken = await ensureValidToken();
      const now = new Date();
      const timeMax = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000);
      const q = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: "250",
      });
      const res = await fetch(`${EVENTS_ENDPOINT}?${q.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Google Calendar events fetch failed: ${res.status}`);
      }
      const data = (await res.json()) as { items?: GoogleEvent[] };
      const bookings: NormalizedBooking[] = [];
      for (const event of data.items ?? []) {
        const booking = mapEvent(event);
        if (booking) bookings.push(booking);
      }
      return bookings;
    },

    async verifyWebhook(): Promise<NormalizedBooking[]> {
      // Google Calendar is polled, not webhook-driven, in this integration.
      return [];
    },
  };
}
