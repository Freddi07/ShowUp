/**
 * Generic Webhook provider.
 *
 * The most universal booking source: any system that can send an outbound HTTP
 * webhook can push bookings to BookPling. We hand the customer a unique URL and
 * a shared secret; the sender signs each request body with HMAC-SHA256, and we
 * verify that signature before turning the payload into an appointment.
 *
 * This provider is also the fallback for booking systems without an official API
 * (Onlinebooq's native webhooks, and manual setups for Timma/Fresha/Booksy).
 */
import crypto from "node:crypto";
import type {
  BookingSyncProvider,
  ConnectResult,
  NormalizedBooking,
  ProviderContext,
} from "../types";

/** Thrown when a webhook's HMAC signature is missing or does not match. */
export class WebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

/** Thrown when a webhook body cannot be parsed into a valid booking. */
export class WebhookPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookPayloadError";
  }
}

/** Generate a fresh webhook secret shown once in the dashboard. */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("base64url")}`;
}

/**
 * Compute the canonical HMAC-SHA256 signature (hex) for a raw request body.
 * Exported so tests and docs stay in lockstep with verification.
 */
export function computeSignature(secret: string, rawBody: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Strip an optional "sha256=" prefix and lower-case a provided signature. */
function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "").toLowerCase();
}

/** Timing-safe comparison of two hex signatures of equal length. */
function signaturesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(normalizeSignature(provided), "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Read the first present, non-empty string from a list of candidates. */
function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Parse an ISO-8601 / epoch-ms value into a valid Date, or null. */
function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Turn one payload object into a NormalizedBooking. Accepts both the documented
 * nested shape ({ customer: { name, phone } }) and a flat shape
 * ({ customerName, phone }) so integrators have less to get exactly right.
 */
export function parseBooking(input: unknown): NormalizedBooking {
  if (!input || typeof input !== "object") {
    throw new WebhookPayloadError("Booking payload must be a JSON object.");
  }
  const raw = input as Record<string, unknown>;
  const customerObj =
    raw.customer && typeof raw.customer === "object"
      ? (raw.customer as Record<string, unknown>)
      : {};

  const externalId = firstString(
    raw.externalId,
    raw.external_id,
    raw.id,
    raw.bookingId,
    raw.booking_id,
  );
  if (!externalId) {
    throw new WebhookPayloadError(
      "Missing required field: externalId (a unique id for the booking).",
    );
  }

  const scheduledAt = parseDate(
    raw.scheduledAt ?? raw.scheduled_at ?? raw.startsAt ?? raw.start ?? raw.time,
  );
  if (!scheduledAt) {
    throw new WebhookPayloadError(
      "Missing or invalid required field: scheduledAt (ISO-8601 datetime).",
    );
  }

  const name = firstString(
    customerObj.name,
    raw.customerName,
    raw.customer_name,
    raw.name,
    [firstString(customerObj.firstName, raw.firstName), firstString(customerObj.lastName, raw.lastName)]
      .filter(Boolean)
      .join(" ") || null,
  );
  if (!name) {
    throw new WebhookPayloadError(
      "Missing required field: customer.name.",
    );
  }

  const phone = firstString(customerObj.phone, raw.phone, raw.customerPhone, raw.mobile);
  const email = firstString(customerObj.email, raw.email, raw.customerEmail);
  const customerExternalId = firstString(customerObj.externalId, raw.customerId);
  const reminderAt = parseDate(raw.reminderAt ?? raw.reminder_at);

  return {
    externalId,
    scheduledAt,
    reminderAt,
    customer: { name, phone, email, externalId: customerExternalId },
    // Store a compact, non-secret snapshot for the dashboard booking log.
    raw: {
      clientName: name,
      scheduledAt: scheduledAt.toISOString(),
      ...(phone ? { phone } : {}),
    },
  };
}

/** Extract the array of booking objects from a webhook payload. */
function extractBookings(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.bookings)) return obj.bookings;
    return [payload];
  }
  throw new WebhookPayloadError("Webhook body must be a JSON object or array.");
}

export function createGenericWebhookProvider(
  ctx: ProviderContext,
): BookingSyncProvider {
  const secret =
    typeof ctx.credentials.secret === "string" ? ctx.credentials.secret : "";

  return {
    async connect(): Promise<ConnectResult> {
      // Establishing a generic webhook just mints a signing secret; there is no
      // remote resource to provision.
      return { credentials: { secret: generateWebhookSecret() }, externalAccountId: null };
    },

    async disconnect(): Promise<void> {
      // Nothing to tear down remotely — the sender simply stops posting.
    },

    async fetchNewBookings(): Promise<NormalizedBooking[]> {
      // Generic webhooks are push-only; there is nothing to poll.
      return [];
    },

    async verifyWebhook(
      payload: unknown,
      signature: string | undefined,
      rawBody?: string,
    ): Promise<NormalizedBooking[]> {
      if (!secret) {
        throw new WebhookSignatureError("Integration has no webhook secret.");
      }
      if (!signature) {
        throw new WebhookSignatureError("Missing X-BookPling-Signature header.");
      }
      // Verify the HMAC over the exact received bytes BEFORE doing any JSON
      // parsing, so an unauthenticated caller can never make us do parse work.
      const body = rawBody ?? (payload !== undefined ? JSON.stringify(payload) : "");
      const expected = computeSignature(secret, body);
      if (!signaturesMatch(expected, signature)) {
        throw new WebhookSignatureError();
      }
      // Signature is proven valid — only now is it safe to parse the payload.
      let parsed = payload;
      if (parsed === undefined) {
        try {
          parsed = JSON.parse(body || "{}");
        } catch {
          throw new WebhookPayloadError("Body is not valid JSON.");
        }
      }
      return extractBookings(parsed).map(parseBooking);
    },
  };
}
