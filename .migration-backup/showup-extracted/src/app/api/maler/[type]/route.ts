import 'server-only';
import { NextResponse } from 'next/server';
import { TemplateTypeSchema, TemplateUpsert } from '@/lib/contracts/maler';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ type: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const { type: rawType } = await params;
  const typeResult = TemplateTypeSchema.safeParse(rawType);
  if (!typeResult.success) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
  }

  const bodyResult = TemplateUpsert.safeParse(await req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return NextResponse.json({ error: bodyResult.error.flatten() }, { status: 400 });
  }

  const { language, body } = bodyResult.data;
  const type = typeResult.data;

  const row = await prisma.messageTemplate.upsert({
    where: { userId_type_language: { userId: user.id, type, language } },
    update: { body },
    create: { userId: user.id, type, language, body },
  });

  return NextResponse.json({
    id: row.id,
    type: row.type,
    language: row.language,
    body: row.body,
    updatedAt: row.updatedAt.toISOString(),
  });
}
