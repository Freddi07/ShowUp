// @polsia:user-owned
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { encryptJSON } from '@/lib/integrations/crypto';

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_API = 'https://graph.microsoft.com/v1.0';

interface MicrosoftOutlookCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  integrationId?: string;
  deltaLink?: string;
  subscriptionId?: string;
  subscriptionExpiry?: number;
  clientState?: string;
}

interface GraphEventAttendee {
  type?: string;
  emailAddress?: { name?: string; address?: string };
}

interface GraphEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  organizer?: { emailAddress?: { address?: string } };
  attendees?: GraphEventAttendee[];
  [key: string]: unknown;
}

interface GraphEventsPage {
  value?: GraphEvent[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

export class MicrosoftOutlookProvider implements IntegrationProvider {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private integrationId: string | undefined;
  private deltaLink: string | undefined;
  private subscriptionId: string | undefined;
  private subscriptionExpiry: number | undefined;
  private clientState: string | undefined;

  constructor(credentials: Partial<MicrosoftOutlookCredentials> = {}) {
    this.accessToken = credentials.accessToken ?? '';
    this.refreshToken = credentials.refreshToken ?? '';
    this.expiresAt = credentials.expiresAt ?? 0;
    this.integrationId = credentials.integrationId;
    this.deltaLink = credentials.deltaLink;
    this.subscriptionId = credentials.subscriptionId;
    this.subscriptionExpiry = credentials.subscriptionExpiry;
    this.clientState = credentials.clientState;
  }

  private currentCreds(): MicrosoftOutlookCredentials {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      integrationId: this.integrationId,
      deltaLink: this.deltaLink,
      subscriptionId: this.subscriptionId,
      subscriptionExpiry: this.subscriptionExpiry,
      clientState: this.clientState,
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
    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET || !this.refreshToken) return;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      scope: 'Calendars.Read offline_access',
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) return;

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;
    await this.persistCreds();
  }

  async connect(_credentials: unknown): Promise<void> {
    await this.refreshIfNeeded();
  }

  async disconnect(): Promise<void> {
    // Subscription expires naturally; no explicit teardown needed in v1
  }

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    await this.refreshIfNeeded();
    if (!this.accessToken) return [];

    // Renew subscription if expiring within 24h
    if (
      this.subscriptionId &&
      this.subscriptionExpiry &&
      this.integrationId &&
      Date.now() > this.subscriptionExpiry - 86_400_000
    ) {
      try {
        await this.renewSubscription();
      } catch {
        // best-effort renewal
      }
    }

    let url: string;
    if (this.deltaLink) {
      url = this.deltaLink;
    } else {
      const timeMin = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      url = `${GRAPH_API}/me/events/delta?$filter=start/dateTime ge '${timeMin.toISOString()}'`;
    }

    const results: SyncedAppointmentData[] = [];

    // Follow pagination
    let nextUrl: string | undefined = url;
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Prefer: 'odata.maxpagesize=50',
        },
      });

      if (!res.ok) break;

      const page = (await res.json()) as GraphEventsPage;

      for (const event of page.value ?? []) {
        if (!event.id) continue;
        const attendee = event.attendees?.find((a) => a.emailAddress?.address);
        results.push({
          externalId: event.id,
          appointmentData: event as Record<string, unknown>,
          customer: attendee?.emailAddress?.address
            ? {
                name: attendee.emailAddress.name,
                email: attendee.emailAddress.address,
                phone: null,
              }
            : undefined,
        });
      }

      if (page['@odata.deltaLink']) {
        this.deltaLink = page['@odata.deltaLink'];
        await this.persistCreds();
        nextUrl = undefined;
      } else {
        nextUrl = page['@odata.nextLink'];
      }
    }

    return results;
  }

  async handleWebhook(payload: unknown, _signature: string): Promise<void> {
    const p = payload as {
      value?: Array<{ clientState?: string; subscriptionId?: string }>;
    } | null;
    // Validate clientState if credentials are present
    if (
      this.clientState &&
      p?.value?.[0]?.clientState &&
      p.value[0].clientState !== this.clientState
    ) {
      throw new Error('clientState mismatch');
    }
    // v1: acknowledge; cron picks up changes via deltaLink
  }

  private async renewSubscription(): Promise<void> {
    if (!this.subscriptionId || !this.accessToken) return;
    const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString();
    const res = await fetch(`${GRAPH_API}/subscriptions/${this.subscriptionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expirationDateTime }),
    });
    if (res.ok) {
      this.subscriptionExpiry = Date.now() + 4200 * 60 * 1000;
      await this.persistCreds();
    }
  }

  async registerSubscription(integrationId: string): Promise<void> {
    await this.refreshIfNeeded();
    if (!this.accessToken) return;

    const clientState = crypto.randomUUID();
    const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString();
    const notificationUrl = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/microsoft-outlook/webhook`;

    const res = await fetch(`${GRAPH_API}/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl,
        resource: 'me/events',
        expirationDateTime,
        clientState,
      }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as { id?: string };
    this.subscriptionId = data.id;
    this.subscriptionExpiry = Date.now() + 4200 * 60 * 1000;
    this.clientState = clientState;
    this.integrationId = integrationId;
    await this.persistCreds();
  }
}
