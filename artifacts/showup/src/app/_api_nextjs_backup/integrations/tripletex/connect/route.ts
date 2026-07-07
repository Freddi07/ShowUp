import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TripletexConnectResponseSchema } from '@/lib/contracts/tripletex';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { encryptJSON } from '@/lib/integrations/crypto';
import { TripletexClient } from '@/lib/integrations/tripletex/client';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

const ConnectSchema = z.object({
  token: z.string().min(1),
});

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

  const { token } = parsed.data;

  const client = new TripletexClient(token);
  const isValid = await client.validateToken();
  if (!isValid) {
    return NextResponse.json({ errors: { token: 'Ugyldig Tripletex-token' } }, { status: 400 });
  }

  const credentialsEncrypted = encryptJSON({ token }, env.ENCRYPTION_KEY);

  await prisma.integration.upsert({
    where: { userId_provider: { userId: user.id, provider: 'tripletex' } },
    update: { credentialsEncrypted, status: 'connected' },
    create: { userId: user.id, provider: 'tripletex', credentialsEncrypted, status: 'connected' },
  });

  const response: z.infer<typeof TripletexConnectResponseSchema> = {
    success: true,
    provider: 'tripletex',
  };
  return NextResponse.json(TripletexConnectResponseSchema.parse(response));
}
