'use client';

import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { ApiKeyResponse } from '@/lib/contracts/ingest';

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 shrink-0 gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label ? <span>{copied ? 'Kopiert' : label}</span> : null}
    </Button>
  );
}

export function ApiIngestCard() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [working, setWorking] = useState(false);

  const endpoint =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/ingest/customers`
      : '/api/ingest/customers';

  useEffect(() => {
    apiFetch('/api/ingest/api-key', { schema: ApiKeyResponse })
      .then((r) => setApiKey(r.apiKey))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setWorking(true);
    try {
      const r = await apiFetch('/api/ingest/api-key/rotate', {
        method: 'POST',
        schema: ApiKeyResponse,
      });
      setApiKey(r.apiKey);
      setRevealed(true);
    } catch {
      /* ignore */
    } finally {
      setWorking(false);
    }
  }

  const masked = apiKey ? `${apiKey.slice(0, 7)}${'•'.repeat(20)}` : '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-brand-500" />
          <CardTitle className="text-base">Automatisk innlegging (API & Zapier)</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Bruk denne API-nøkkelen til å sende nye kunder rett inn i dashbordet fra andre systemer
          — enten direkte via webhook, eller med Zapier/Make koblet til Fresha, HubSpot, Pipedrive,
          Calendly og lignende.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* API key */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Din API-nøkkel</span>
          {loading ? (
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          ) : apiKey ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={revealed ? apiKey : masked}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5"
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <CopyButton value={apiKey} label="Kopier" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5"
                  onClick={generate}
                  disabled={working}
                >
                  <RefreshCw className="size-4" />
                  <span className="hidden sm:inline">Ny nøkkel</span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button type="button" onClick={generate} disabled={working} className="h-11 w-full sm:w-auto">
                {working ? 'Genererer…' : 'Generer API-nøkkel'}
              </Button>
            </div>
          )}
          {apiKey && (
            <p className="text-xs text-muted-foreground">
              Hold nøkkelen hemmelig. Lager du en ny, slutter den gamle å virke.
            </p>
          )}
        </div>

        {/* Endpoint */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Endepunkt (URL)</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={endpoint} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <CopyButton value={endpoint} label="Kopier" />
          </div>
        </div>

        {/* Example */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Eksempel</span>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
            {`POST ${endpoint}
x-api-key: DIN_API_NØKKEL
Content-Type: application/json

{
  "name": "Ola Nordmann",
  "phone": "+47 900 00 000",
  "email": "ola@eksempel.no"
}`}
          </pre>
          <p className="text-xs text-muted-foreground">
            I Zapier/Make: velg «Webhooks → POST», lim inn URL-en over, legg til headeren
            <span className="font-mono"> x-api-key</span>, og map feltene navn, telefon og e-post.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
