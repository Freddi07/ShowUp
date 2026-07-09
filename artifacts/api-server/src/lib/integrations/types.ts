/**
 * Shared contract for booking-source integrations.
 *
 * Every provider (Generic Webhook, Google Calendar, Outlook, Calendly, …) is a
 * self-contained module implementing `BookingSyncProvider`, registered in the
 * registry by its provider key. Core logic (routes, normalisation, the reminder
 * engine) only ever talks to this interface, so a new provider can be added
 * without touching the core.
 */

/** A booking from any source, normalised to what BookPling needs. */
export interface NormalizedBooking {
  /** Stable id from the source system; used for idempotent de-duplication. */
  externalId: string;
  /** When the appointment is scheduled (absolute time). */
  scheduledAt: Date;
  /** When to remind; defaults to 24h before scheduledAt when omitted. */
  reminderAt?: Date | null;
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    externalId?: string | null;
  };
  /** Original payload (no secrets) stored for the dashboard booking log. */
  raw?: Record<string, unknown>;
}

/** Result of a successful connect(): what to persist for the integration. */
export interface ConnectResult {
  /** Credentials to encrypt and store (tokens, webhook secret, …). */
  credentials: Record<string, unknown>;
  /** Optional non-secret external account/resource id. */
  externalAccountId?: string | null;
}

/** Per-request context handed to a provider instance. */
export interface ProviderContext {
  userId: string;
  integrationId: string;
  /** Decrypted, previously stored credentials for this integration. */
  credentials: Record<string, unknown>;
}

export interface BookingSyncProvider {
  /** Establish the connection; returns credentials to persist (encrypted). */
  connect(input: unknown): Promise<ConnectResult>;
  /** Tear down remote resources (webhook subscriptions, watch channels, …). */
  disconnect(): Promise<void>;
  /** Pull bookings created/updated since `since` (polling providers). */
  fetchNewBookings(since?: Date): Promise<NormalizedBooking[]>;
  /**
   * Verify an inbound webhook. MUST return false (or throw) on an invalid
   * signature. On success, returns the bookings contained in the payload.
   */
  verifyWebhook(
    payload: unknown,
    signature: string | undefined,
    rawBody?: string,
  ): Promise<NormalizedBooking[]>;
}
