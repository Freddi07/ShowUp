import { NextResponse } from 'next/server';
import { VismaStatusResponseSchema } from '@/lib/contracts/visma';
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
    where: { userId_provider: { userId: user.id, provider: 'visma' } },
  });

  const customerCount = await prisma.customer.count({
    where: { userId: user.id, source: 'visma' },
  });

  return NextResponse.json(
    VismaStatusResponseSchema.parse({
      connected: config?.status === 'connected',
      lastSyncAt: config?.lastSyncedAt?.toISOString() ?? null,
      customerCount,
    }),
  );
}
