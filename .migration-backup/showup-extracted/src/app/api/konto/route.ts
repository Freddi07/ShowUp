import 'server-only';
import { NextResponse } from 'next/server';
import { KontoPatch, KontoProfile } from '@/lib/contracts/konto';
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

  const [profile, dbUser] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }),
  ]);

  return NextResponse.json(
    KontoProfile.parse({
      name: dbUser?.name ?? null,
      email: dbUser?.email ?? user.email,
      businessType: profile?.businessType ?? null,
      phone: profile?.phone ?? null,
    }),
  );
}

export async function PATCH(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const bodyResult = KontoPatch.safeParse(await req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return NextResponse.json({ error: bodyResult.error.flatten() }, { status: 400 });
  }

  const { phone, businessType } = bodyResult.data;
  const updateData: Record<string, unknown> = {};
  if (phone !== undefined) updateData.phone = phone;
  if (businessType !== undefined) updateData.businessType = businessType;

  const now = new Date();
  const ends = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: updateData,
    create: { userId: user.id, trialStartDate: now, trialEndsAt: ends, ...updateData },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  await prisma.$transaction([
    prisma.userProfile.deleteMany({ where: { userId: user.id } }),
    prisma.messageTemplate.deleteMany({ where: { userId: user.id } }),
    prisma.notificationSettings.deleteMany({ where: { userId: user.id } }),
    prisma.integration.deleteMany({ where: { userId: user.id } }),
    prisma.customer.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
