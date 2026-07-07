// @polsia:user-owned
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { encryptJSON } from '@/lib/integrations/crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  integrationId?: string;
  syncToken?: string;
  channelId?: string;
  resourceId?: string;
  watchExpiry?: number;
}

interface GoogleEventAttendee {
  email?: string;
  displayName?: string;
  self?: boolean;
}

interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: GoogleEventAttendee[];
  [key: string]: unknown;
}

interface GoogleEventsResponse {
  items?: GoogleEvent[];
  nextSyncToken?: string;
}

export class GoogleCalendarProvider implements IntegrationProvider {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private integrationId: string | undefined;
  private syncToken: string | undefined;
  private channelId: string | undefined;
  private resourceId: string | undefined;
  private watchExpiry: number | undefined;

  constructor(credentials: Partial<GoogleCalendarCredentials> = {}) {
    this.accessToken = credentials.accessToken ?? '';
    this.refreshToken = credentials.refreshToken ?? '';
    this.expiresAt = credentials.expiresAt ?? 0;
    this.integrationId = credentials.integrationId;
    this.syncToken = credentials.syncToken;
    this.channelId = credentials.channelId;
    this.resourceId = credentials.resourceId;
    this.watchExpiry = credentials.watchExpiry;
  }

  private currentCreds(): GoogleCalendarCredentials {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      integrationId: this.integrationId,
      syncToken: this.syncToken,
      channelId: this.channelId,
      resourceId: this.resourceId,
      watchExpiry: this.watchExpiry,
    };
  }

  private async persistCreds(): Promise<void> {
    if (!this.integrationId) return;
    await prisma.integration.update({
      where: { id: this.integrationId },
      data: { credentialsEncrypted: encryptJSON(this.currentCreds(), env.ENCRYPTION_KEY) },
    });
  }

  private async refreshIfNeeded(): Promise<void> {
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) return;
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !this.refreshToken) return;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) return;

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;
    await this.persistCreds();
  }

  async connect(_credentials: unknown): Promise<void> {
    await this.refreshIfNeeded();
  }

  async disconnect(): Promise<void> {
    if (this.channelId && this.resourceId && this.accessToken) {
      try {
        await fetch(`${CALENDAR_API}/channels/stop`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: this.channelId, resourceId: this.resourceId }),
        });
      } catch {
        // best-effort
      }
    }
  }

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    await this.refreshIfNeeded();
    if (!this.accessToken) return [];

    // Renew watch channel if expiring within 24h
    if (this.watchExpiry && this.integrationId && Date.now() > this.watchExpiry - 86_400_000) {
      try {
        await this.registerWatch(this.integrationId);
      } catch {
        // best-effort renewal
      }
    }

    const urlObj = new URL(`${CALENDAR_API}/calendars/primary/events`);
    if (this.syncToken) {
      urlObj.searchParams.set('syncToken', this.syncToken);
    } else {
      const timeMin = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      urlObj.searchParams.set('timeMin', timeMin.toISOString());
      urlObj.searchParams.set('singleEvents', 'true');
    }

    const res = await fetch(urlObj.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 410 && this.syncToken) {
        // Sync token expired — reset and do full fetch
        this.syncToken = undefined;
        await this.persistCreds();
        return this.fetchAppointments(since);
      }
      return [];
    }

    const data = (await res.json()) as GoogleEventsResponse;

    if (data.nextSyncToken) {
      this.syncToken = data.nextSyncToken;
      await this.persistCreds();
    }

    const results: SyncedAppointmentData[] = [];
    for (const event of data.items ?? []) {
      if (!event.id || event.status === 'cancelled') continue;

      const attendee = event.attendees?.find((a) => !a.self && a.email);
      results.push({
        externalId: event.id,
        appointmentData: event as Record<string, unknown>,
        customer: attendee
          ? { name: attendee.displayName, email: attendee.email ?? null, phone: null }
          : undefined,
      });
    }

    return results;
  }

  async handleWebhook(payload: unknown, _signature: string): Promise<void> {
    const p = payload as Record<string, unknown> | null | undefined;
    // Validate channel ID if credentials are present
    if (this.channelId && p?.channelId && p.channelId !== this.channelId) {
      throw new Error('Channel ID mismatch');
    }
    // v1: acknowledge and let cron pick up changes via syncToken
  }

  async registerWatch(integrationId: string): Promise<void> {
    await this.refreshIfNeeded();
    if (!this.accessToken) return;

    const channelId = crypto.randomUUID();
    const address = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/webhook/google_calendar`;

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: channelId, type: 'web_hook', address }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as { resourceId?: string; expiration?: string };
    this.channelId = channelId;
    this.resourceId = data.resourceId;
    this.watchExpiry = data.expiration ? Number(data.expiration) : Date.now() + 7 * 86_400_000;
    this.integrationId = integrationId;
    await this.persistCreds();
  }
}
