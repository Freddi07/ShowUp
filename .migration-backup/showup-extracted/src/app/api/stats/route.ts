import 'server-only';
import { NextResponse } from 'next/server';
import { type StatsPeriod, StatsResponse, type StatsRow } from '@/lib/contracts/stats';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

function buildPeriod(rows: { status: string }[]): StatsPeriod {
  const sent = rows.length;
  const confirmed = rows.filter((r) => r.status === 'CONFIRMED').length;
  const cancelled = rows.filter((r) => r.status === 'CANCELLED').length;
  const rescheduleRequested = rows.filter((r) => r.status === 'RESCHEDULE_REQUESTED').length;
  const noResponse = rows.filter(
    (r) =>
      r.status === 'REMINDED' ||
      (r.status !== 'CONFIRMED' && r.status !== 'CANCELLED' && r.status !== 'RESCHEDULE_REQUESTED'),
  ).length;
  return { sent, confirmed, cancelled, rescheduleRequested, noResponse };
}

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const now = new Date();
  const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [recent, total] = await Promise.all([
    prisma.appointment.findMany({
      where: { customer: { userId: user.id }, createdAt: { gte: ago30 } },
      orderBy: { createdAt: 'asc' },
      select: { status: true, createdAt: true },
    }),
    prisma.appointment.findMany({
      where: { customer: { userId: user.id } },
      select: { status: true },
    }),
  ]);

  const last30d = buildPeriod(recent);
  const last7dRows = recent.filter((r) => r.createdAt >= ago7);
  const last7d = buildPeriod(last7dRows);
  const totalPeriod = buildPeriod(total);

  const dailyMap = new Map<string, number>();
  for (const r of recent) {
    const day = r.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const dailySeries: StatsRow[] = Array.from(dailyMap.entries()).map(([date, sent]) => ({
    date,
    sent,
  }));

  return NextResponse.json(
    StatsResponse.parse({ last7d, last30d, total: totalPeriod, dailySeries }),
  );
}
