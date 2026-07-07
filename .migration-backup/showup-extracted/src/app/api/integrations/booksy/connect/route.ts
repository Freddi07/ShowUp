import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BooksyConnectResponseSchema } from '@/lib/contracts/booksy';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { BooksyProvider } from '@/lib/integrations/booksy/provider';
import { encryptJSON } from '@/lib/integrations/crypto';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

const ConnectSchema = z.object({ apiKey: z.string().min(1) });

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { apiKey } = parsed.data;

  try {
    const provider = new BooksyProvider({ apiKey });
    await provider.connect(null);
  } catch {
    return NextResponse.json({ errors: { apiKey: 'Ugyldig Booksy API-nøkkel' } }, { status: 400 });
  }

  const credentialsEncrypted = encryptJSON({ apiKey }, env.ENCRYPTION_KEY);

  await prisma.integration.upsert({
    where: { userId_provider: { userId: user.id, provider: 'booksy' } },
    update: { credentialsEncrypted, status: 'connected' },
    create: { userId: user.id, provider: 'booksy', credentialsEncrypted, status: 'connected' },
  });

  return NextResponse.json(
    BooksyConnectResponseSchema.parse({ success: true, provider: 'booksy' }),
  );
}
