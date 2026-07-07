import 'server-only';
import { NextResponse } from 'next/server';
import { CustomerDetail } from '@/lib/contracts/customer';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          scheduledAt: true,
          reminderAt: true,
          status: true,
          clientName: true,
          twilioSid: true,
        },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: 'Ikke funnet' }, { status: 404 });

  return NextResponse.json(
    CustomerDetail.parse({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      source: customer.source,
      externalId: customer.externalId,
      appointmentCount: customer._count.appointments,
      lastVisitAt: customer.appointments[0]?.scheduledAt.toISOString() ?? null,
      createdAt: customer.createdAt.toISOString(),
      appointments: customer.appointments.map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt.toISOString(),
        reminderAt: a.reminderAt.toISOString(),
        status: a.status,
        clientName: a.clientName,
        twilioSid: a.twilioSid ?? null,
      })),
    }),
  );
}
