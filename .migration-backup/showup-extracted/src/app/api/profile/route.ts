import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

const VALID_BUSINESS_TYPES = ['tannlege', 'frisør', 'bilverksted', 'annet'] as const;

export async function PATCH(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const body = (await req.json().catch(() => ({}))) as { businessType?: unknown };
  const businessType = typeof body.businessType === 'string' ? body.businessType : '';
  if (!VALID_BUSINESS_TYPES.includes(businessType as (typeof VALID_BUSINESS_TYPES)[number])) {
    return NextResponse.json(
      { error: 'businessType must be one of: tannlege, frisør, bilverksted, annet' },
      { status: 400 },
    );
  }

  const now = new Date();
  const ends = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { businessType },
    create: { userId: user.id, businessType, trialStartDate: now, trialEndsAt: ends },
  });

  return NextResponse.json({ ok: true });
}
