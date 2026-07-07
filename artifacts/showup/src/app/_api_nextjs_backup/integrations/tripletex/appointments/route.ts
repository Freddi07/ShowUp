import { NextResponse } from 'next/server';
import type { z } from 'zod';
import {
  TripletexAppointmentListSchema,
  TripletexSyncResponseSchema,
} from '@/lib/contracts/tripletex';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { decryptJSON } from '@/lib/integrations/crypto';
import { TripletexClient } from '@/lib/integrations/tripletex/client';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

function todayISO(): string {
  const [date] = new Date().toISOString().split('T');
  return date ?? '';
}

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const config = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'tripletex' } },
  });

  if (config?.status !== 'connected' || !config.credentialsEncrypted) {
    return NextResponse.json({ error: 'Ikke tilkoblet' }, { status: 400 });
  }

  let token: string;
  try {
    token = decryptJSON<{ token: string }>(config.credentialsEncrypted, env.ENCRYPTION_KEY).token;
  } catch {
    return NextResponse.json({ error: 'Kunne ikke dekryptere token' }, { status: 500 });
  }

  const client = new TripletexClient(token);

  const dateFrom = todayISO();
  const dateTo = todayISO();

  let data: z.infer<typeof TripletexAppointmentListSchema>;
  try {
    data = (await client.get(`/appointment?dateFrom=${dateFrom}&dateTo=${dateTo}`)) as z.infer<
      typeof TripletexAppointmentListSchema
    >;
  } catch {
    return NextResponse.json({ error: 'Kunne ikke hente avtaler fra Tripletex' }, { status: 502 });
  }

  const parsed = TripletexAppointmentListSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ugyldig respons fra Tripletex' }, { status: 502 });
  }

  let synced = 0;
  for (const apt of parsed.data.value) {
    if (!apt.customerId) continue;

    const customer = await prisma.customer.findFirst({
      where: { userId: user.id, externalId: String(apt.customerId), source: 'tripletex' },
    });

    const scheduledAt = new Date(apt.date);
    const reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);

    const apptExternalId = String(apt.id);
    const existingAppt = await prisma.appointment.findFirst({
      where: { externalId: apptExternalId },
    });

    if (existingAppt) {
      await prisma.appointment.update({
        where: { id: existingAppt.id },
        data: {
          clientName: apt.description ?? 'Tripletex-kunde',
          scheduledAt,
          reminderAt,
          customerId: customer?.id ?? null,
        },
      });
    } else {
      await prisma.appointment.create({
        data: {
          clientName: apt.description ?? 'Tripletex-kunde',
          clientPhone: customer?.phone ?? '',
          scheduledAt,
          reminderAt,
          externalId: apptExternalId,
          customerId: customer?.id ?? null,
        },
      });
    }

    // Also track in SyncedAppointment
    await prisma.syncedAppointment.upsert({
      where: { integrationId_externalId: { integrationId: config.id, externalId: apptExternalId } },
      update: { appointmentData: apt as object, syncedAt: new Date() },
      create: {
        userId: user.id,
        integrationId: config.id,
        externalId: apptExternalId,
        appointmentData: apt as object,
      },
    });

    synced++;
  }

  await prisma.integration.update({
    where: { id: config.id },
    data: { lastSyncedAt: new Date() },
  });

  const response: z.infer<typeof TripletexSyncResponseSchema> = { synced };
  return NextResponse.json(TripletexSyncResponseSchema.parse(response));
}
