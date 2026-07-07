import 'server-only';
import { NextResponse } from 'next/server';
import { TemplateList } from '@/lib/contracts/maler';
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

  const rows = await prisma.messageTemplate.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });

  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    language: r.language,
    body: r.body,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json(TemplateList.parse({ items }));
}
