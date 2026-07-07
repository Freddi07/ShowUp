import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { OpusDentalStatusResponseSchema } from '@/lib/contracts/opus-dental';
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
    where: { userId_provider: { userId: user.id, provider: 'opus_dental' } },
  });

  const appointmentCount = await prisma.appointment.count({
    where: { externalId: { startsWith: 'opus_' } },
  });

  const response: z.infer<typeof OpusDentalStatusResponseSchema> = {
    connected: config?.status === 'connected',
    lastUploadAt: config?.lastSyncedAt?.toISOString() ?? null,
    appointmentCount,
  };

  return NextResponse.json(OpusDentalStatusResponseSchema.parse(response));
}
