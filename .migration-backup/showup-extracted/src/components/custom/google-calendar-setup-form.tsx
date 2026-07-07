'use client';

import { CheckCircle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type {
  GoogleCalendarConnectResponse,
  GoogleCalendarStatusResponse,
} from '@/lib/contracts/google-calendar';

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <Badge variant="default" className="bg-green-600">
      <CheckCircle className="mr-1 size-3" />
      Tilkoblet
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="mr-1 size-3" />
      Ikke tilkoblet
    </Badge>
  );
}

export function GoogleCalendarSetupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<GoogleCalendarStatusResponse | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    apiFetch<GoogleCalendarStatusResponse>('/api/integrations/google-calendar/status', {
      method: 'GET',
    })
      .then(setStatus)
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('google_calendar') === 'connected') {
      setJustConnected(true);
    }
  }, []);

  async function handleConnect() {
    setPending(true);
    setError(undefined);

    try {
      const data = await apiFetch<GoogleCalendarConnectResponse>(
        '/api/integrations/google-calendar/connect',
        { method: 'GET' },
      );
      window.location.href = data.redirectUrl;
    } catch {
      setError('Kunne ikke starte Google Kalender-tilkobling. Prøv igjen.');
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {status && <StatusBadge connected={status.connected} />}
      </div>

      <p className="text-sm text-muted-foreground">
        Koble til Google Kalender via OAuth 2.0. Du blir videresendt til Google for å godkjenne
        tilgangen. ShowUp henter automatisk avtaler og synkroniserer dem kontinuerlig.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {justConnected && (
        <Alert className="border-green-600 bg-green-50 text-green-800">
          <CheckCircle className="size-4" />
          <AlertDescription>
            Google Kalender er koblet til og første synkronisering er startet.
          </AlertDescription>
        </Alert>
      )}

      {status?.connected && !justConnected && (
        <Alert className="border-green-600 bg-green-50 text-green-800">
          <CheckCircle className="size-4" />
          <AlertDescription>
            Google Kalender er tilkoblet. {status.appointmentCount} avtaler synkronisert.
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={handleConnect}
        disabled={pending}
        variant={status?.connected ? 'outline' : 'default'}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Omdirigerer…
          </>
        ) : (
          <>
            <ExternalLink className="mr-2 size-4" />
            {status?.connected ? 'Koble til på nytt' : 'Koble til via Google'}
          </>
        )}
      </Button>

      {status?.lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Sist synkronisert: {new Date(status.lastSyncAt).toLocaleString('nb-NO')}
        </p>
      )}
    </div>
  );
}
