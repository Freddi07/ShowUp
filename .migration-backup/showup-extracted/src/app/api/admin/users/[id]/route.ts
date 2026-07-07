import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: 'Kan ikke slette din egen konto' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.userProfile.deleteMany({ where: { userId: id } }),
    prisma.messageTemplate.deleteMany({ where: { userId: id } }),
    prisma.notificationSettings.deleteMany({ where: { userId: id } }),
    prisma.integration.deleteMany({ where: { userId: id } }),
    prisma.customer.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
