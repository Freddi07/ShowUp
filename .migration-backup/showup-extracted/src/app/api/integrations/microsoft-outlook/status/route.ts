import { NextResponse } from 'next/server';
import { MicrosoftOutlookStatusResponseSchema } from '@/lib/contracts/microsoft-outlook';
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
    where: { userId_provider: { userId: user.id, provider: 'microsoft_outlook' } },
  });

  const appointmentCount = config
    ? await prisma.syncedAppointment.count({
        where: { userId: user.id, integrationId: config.id },
      })
    : 0;

  return NextResponse.json(
    MicrosoftOutlookStatusResponseSchema.parse({
      connected: config?.status === 'connected',
      lastSyncAt: config?.lastSyncedAt?.toISOString() ?? null,
      appointmentCount,
    }),
  );
}
