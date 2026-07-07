'use client';

import { CheckCircle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type { VismaConnectResponse, VismaStatusResponse } from '@/lib/contracts/visma';

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

export function VismaSetupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<VismaStatusResponse | null>(null);

  async function handleConnect() {
    setPending(true);
    setError(undefined);

    try {
      const data = await apiFetch<VismaConnectResponse>('/api/integrations/visma/connect', {
        method: 'GET',
      });
      window.location.href = data.redirectUrl;
    } catch {
      setError('Kunne ikke starte Visma-tilkobling. Prøv igjen.');
      setPending(false);
    }
  }

  useState(() => {
    apiFetch<VismaStatusResponse>('/api/integrations/visma/status', { method: 'GET' })
      .then(setStatus)
      .catch(() => {});
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {status && <StatusBadge connected={status.connected} />}
      </div>

      <p className="text-sm text-muted-foreground">
        Koble til Visma via OAuth 2.0. Du blir videresendt til Visma for å godkjenne tilgangen.
        ShowUp henter automatisk kundelister og oppdaterer kontaktbasen din.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status?.connected && (
        <Alert className="border-green-600 bg-green-50 text-green-800">
          <CheckCircle className="size-4" />
          <AlertDescription>
            Visma er tilkoblet. {status.customerCount} kunder synkronisert.
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
            {status?.connected ? 'Koble til på nytt' : 'Koble til via Visma'}
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
