import 'server-only';
import type { AppointmentStatus as PrismaAppointmentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { SvarList, SvarStatusFilter } from '@/lib/contracts/svar';
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

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status') ?? 'all';
  const page = Math.max(0, Number(url.searchParams.get('page') ?? '0'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));

  const filterResult = SvarStatusFilter.safeParse(statusParam);
  const statusFilter =
    filterResult.success && filterResult.data !== 'all' ? filterResult.data : null;

  const where = {
    customer: { userId: user.id },
    ...(statusFilter ? { status: statusFilter as PrismaAppointmentStatus } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        scheduledAt: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientPhone: r.clientPhone,
    scheduledAt: r.scheduledAt.toISOString(),
    status: r.status,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json(SvarList.parse({ items, total }));
}
