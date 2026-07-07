import 'server-only';
import { NextResponse } from 'next/server';
import { AdminUsersResponse } from '@/lib/contracts/admin-users';
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
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || undefined;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      sessions: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const userIds = users.map((u) => u.id);
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, businessType: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const mapped = users.map((u) => ({
    id: u.id,
    name: u.name ?? '',
    email: u.email,
    businessType: profileMap.get(u.id)?.businessType ?? null,
    createdAt: u.createdAt.toISOString(),
    lastLogin: u.sessions[0]?.updatedAt?.toISOString() ?? null,
    banned: u.banned ?? false,
  }));

  return NextResponse.json(AdminUsersResponse.parse({ users: mapped, total: mapped.length }));
}
