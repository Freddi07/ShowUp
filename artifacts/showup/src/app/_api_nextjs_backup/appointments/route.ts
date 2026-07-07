import 'server-only';
import { NextResponse } from 'next/server';
import { AppointmentCreate, AppointmentItem, AppointmentList } from '@/lib/contracts/appointment';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const rows = await prisma.appointment.findMany({
    where: { customer: { userId: user.id } },
    orderBy: { scheduledAt: 'asc' },
  });
  const items = rows.map((r) =>
    AppointmentItem.parse({
      ...r,
      scheduledAt: r.scheduledAt.toISOString(),
      reminderAt: r.reminderAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }),
  );
  return NextResponse.json(AppointmentList.parse({ items }));
}

export async function POST(req: Request) {
  try {
    await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  try {
    const parsed = AppointmentCreate.safeParse(await req.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];
        if (message) {
          errors[field] = message;
        }
      }
      return NextResponse.json({ errors }, { status: 400 });
    }
    const row = await prisma.appointment.create({
      data: {
        clientName: parsed.data.clientName,
        clientPhone: parsed.data.clientPhone,
        scheduledAt: new Date(parsed.data.scheduledAt),
        reminderAt: new Date(parsed.data.reminderAt),
      },
    });
    const created = AppointmentItem.parse({
      ...row,
      scheduledAt: row.scheduledAt.toISOString(),
      reminderAt: row.reminderAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
