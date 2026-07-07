// @polsia:user-owned
import crypto from 'node:crypto';
import { FreshaAppointmentListSchema, FreshaWebhookEventSchema } from '@/lib/contracts/fresha';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';

const BASE_URL = 'https://api.fresha.com';

export class FreshaProvider implements IntegrationProvider {
  private apiKey: string;

  constructor(credentials: { apiKey: string }) {
    this.apiKey = credentials.apiKey;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async connect(_credentials: unknown): Promise<void> {
    const res = await fetch(`${BASE_URL}/partner/v1/supplier`, { headers: this.headers() });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Ugyldig Fresha API-nøkkel (${res.status})`);
    }
    // Non-401/403 errors are treated as soft (partner approval pending) — return without throwing.
  }

  async disconnect(): Promise<void> {}

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    const from = since ? since.toISOString() : new Date(0).toISOString();
    const res = await fetch(`${BASE_URL}/partner/v1/appointments?updated_since=${from}&limit=100`, {
      headers: this.headers(),
    });

    // 403 = partner approval pending; return empty to avoid cron error state.
    if (res.status === 403) return [];
    if (!res.ok) throw new Error(`Fresha appointments fetch failed: ${res.status}`);

    const raw = await res.json();
    const parsed = FreshaAppointmentListSchema.safeParse(raw);
    if (!parsed.success) return [];

    return parsed.data.data.map((apt) => ({
      externalId: String(apt.id),
      appointmentData: apt as unknown as Record<string, unknown>,
      customer: apt.client
        ? {
            name: apt.client.name,
            phone: apt.client.phone ?? null,
            email: apt.client.email ?? null,
            externalCustomerId: apt.client.id ? String(apt.client.id) : undefined,
          }
        : apt.client_id
          ? { externalCustomerId: String(apt.client_id) }
          : undefined,
    }));
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (env.FRESHA_WEBHOOK_SECRET) {
      const expectedSig = crypto
        .createHmac('sha256', env.FRESHA_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (signature !== expectedSig) {
        throw new Error('Invalid Fresha webhook signature');
      }
    }

    const parsed = FreshaWebhookEventSchema.safeParse(payload);
    if (!parsed.success) return;

    const event = parsed.data;
    const apt = event.data;
    if (!apt) return;

    const externalId = String(apt.id);
    const integrations = await prisma.integration.findMany({
      where: { provider: 'fresha', status: 'connected' },
    });

    for (const integration of integrations) {
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

      const customerData = apt.client
        ? {
            name: apt.client.name,
            phone: apt.client.phone ?? null,
            email: apt.client.email ?? null,
            externalCustomerId: apt.client.id ? String(apt.client.id) : undefined,
            source: 'fresha' as const,
          }
        : apt.client_id
          ? { externalCustomerId: String(apt.client_id), source: 'fresha' as const }
          : null;

      if (customerData) {
        await upsertCustomer(integration.userId, customerData);
      }

      if (event.event_type === 'booking.created' && apt.starts_at) {
        const scheduledAt = new Date(apt.starts_at);
        if (Number.isNaN(scheduledAt.getTime())) continue;

        // Prevent duplicate reminder rows on webhook re-delivery
        const existing = await prisma.appointment.findFirst({ where: { externalId } });
        if (existing) continue;

        const notifSettings = await prisma.notificationSettings.findUnique({
          where: { userId: integration.userId },
        });

        let reminderAt: Date;
        if (notifSettings?.remind24h) {
          reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
        } else if (notifSettings?.remind48h) {
          reminderAt = new Date(scheduledAt.getTime() - 48 * 60 * 60 * 1000);
        } else if (notifSettings?.remind2h) {
          reminderAt = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
        } else {
          reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
        }

        let customerId: string | undefined;
        if (customerData) {
          const customerRow = customerData.phone
            ? await prisma.customer.findFirst({
                where: { userId: integration.userId, phone: customerData.phone },
              })
            : customerData.externalCustomerId
              ? await prisma.customer.findFirst({
                  where: {
                    userId: integration.userId,
                    externalId: customerData.externalCustomerId,
                    source: 'fresha',
                  },
                })
              : null;
          customerId = customerRow?.id;
        }

        await prisma.appointment.create({
          data: {
            clientName: apt.client?.name ?? 'Ukjent',
            clientPhone: apt.client?.phone ?? '',
            scheduledAt,
            reminderAt,
            externalId,
            customerId: customerId ?? null,
          },
        });
      }

      if (event.event_type === 'booking.cancelled') {
        await prisma.appointment.updateMany({
          where: { externalId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }
    }
  }
}
