import { NextResponse } from 'next/server';
import { FikenCompanySchema } from '@/lib/contracts/fiken';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { encryptJSON } from '@/lib/integrations/crypto';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=fiken_missing_params', env.NEXT_PUBLIC_APP_URL),
    );
  }

  const userExists = await prisma.user.findUnique({ where: { id: state } });
  if (!userExists) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=fiken_invalid_state', env.NEXT_PUBLIC_APP_URL),
    );
  }

  if (!env.FIKEN_CLIENT_ID || !env.FIKEN_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=fiken_not_configured', env.NEXT_PUBLIC_APP_URL),
    );
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/fiken/callback`;

  let tokenData: { access_token: string; refresh_token: string; expires_in: number };
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: env.FIKEN_CLIENT_ID,
      client_secret: env.FIKEN_CLIENT_SECRET,
    });

    const res = await fetch('https://fiken.no/oauth/token', {
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
      new URL('/dashboard/integrations?error=fiken_token_exchange', env.NEXT_PUBLIC_APP_URL),
    );
  }

  // Get first company slug
  let companySlug = 'default';
  try {
    const companiesRes = await fetch('https://api.fiken.no/api/v2/companies', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (companiesRes.ok) {
      const companies = (await companiesRes.json()) as unknown[];
      const first = companies[0];
      const parsed = FikenCompanySchema.safeParse(first);
      if (parsed.success) {
        companySlug = parsed.data.slug;
      }
    }
  } catch {
    // Use default slug, sync will fail gracefully
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const userId = state;

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'fiken' } },
    update: { status: 'connected', lastSyncedAt: new Date() },
    create: {
      userId,
      provider: 'fiken',
      credentialsEncrypted: '',
      status: 'connected',
    },
  });

  const creds = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    companySlug,
    integrationId: integration.id,
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentialsEncrypted: encryptJSON(creds, env.ENCRYPTION_KEY) },
  });

  return NextResponse.redirect(
    new URL('/dashboard/integrations?fiken=connected', env.NEXT_PUBLIC_APP_URL),
  );
}
