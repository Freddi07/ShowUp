// @polsia:user-owned
import crypto from 'node:crypto';
import { BooksyAppointmentListSchema } from '@/lib/contracts/booksy';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';

const BASE_URL = 'https://partners.booksy.com/api/v1';

export class BooksyProvider implements IntegrationProvider {
  private apiKey: string;

  constructor(credentials: { apiKey: string }) {
    this.apiKey = credentials.apiKey;
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async connect(_credentials: unknown): Promise<void> {
    const res = await fetch(`${BASE_URL}/business`, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Booksy validation failed: ${res.status}`);
    }
  }

  async disconnect(): Promise<void> {}

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    const from = since ? since.toISOString() : new Date(0).toISOString();
    const res = await fetch(`${BASE_URL}/appointments?from=${from}&limit=100`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Booksy appointments fetch failed: ${res.status}`);
    }
    const raw = await res.json();
    const parsed = BooksyAppointmentListSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('Invalid Booksy appointment response');
    }

    return parsed.data.data.map((apt) => ({
      externalId: String(apt.id),
      appointmentData: apt as unknown as Record<string, unknown>,
      customer: apt.client
        ? {
            name: apt.client.name,
            phone: apt.client.phone ?? null,
            email: apt.client.email ?? null,
            externalCustomerId: String(apt.client.id),
          }
        : apt.client_id
          ? { externalCustomerId: String(apt.client_id) }
          : undefined,
    }));
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!env.BOOKSY_WEBHOOK_SECRET) {
      throw new Error('BOOKSY_WEBHOOK_SECRET is not configured');
    }

    const expectedSig = crypto
      .createHmac('sha256', env.BOOKSY_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSig) {
      throw new Error('Invalid Booksy webhook signature');
    }

    const parsed = BooksyAppointmentListSchema.safeParse(payload);
    if (!parsed.success) return;

    const integrations = await prisma.integration.findMany({
      where: { provider: 'booksy', status: 'connected' },
    });

    for (const integration of integrations) {
      for (const apt of parsed.data.data) {
        const externalId = String(apt.id);
        await prisma.syncedAppointment.upsert({
          where: { integrationId_externalId: { integrationId: integration.id, externalId } },
          update: { appointmentData: apt as object, syncedAt: new Date() },
          create: {
            userId: integration.userId,
            integrationId: integration.id,
            externalId,
            appointmentData: apt as object,
          },
        });
        if (apt.client) {
          await upsertCustomer(integration.userId, {
            name: apt.client.name,
            phone: apt.client.phone ?? null,
            email: apt.client.email ?? null,
            externalCustomerId: String(apt.client.id),
            source: 'booksy',
          });
        }
      }
    }
  }
}
