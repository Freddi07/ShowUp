import { NextResponse } from 'next/server';
import { MicrosoftOutlookConnectResponseSchema } from '@/lib/contracts/microsoft-outlook';
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

  if (!env.MICROSOFT_CLIENT_ID) {
    return NextResponse.json({ error: 'Microsoft 365 er ikke konfigurert' }, { status: 503 });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/integrations/microsoft-outlook/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'Calendars.Read offline_access',
    state: user.id,
  });

  const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

  return NextResponse.json(MicrosoftOutlookConnectResponseSchema.parse({ redirectUrl }));
}
