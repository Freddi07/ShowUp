// @polsia:user-owned
import crypto from 'node:crypto';
import { TripletexAppointmentListSchema, TripletexCustomerSchema } from '@/lib/contracts/tripletex';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { TripletexClient } from './client';

export class TripletexProvider implements IntegrationProvider {
  private client: TripletexClient;

  constructor(credentials: { token: string }) {
    this.client = new TripletexClient(credentials.token);
  }

  async connect(_credentials: unknown): Promise<void> {
    const valid = await this.client.validateToken();
    if (!valid) {
      throw new Error('Invalid Tripletex token');
    }
  }

  async disconnect(): Promise<void> {
    // No-op: credentials remain encrypted at rest
  }

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    const dateFrom = since
      ? since.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];

    const data = await this.client.get(`/appointment?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    const parsed = TripletexAppointmentListSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error('Invalid appointment response from Tripletex');
    }

    const results: SyncedAppointmentData[] = [];
    for (const apt of parsed.data.value) {
      let customer: SyncedAppointmentData['customer'];
      if (apt.customerId) {
        try {
          const rawCustomer = await this.client.get(`/customer/${apt.customerId}`);
          const parsedCustomer = TripletexCustomerSchema.safeParse(
            (rawCustomer as { value?: unknown }).value ?? rawCustomer,
          );
          if (parsedCustomer.success) {
            customer = {
              name: parsedCustomer.data.name,
              phone: parsedCustomer.data.phoneNumber ?? null,
              email: parsedCustomer.data.email ?? null,
              externalCustomerId: String(apt.customerId),
            };
          } else {
            customer = { externalCustomerId: String(apt.customerId) };
          }
        } catch {
          customer = { externalCustomerId: String(apt.customerId) };
        }
      }
      results.push({
        externalId: String(apt.id),
        appointmentData: apt as unknown as Record<string, unknown>,
        customer,
      });
    }
    return results;
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    // TODO: verify against Tripletex docs for the exact signing algorithm
    if (!env.TRIPLETEX_WEBHOOK_SECRET) {
      throw new Error('TRIPLETEX_WEBHOOK_SECRET is not configured');
    }

    const expectedSig = crypto
      .createHmac('sha256', env.TRIPLETEX_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSig) {
      throw new Error('Invalid Tripletex webhook signature');
    }

    const parsed = TripletexAppointmentListSchema.safeParse(payload);
    if (!parsed.success) return;

    // Find all connected Tripletex integrations and upsert synced appointments
    const integrations = await prisma.integration.findMany({
      where: { provider: 'tripletex', status: 'connected' },
    });

    for (const integration of integrations) {
      for (const apt of parsed.data.value) {
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

        if (apt.customerId) {
          await upsertCustomer(integration.userId, {
            externalCustomerId: String(apt.customerId),
            source: 'tripletex',
          });
        }
      }
    }
  }
}
