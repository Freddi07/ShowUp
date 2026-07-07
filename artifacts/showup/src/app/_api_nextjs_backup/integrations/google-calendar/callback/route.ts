import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { encryptJSON } from '@/lib/integrations/crypto';
import { GoogleCalendarProvider } from '@/lib/integrations/google-calendar/provider';

const BASE = env.NEXT_PUBLIC_APP_URL;

function errRedirect(code: string) {
  return NextResponse.redirect(new URL(`/dashboard/integrations?error=${code}`, BASE));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return errRedirect('google_calendar_missing_params');

  const userExists = await prisma.user.findUnique({ where: { id: state } });
  if (!userExists) return errRedirect('google_calendar_invalid_state');

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return errRedirect('google_calendar_not_configured');
  }

  const redirectUri = `${BASE}/api/integrations/google-calendar/callback`;

  let tokenData: { access_token: string; refresh_token: string; expires_in: number };
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
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
    return errRedirect('google_calendar_token_exchange');
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const userId = state;

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'google_calendar' } },
    update: { status: 'connected', lastSyncedAt: new Date() },
    create: {
      userId,
      provider: 'google_calendar',
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

  // First sync + watch registration — best-effort
  try {
    const provider = new GoogleCalendarProvider(creds);
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
      await provider.registerWatch(integration.id);
    } catch {
      // best-effort
    }
  } catch {
    // best-effort — proceed to redirect
  }

  return NextResponse.redirect(new URL('/dashboard/integrations?google_calendar=connected', BASE));
}
