import 'server-only';
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

  const rows = await prisma.appointment.findMany({
    where: { customer: { userId: user.id } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      scheduledAt: true,
      status: true,
      createdAt: true,
    },
  });

  const header = 'id,clientName,clientPhone,scheduledAt,status,createdAt\n';
  const lines = rows.map(
    (r) =>
      `${r.id},${JSON.stringify(r.clientName)},${JSON.stringify(r.clientPhone)},${r.scheduledAt.toISOString()},${r.status},${r.createdAt.toISOString()}`,
  );
  const csv = header + lines.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="statistikk.csv"',
    },
  });
}
