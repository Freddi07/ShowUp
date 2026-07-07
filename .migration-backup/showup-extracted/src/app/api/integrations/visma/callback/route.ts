import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { encryptJSON } from '@/lib/integrations/crypto';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=visma_missing_params', env.NEXT_PUBLIC_APP_URL),
    );
  }

  // Validate state is a real userId
  const userExists = await prisma.user.findUnique({ where: { id: state } });
  if (!userExists) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=visma_invalid_state', env.NEXT_PUBLIC_APP_URL),
    );
  }

  if (!env.VISMA_CLIENT_ID || !env.VISMA_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=visma_not_configured', env.NEXT_PUBLIC_APP_URL),
    );
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/visma/callback`;

  let tokenData: { access_token: string; refresh_token: string; expires_in: number };
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: env.VISMA_CLIENT_ID,
      client_secret: env.VISMA_CLIENT_SECRET,
    });

    const res = await fetch('https://identity.vismaonline.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status}`);
    }

    tokenData = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=visma_token_exchange', env.NEXT_PUBLIC_APP_URL),
    );
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const userId = state;

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'visma' } },
    update: { status: 'connected', lastSyncedAt: new Date() },
    create: {
      userId,
      provider: 'visma',
      credentialsEncrypted: '',
      status: 'connected',
    },
  });

  const creds = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    integrationId: integration.id,
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentialsEncrypted: encryptJSON(creds, env.ENCRYPTION_KEY) },
  });

  return NextResponse.redirect(
    new URL('/dashboard/integrations?visma=connected', env.NEXT_PUBLIC_APP_URL),
  );
}
