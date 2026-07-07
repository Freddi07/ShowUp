import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    // Fail-open: profile creation may be in-flight for brand new users
    return NextResponse.json({
      trialActive: true,
      trialEndsAt: null,
      paymentMethodCollected: false,
      subscriptionStatus: null,
    });
  }

  const trialActive = profile.trialEndsAt > new Date();
  return NextResponse.json({
    trialActive,
    trialEndsAt: profile.trialEndsAt.toISOString(),
    paymentMethodCollected: profile.paymentMethodCollected,
    subscriptionStatus: profile.subscriptionStatus ?? null,
  });
}
