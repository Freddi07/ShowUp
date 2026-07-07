import { NextResponse } from 'next/server';
import { GoogleCalendarConnectResponseSchema } from '@/lib/contracts/google-calendar';
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

  if (!env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Google Kalender er ikke konfigurert' }, { status: 503 });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: user.id,
  });

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.json(GoogleCalendarConnectResponseSchema.parse({ redirectUrl }));
}
