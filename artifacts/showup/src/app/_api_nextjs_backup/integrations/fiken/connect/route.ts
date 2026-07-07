import { NextResponse } from 'next/server';
import { FikenConnectResponseSchema } from '@/lib/contracts/fiken';
import { env } from '@/lib/env';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  if (!env.FIKEN_CLIENT_ID) {
    return NextResponse.json({ error: 'Fiken er ikke konfigurert' }, { status: 503 });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/fiken/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.FIKEN_CLIENT_ID,
    redirect_uri: redirectUri,
    state: user.id,
  });

  const redirectUrl = `https://fiken.no/oauth/authorize?${params.toString()}`;

  return NextResponse.json(FikenConnectResponseSchema.parse({ redirectUrl }));
}
