// @polsia:user-owned
import { FikenContactSchema } from '@/lib/contracts/fiken';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { NotImplementedError } from '@/lib/integrations/base';
import { encryptJSON } from '@/lib/integrations/crypto';

const TOKEN_URL = 'https://fiken.no/oauth/token';
const API_BASE = 'https://api.fiken.no/api/v2';

export class FikenProvider implements IntegrationProvider {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private companySlug: string;
  private integrationId: string | undefined;

  constructor(credentials: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    companySlug: string;
    integrationId?: string;
  }) {
    this.accessToken = credentials.accessToken;
    this.refreshToken = credentials.refreshToken;
    this.expiresAt = credentials.expiresAt;
    this.companySlug = credentials.companySlug;
    this.integrationId = credentials.integrationId;
  }

  private async refreshIfNeeded(): Promise<void> {
    if (Date.now() < this.expiresAt - 60_000) return;
    if (!env.FIKEN_CLIENT_ID || !env.FIKEN_CLIENT_SECRET) return;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: env.FIKEN_CLIENT_ID,
      client_secret: env.FIKEN_CLIENT_SECRET,
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
        companySlug: this.companySlug,
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

    const res = await fetch(`${API_BASE}/companies/${this.companySlug}/contacts`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Fiken contacts fetch failed: ${res.status}`);
    }
    const raw = (await res.json()) as unknown[];

    const results: SyncedAppointmentData[] = [];
    for (const item of raw) {
      const parsed = FikenContactSchema.safeParse(item);
      if (!parsed.success) continue;
      const c = parsed.data;
      results.push({
        externalId: String(c.contactId),
        appointmentData: c as unknown as Record<string, unknown>,
        customer: {
          name: c.name,
          phone: c.phoneNumber ?? null,
          email: c.email ?? null,
          externalCustomerId: String(c.contactId),
        },
      });
    }
    return results;
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<void> {
    throw new NotImplementedError('fiken', 'handleWebhook');
  }
}
