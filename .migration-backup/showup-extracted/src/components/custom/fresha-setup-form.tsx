'use client';

import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import type { FreshaConnectResponse, FreshaStatusResponse } from '@/lib/contracts/fresha';

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

export function FreshaSetupForm() {
  const [apiKey, setApiKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<FreshaStatusResponse | null>(null);

  useEffect(() => {
    apiFetch<FreshaStatusResponse>('/api/integrations/fresha/status', { method: 'GET' })
      .then(setStatus)
      .catch(() => {});
  }, []);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(false);

    try {
      await apiFetch<FreshaConnectResponse>('/api/integrations/fresha/connect', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      });
      setSuccess(true);
      const newStatus = await apiFetch<FreshaStatusResponse>('/api/integrations/fresha/status', {
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
      setError('Kunne ikke koble til Fresha. Sjekk at API-nøkkelen er gyldig.');
    }

    setPending(false);
  }

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/integrations/webhook/fresha`
      : '/api/integrations/webhook/fresha';

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
          <span>Logg inn på Fresha og gå til Innstillinger → API → Generer API-nøkkel</span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          <span>Lim inn API-nøkkelen nedenfor og klikk &laquo;Koble til&raquo;</span>
        </li>
        {success && (
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs text-white">
              3
            </span>
            <span>
              Tilkoblet!
              {status?.customerCount ? ` ${status.customerCount} kunder importert.` : ''}
              {status?.lastSyncAt
                ? ` Sist synkronisert: ${new Date(status.lastSyncAt).toLocaleString('nb-NO')}.`
                : ''}
            </span>
          </li>
        )}
      </ol>

      <form onSubmit={handleConnect} className="flex flex-col gap-3" noValidate>
        <div className="space-y-1">
          <Label htmlFor="fresha-api-key">API-nøkkel</Label>
          <Input
            id="fresha-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Din Fresha API-nøkkel"
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
            <AlertDescription>Koblet til Fresha!</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending || !apiKey.trim()}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Kobler til…
            </>
          ) : (
            'Koble til Fresha'
          )}
        </Button>
      </form>

      {status?.lastSyncAt && !success && (
        <p className="text-xs text-muted-foreground">
          Sist synkronisert: {new Date(status.lastSyncAt).toLocaleString('nb-NO')}
        </p>
      )}
      {status?.connected && !success && (
        <p className="text-xs text-muted-foreground">{status.customerCount} kunder importert</p>
      )}

      <p className="text-xs text-muted-foreground">
        <strong>Merk:</strong> Fresha krever partnergodkjenning for full API-tilgang. Webhook-mottak
        fungerer uten full tilgang. Webhook-URL:{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{webhookUrl}</code>
      </p>
    </div>
  );
}
