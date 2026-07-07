import 'server-only';
import { NextResponse } from 'next/server';
import { CustomerCreate, CustomerItem, CustomerList } from '@/lib/contracts/customer';
import { upsertCustomer } from '@/lib/customers/upsert';
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

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const source = url.searchParams.get('source') ?? undefined;

  const rows = await prisma.customer.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(source ? { source } : {}),
    },
    include: {
      _count: { select: { appointments: true } },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 1, select: { scheduledAt: true } },
    },
    orderBy: { name: 'asc' },
  });

  const items = rows.map((r) =>
    CustomerItem.parse({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.source,
      externalId: r.externalId,
      appointmentCount: r._count.appointments,
      lastVisitAt: r.appointments[0]?.scheduledAt.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }),
  );

  return NextResponse.json(CustomerList.parse({ items }));
}

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const parsed = CustomerCreate.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await upsertCustomer(user.id, { ...parsed.data, source: 'manual' });

  const created = await prisma.customer.findFirst({
    where: { userId: user.id, name: parsed.data.name, source: 'manual' },
    include: {
      _count: { select: { appointments: true } },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 1, select: { scheduledAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!created) return NextResponse.json({ error: 'Intern feil' }, { status: 500 });

  return NextResponse.json(
    CustomerItem.parse({
      id: created.id,
      name: created.name,
      phone: created.phone,
      email: created.email,
      source: created.source,
      externalId: created.externalId,
      appointmentCount: created._count.appointments,
      lastVisitAt: created.appointments[0]?.scheduledAt.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    }),
    { status: 201 },
  );
}
