import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { TripletexStatusResponseSchema } from '@/lib/contracts/tripletex';
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
    where: { userId_provider: { userId: user.id, provider: 'tripletex' } },
  });

  const customerCount = await prisma.customer.count({
    where: { source: 'tripletex' },
  });

  const response: z.infer<typeof TripletexStatusResponseSchema> = {
    connected: config?.status === 'connected',
    lastSyncAt: config?.lastSyncedAt?.toISOString() ?? null,
    customerCount,
  };

  return NextResponse.json(TripletexStatusResponseSchema.parse(response));
}
