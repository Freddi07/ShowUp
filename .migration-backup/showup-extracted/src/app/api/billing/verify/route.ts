import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { trialStartedEmail } from '@/lib/email/templates';
import { requireAuth, type SessionUser } from '@/lib/require-auth';
import { verifyCheckoutSession } from '@/lib/stripe-billing/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const sessionId =
    body !== null && typeof body === 'object' && 'sessionId' in body
      ? String((body as Record<string, unknown>).sessionId)
      : '';

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const result = await verifyCheckoutSession({ sessionId });

  if (result.verified) {
    await prisma.userProfile.updateMany({
      where: { userId: user.id },
      data: { subscriptionStatus: 'active' },
    });

    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    });
    if (userRecord?.email) {
      const trialEndsAt = profile?.trialEndsAt
        ? profile.trialEndsAt.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '14 dager fra i dag';
      sendEmail({
        to: userRecord.email,
        ...trialStartedEmail({ name: userRecord.name ?? userRecord.email, trialEndsAt }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    verified: result.verified,
    plan: result.payment?.product_name ?? undefined,
  });
}
