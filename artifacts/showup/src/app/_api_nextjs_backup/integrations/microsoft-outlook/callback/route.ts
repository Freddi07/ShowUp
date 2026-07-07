import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { encryptJSON } from '@/lib/integrations/crypto';
import { MicrosoftOutlookProvider } from '@/lib/integrations/microsoft-outlook/provider';

const BASE = env.NEXT_PUBLIC_APP_URL;

function errRedirect(code: string) {
  return NextResponse.redirect(new URL(`/dashboard/integrations?error=${code}`, BASE));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return errRedirect('microsoft_outlook_missing_params');

  const userExists = await prisma.user.findUnique({ where: { id: state } });
  if (!userExists) return errRedirect('microsoft_outlook_invalid_state');

  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    return errRedirect('microsoft_outlook_not_configured');
  }

  const redirectUri = `${BASE}/api/integrations/microsoft-outlook/callback`;

  let tokenData: { access_token: string; refresh_token: string; expires_in: number };
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      scope: 'Calendars.Read offline_access',
    });

    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

    tokenData = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  } catch {
    return errRedirect('microsoft_outlook_token_exchange');
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const userId = state;

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'microsoft_outlook' } },
    update: { status: 'connected', lastSyncedAt: new Date() },
    create: {
      userId,
      provider: 'microsoft_outlook',
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

  // First sync + subscription registration — best-effort
  try {
    const provider = new MicrosoftOutlookProvider(creds);
    const appointments = await provider.fetchAppointments();
    for (const appt of appointments) {
      await prisma.syncedAppointment.upsert({
        where: {
          integrationId_externalId: {
            integrationId: integration.id,
            externalId: appt.externalId,
          },
        },
        update: { appointmentData: appt.appointmentData as object, syncedAt: new Date() },
        create: {
          userId,
          integrationId: integration.id,
          externalId: appt.externalId,
          appointmentData: appt.appointmentData as object,
        },
      });
    }
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });
    try {
      await provider.registerSubscription(integration.id);
    } catch {
      // best-effort
    }
  } catch {
    // best-effort — proceed to redirect
  }

  return NextResponse.redirect(
    new URL('/dashboard/integrations?microsoft_outlook=connected', BASE),
  );
}
