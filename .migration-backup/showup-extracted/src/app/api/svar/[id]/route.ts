import 'server-only';
import { NextResponse } from 'next/server';
import { SvarPatch } from '@/lib/contracts/svar';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  const appt = await prisma.appointment.findFirst({
    where: { id, customer: { userId: user.id } },
  });
  if (!appt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bodyResult = SvarPatch.safeParse(await req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return NextResponse.json({ error: bodyResult.error.flatten() }, { status: 400 });
  }

  const { status, action } = bodyResult.data;

  if (action === 'send_followup') {
    const { sendSms } = await import('@/lib/business/twilio');
    const followUpBody = `Hei ${appt.clientName}, vi har ikke mottatt svar fra deg angående avtalen din ${appt.scheduledAt.toLocaleDateString('nb-NO')}. Svar JA for å bekrefte, NEI for å kansellere. [ref:${appt.id}]`;
    await sendSms(appt.clientPhone, followUpBody);
    return NextResponse.json({ ok: true });
  }

  if (status) {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ error: 'No action or status provided' }, { status: 400 });
}
