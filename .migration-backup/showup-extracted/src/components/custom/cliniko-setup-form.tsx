'use client';

import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import type { ClinikoConnectResponse, ClinikoStatusResponse } from '@/lib/contracts/cliniko';

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

export function ClinikoSetupForm() {
  const [apiKey, setApiKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<ClinikoStatusResponse | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(false);

    try {
      await apiFetch<ClinikoConnectResponse>('/api/integrations/cliniko/connect', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      });
      setSuccess(true);
      const newStatus = await apiFetch<ClinikoStatusResponse>('/api/integrations/cliniko/status', {
        method: 'GET',
      });
      setStatus(newStatus);
    } catch (err) {
      const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
      if (cause && typeof cause === 'object' && 'errors' in cause) {
        const errors = (cause as { errors: Record<string, string> }).errors;
        if (errors.apiKey) {
          setError(errors.apiKey);
          setPending(false);
          return;
        }
      }
      setError('Kunne ikke koble til Cliniko. Sjekk at API-nøkkelen er gyldig.');
    }

    setPending(false);
  }

  useState(() => {
    apiFetch<ClinikoStatusResponse>('/api/integrations/cliniko/status', { method: 'GET' })
      .then(setStatus)
      .catch(() => {});
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {status && <StatusBadge connected={status.connected} />}
      </div>

      <ol className="space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            1
          </span>
          <span>Logg inn på Cliniko og gå til Innstillinger → API-nøkler</span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          <span>Klikk &ldquo;Legg til API-nøkkel&rdquo; og kopier nøkkelen</span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            3
          </span>
          <span>Lim inn nøkkelen nedenfor og klikk &ldquo;Koble til&rdquo;</span>
        </li>
      </ol>

      <form onSubmit={handleConnect} className="flex flex-col gap-3" noValidate>
        <div className="space-y-1">
          <Label htmlFor="cliniko-api-key">API-nøkkel</Label>
          <Input
            id="cliniko-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Din Cliniko API-nøkkel"
            autoComplete="off"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 bg-green-50 text-green-800">
            <CheckCircle className="size-4" />
            <AlertDescription>Koblet til Cliniko!</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending || !apiKey.trim()}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Kobler til…
            </>
          ) : (
            'Koble til Cliniko'
          )}
        </Button>
      </form>

      {status?.lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Sist synkronisert: {new Date(status.lastSyncAt).toLocaleString('nb-NO')}
        </p>
      )}
      {status?.connected && (
        <p className="text-xs text-muted-foreground">{status.customerCount} pasienter importert</p>
      )}
    </div>
  );
}
