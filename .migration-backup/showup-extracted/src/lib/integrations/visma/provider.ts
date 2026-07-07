// @polsia:user-owned
import { VismaContactListSchema } from '@/lib/contracts/visma';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { NotImplementedError } from '@/lib/integrations/base';
import { encryptJSON } from '@/lib/integrations/crypto';

const TOKEN_URL = 'https://identity.vismaonline.com/connect/token';
const API_BASE = 'https://api.vismaonline.com/v2';

export class VismaProvider implements IntegrationProvider {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private integrationId: string | undefined;

  constructor(credentials: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    integrationId?: string;
  }) {
    this.accessToken = credentials.accessToken;
    this.refreshToken = credentials.refreshToken;
    this.expiresAt = credentials.expiresAt;
    this.integrationId = credentials.integrationId;
  }

  private async refreshIfNeeded(): Promise<void> {
    if (Date.now() < this.expiresAt - 60_000) return;
    if (!env.VISMA_CLIENT_ID || !env.VISMA_CLIENT_SECRET) return;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: env.VISMA_CLIENT_ID,
      client_secret: env.VISMA_CLIENT_SECRET,
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

    if (this.integrationId) {
      const newCreds = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
        integrationId: this.integrationId,
      };
      await prisma.integration.update({
        where: { id: this.integrationId },
        data: { credentialsEncrypted: encryptJSON(newCreds, env.ENCRYPTION_KEY) },
      });
    }
  }

  async connect(_credentials: unknown): Promise<void> {
    await this.refreshIfNeeded();
  }

  async disconnect(): Promise<void> {}

  async fetchAppointments(_since?: Date): Promise<SyncedAppointmentData[]> {
    await this.refreshIfNeeded();

    const res = await fetch(`${API_BASE}/customers`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Visma contacts fetch failed: ${res.status}`);
    }
    const raw = await res.json();
    const parsed = VismaContactListSchema.safeParse(raw);
    const contacts = parsed.success ? (parsed.data.Data ?? parsed.data.data ?? []) : [];

    return contacts.map((contact) => ({
      externalId: contact.customerId,
      appointmentData: contact as unknown as Record<string, unknown>,
      customer: {
        name: contact.name,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        externalCustomerId: contact.customerId,
      },
    }));
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<void> {
    throw new NotImplementedError('visma', 'handleWebhook');
  }
}
