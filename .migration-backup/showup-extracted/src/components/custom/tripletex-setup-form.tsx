'use client';

import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import type {
  TripletexConnectResponse,
  TripletexStatusResponse,
  TripletexSyncResponse,
} from '@/lib/contracts/tripletex';

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

export function TripletexSetupForm() {
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<TripletexStatusResponse | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(false);

    try {
      await apiFetch<TripletexConnectResponse>('/api/integrations/tripletex/connect', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      setSuccess(true);

      // Trigger customer sync
      const syncResult = await apiFetch<TripletexSyncResponse>(
        '/api/integrations/tripletex/customers',
        { method: 'GET' },
      );
      void syncResult;

      // Refresh status
      const newStatus = await apiFetch<TripletexStatusResponse>(
        '/api/integrations/tripletex/status',
        { method: 'GET' },
      );
      setStatus(newStatus);
    } catch (err) {
      const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
      if (
        cause &&
        typeof cause === 'object' &&
        'errors' in cause &&
        typeof (cause as Record<string, unknown>).errors === 'object'
      ) {
        const errors = (cause as { errors: Record<string, string> }).errors;
        if (errors.token) {
          setError(errors.token);
          setPending(false);
          return;
        }
      }
      setError('Kunne ikke koble til Tripletex. Sjekk at tokenen er gyldig.');
    }

    setPending(false);
  }

  // Load status on mount
  useState(() => {
    apiFetch<TripletexStatusResponse>('/api/integrations/tripletex/status', {
      method: 'GET',
    })
      .then(setStatus)
      .catch(() => {});
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tripletex</h3>
          {status && <StatusBadge connected={status.connected} />}
        </div>

        <ol className="mb-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </span>
            <span>Logg inn på Tripletex</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </span>
            <span>Gå til Innstillinger → API → Generer ny token</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </span>
            <span>Kopier tokenen og lim den inn i feltet under</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              4
            </span>
            <span>Klikk &ldquo;Koble til&rdquo; for å validere og lagre</span>
          </li>
        </ol>

        <form onSubmit={handleConnect} className="flex flex-col gap-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="tripletex-token">API-token</Label>
            <Input
              id="tripletex-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Din Tripletex API-token"
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
              <AlertDescription>Koblet til Tripletex!</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={pending || !token.trim()}>
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Kobler til…
              </>
            ) : (
              'Koble til Tripletex'
            )}
          </Button>
        </form>

        {status?.lastSyncAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            Sist synkronisert: {new Date(status.lastSyncAt).toLocaleString('nb-NO')}
          </p>
        )}
      </div>
    </div>
  );
}
