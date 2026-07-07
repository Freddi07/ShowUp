import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { passwordResetEmail } from '@/lib/email/templates';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 3600 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, userId: target.id, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://showup-8.polsia.app';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: target.email,
    ...passwordResetEmail({ name: target.name ?? target.email, resetUrl }),
  });

  return NextResponse.json({ ok: true });
}
