import { NextResponse } from 'next/server';
import { EmekanikerStatusResponseSchema } from '@/lib/contracts/emekaniker';
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
    where: { userId_provider: { userId: user.id, provider: 'emekaniker' } },
  });

  const appointmentCount = await prisma.appointment.count({
    where: { externalId: { startsWith: 'emekaniker_' } },
  });

  return NextResponse.json(
    EmekanikerStatusResponseSchema.parse({
      connected: config?.status === 'connected',
      lastUploadAt: config?.lastSyncedAt?.toISOString() ?? null,
      appointmentCount,
    }),
  );
}
