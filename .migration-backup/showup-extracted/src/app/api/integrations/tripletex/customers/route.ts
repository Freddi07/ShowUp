import { NextResponse } from 'next/server';
import type { z } from 'zod';
import {
  TripletexCustomerListSchema,
  TripletexSyncResponseSchema,
} from '@/lib/contracts/tripletex';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { decryptJSON } from '@/lib/integrations/crypto';
import { TripletexClient } from '@/lib/integrations/tripletex/client';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const config = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'tripletex' } },
  });

  if (config?.status !== 'connected' || !config.credentialsEncrypted) {
    return NextResponse.json({ error: 'Ikke tilkoblet' }, { status: 400 });
  }

  let token: string;
  try {
    token = decryptJSON<{ token: string }>(config.credentialsEncrypted, env.ENCRYPTION_KEY).token;
  } catch {
    return NextResponse.json({ error: 'Kunne ikke dekryptere token' }, { status: 500 });
  }

  const client = new TripletexClient(token);

  let data: z.infer<typeof TripletexCustomerListSchema>;
  try {
    data = (await client.get('/customer?count=100')) as z.infer<typeof TripletexCustomerListSchema>;
  } catch {
    return NextResponse.json({ error: 'Kunne ikke hente kunder fra Tripletex' }, { status: 502 });
  }

  const parsed = TripletexCustomerListSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ugyldig respons fra Tripletex' }, { status: 502 });
  }

  for (const c of parsed.data.value) {
    await upsertCustomer(user.id, {
      name: c.name,
      phone: c.phoneNumber ?? null,
      email: c.email ?? null,
      externalCustomerId: String(c.id),
      source: 'tripletex',
    });
  }

  await prisma.integration.update({
    where: { id: config.id },
    data: { lastSyncedAt: new Date() },
  });

  const response: z.infer<typeof TripletexSyncResponseSchema> = {
    synced: parsed.data.value.length,
  };
  return NextResponse.json(TripletexSyncResponseSchema.parse(response));
}
