import { NextResponse } from 'next/server';
import { AutomasterStatusResponseSchema } from '@/lib/contracts/automaster';
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
    where: { userId_provider: { userId: user.id, provider: 'automaster' } },
  });

  const appointmentCount = await prisma.appointment.count({
    where: { externalId: { startsWith: 'automaster_' } },
  });

  return NextResponse.json(
    AutomasterStatusResponseSchema.parse({
      connected: config?.status === 'connected',
      lastUploadAt: config?.lastSyncedAt?.toISOString() ?? null,
      appointmentCount,
    }),
  );
}
