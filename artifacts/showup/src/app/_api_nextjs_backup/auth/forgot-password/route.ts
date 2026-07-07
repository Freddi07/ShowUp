import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { passwordResetEmail } from '@/lib/email/templates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-postadresse er påkrevd.' }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: {
        providerId: 'email',
        accountId: email,
      },
      include: {
        user: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!account || !account.user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: account.userId,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://showup-8.polsia.app';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: account.user.email,
      ...passwordResetEmail({ name: account.user.name, resetUrl }),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
