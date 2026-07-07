import { NextResponse } from 'next/server';
import { VismaConnectResponseSchema } from '@/lib/contracts/visma';
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

  if (!env.VISMA_CLIENT_ID) {
    return NextResponse.json({ error: 'Visma er ikke konfigurert' }, { status: 503 });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/visma/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.VISMA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid offline_access',
    state: user.id,
  });

  const redirectUrl = `https://identity.vismaonline.com/connect/authorize?${params.toString()}`;

  return NextResponse.json(VismaConnectResponseSchema.parse({ redirectUrl }));
}
