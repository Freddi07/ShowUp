// @polsia:user-owned
import { NextResponse } from 'next/server';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { decryptJSON } from '@/lib/integrations/crypto';
import { createProvider } from '@/lib/integrations/registry';

export async function POST(req: Request) {
  if (req.headers.get('x-cron-secret') !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const integrations = await prisma.integration.findMany({
    where: { status: 'connected' },
  });

  let totalSynced = 0;

  for (const integration of integrations) {
    try {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'syncing' },
      });

      const creds = decryptJSON<Record<string, unknown>>(
        integration.credentialsEncrypted,
        env.ENCRYPTION_KEY,
      );
      const provider = createProvider(integration.provider, creds);
      const appointments = await provider.fetchAppointments(integration.lastSyncedAt ?? undefined);

      for (const apt of appointments) {
        await prisma.syncedAppointment.upsert({
          where: {
            integrationId_externalId: {
              integrationId: integration.id,
              externalId: apt.externalId,
            },
          },
          update: { appointmentData: apt.appointmentData as object, syncedAt: new Date() },
          create: {
            userId: integration.userId,
            integrationId: integration.id,
            externalId: apt.externalId,
            appointmentData: apt.appointmentData as object,
          },
        });

        if (apt.customer) {
          await upsertCustomer(integration.userId, {
            ...apt.customer,
            source: integration.provider,
          });
        }
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'connected', lastSyncedAt: new Date() },
      });

      totalSynced += appointments.length;
    } catch {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'error' },
      });
    }
  }

  return NextResponse.json({ synced: totalSynced });
}
