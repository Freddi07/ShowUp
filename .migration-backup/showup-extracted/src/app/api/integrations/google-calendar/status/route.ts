import { NextResponse } from 'next/server';
import { GoogleCalendarStatusResponseSchema } from '@/lib/contracts/google-calendar';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const config = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'google_calendar' } },
  });

  const appointmentCount = config
    ? await prisma.syncedAppointment.count({
        where: { userId: user.id, integrationId: config.id },
      })
    : 0;

  return NextResponse.json(
    GoogleCalendarStatusResponseSchema.parse({
      connected: config?.status === 'connected',
      lastSyncAt: config?.lastSyncedAt?.toISOString() ?? null,
      appointmentCount,
    }),
  );
}
