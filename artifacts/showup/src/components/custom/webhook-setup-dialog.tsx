'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WebhookConfig {
  connected: boolean;
  webhookUrl?: string;
  secret?: string | null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2.5 py-1.5 text-xs">
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" onClick={copy}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

const PAYLOAD_EXAMPLE = `{
  "externalId": "booking-123",
  "scheduledAt": "2026-08-01T13:00:00+02:00",
  "customer": {
    "name": "Ola Nordmann",
    "phone": "+4799999999",
    "email": "ola@example.com"
  }
}`;

export function WebhookSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ['webhook-config', 'generic_webhook'],
    queryFn: () =>
      apiFetch<WebhookConfig>('/api/integrations/generic_webhook/webhook-config'),
    enabled: open,
  });

  const regenerate = useMutation({
    mutationFn: () =>
      apiFetch<{ secret: string; webhookUrl: string }>(
        '/api/integrations/generic_webhook/regenerate-secret',
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config', 'generic_webhook'] });
      toast.success('Ny nøkkel laget', {
        description: 'Den forrige nøkkelen slutter å virke. Oppdater avsenderen.',
      });
    },
    onError: () => toast.error('Kunne ikke lage ny nøkkel'),
  });

  const data = config.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-brand-500" />
            Webhook-oppsett
          </DialogTitle>
          <DialogDescription>
            Send bookinger til denne URL-en. Signer hver forespørsel med den hemmelige
            nøkkelen (HMAC-SHA256), så blir de automatisk til påminnelser.
          </DialogDescription>
        </DialogHeader>

        {config.isLoading ? (
          <p className="text-sm text-muted-foreground">Laster …</p>
        ) : data?.connected && data.webhookUrl ? (
          <div className="flex flex-col gap-4">
            <CopyField label="Webhook-URL (POST)" value={data.webhookUrl} />
            <CopyField label="Hemmelig nøkkel" value={data.secret ?? '—'} />

            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                Mistet kontroll på nøkkelen? Lag en ny.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate()}
              >
                <RefreshCw className={regenerate.isPending ? 'size-4 animate-spin' : 'size-4'} />
                Ny nøkkel
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Slik bygger du forespørselen
              </span>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Send en <strong>POST</strong> med JSON-kropp (se eksempel) til URL-en.
                </li>
                <li>
                  Regn ut <code>HMAC_SHA256(nøkkel, kroppen)</code> som hex.
                </li>
                <li>
                  Legg den i header{' '}
                  <code>X-BookPling-Signature: sha256=&lt;hex&gt;</code>.
                </li>
                <li>
                  <code>externalId</code> og <code>scheduledAt</code> er påkrevd;{' '}
                  <code>customer.phone</code> trengs for SMS.
                </li>
              </ol>
              <pre className="overflow-x-auto rounded-md border bg-muted px-3 py-2 text-xs">
                {PAYLOAD_EXAMPLE}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Webhooken er ikke tilkoblet. Lukk denne og trykk «Koble til» først.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
