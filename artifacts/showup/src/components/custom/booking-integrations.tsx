'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CalendarClock, Link2, Plug, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WebhookSetupDialog } from './webhook-setup-dialog';
import { PROVIDER_GUIDES, hasGuide } from './integration-guides';

interface IntegrationItem {
  provider: string;
  label: string;
  description: string;
  category: 'webhook' | 'calendar' | 'booking';
  authType: 'webhook' | 'oauth' | 'manual';
  implemented: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface BookingItem {
  id: string;
  provider: string;
  providerLabel: string;
  clientName: string | null;
  scheduledAt: string | null;
  syncedAt: string;
}

const STATUS_META: Record<
  IntegrationItem['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  connected: { label: 'Tilkoblet', variant: 'default' },
  syncing: { label: 'Synkroniserer', variant: 'secondary' },
  error: { label: 'Feil', variant: 'destructive' },
  disconnected: { label: 'Ikke tilkoblet', variant: 'outline' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BookingIntegrations() {
  const queryClient = useQueryClient();
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [guideProvider, setGuideProvider] = useState<string | null>(null);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiFetch<{ items: IntegrationItem[] }>('/api/integrations'),
  });

  const bookings = useQuery({
    queryKey: ['integration-bookings'],
    queryFn: () =>
      apiFetch<{ items: BookingItem[] }>('/api/integrations/bookings'),
  });

  const connect = useMutation({
    mutationFn: (provider: string) =>
      apiFetch(`/api/integrations/${provider}/connect`, { method: 'POST' }),
    onSuccess: (_data, provider) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (provider === 'generic_webhook') {
        queryClient.invalidateQueries({ queryKey: ['webhook-config', 'generic_webhook'] });
        setWebhookOpen(true);
        toast.success('Webhook opprettet', {
          description: 'Kopier URL og nøkkel inn i systemet ditt.',
        });
      } else {
        toast.success('Tilkoblet');
      }
    },
    onError: (err) => {
      const cause = (err as { cause?: { error?: string } })?.cause;
      toast.error('Kunne ikke koble til', {
        description: cause?.error ?? 'Denne koblingen er ikke tilgjengelig ennå.',
      });
    },
  });

  const disconnect = useMutation({
    mutationFn: (provider: string) =>
      apiFetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Koblet fra');
    },
    onError: () => toast.error('Kunne ikke koble fra'),
  });

  const items = integrations.data?.items ?? [];
  const bookingItems = bookings.data?.items ?? [];
  const activeGuide = guideProvider ? PROVIDER_GUIDES[guideProvider] : null;
  const activeGuideLabel = items.find((i) => i.provider === guideProvider)?.label ?? '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-brand-500" />
          <CardTitle className="text-base">Koble til bookingsystemet ditt</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Når du kobler til, blir nye bookinger automatisk til påminnelser i BookPling — uten at
          du trenger å legge dem inn manuelt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {integrations.isLoading ? (
          <p className="text-sm text-muted-foreground">Laster integrasjoner …</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const status = STATUS_META[item.status];
              const isConnected = item.status !== 'disconnected';
              const isWebhook = item.provider === 'generic_webhook';
              const providerHasGuide = hasGuide(item.provider);
              return (
                <div
                  key={item.provider}
                  className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.lastError ? (
                      <p className="text-xs text-destructive">{item.lastError}</p>
                    ) : null}
                    {item.lastSyncedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Sist synkronisert: {formatDateTime(item.lastSyncedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isWebhook && isConnected ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setWebhookOpen(true)}
                        >
                          <Settings2 className="size-4" />
                          Webhook-oppsett
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disconnect.isPending}
                          onClick={() => disconnect.mutate(item.provider)}
                        >
                          Koble fra
                        </Button>
                      </>
                    ) : isConnected ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disconnect.isPending}
                        onClick={() => disconnect.mutate(item.provider)}
                      >
                        Koble fra
                      </Button>
                    ) : item.implemented ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={connect.isPending}
                        onClick={() => connect.mutate(item.provider)}
                      >
                        <Link2 className="size-4" />
                        Koble til
                      </Button>
                    ) : providerHasGuide ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setGuideProvider(item.provider)}
                      >
                        <BookOpen className="size-4" />
                        Vis oppsett
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="secondary" disabled>
                        Kommer snart
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Siste bookinger</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => bookings.refetch()}
              disabled={bookings.isFetching}
            >
              <RefreshCw className={bookings.isFetching ? 'size-4 animate-spin' : 'size-4'} />
              Oppdater
            </Button>
          </div>
          {bookingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen bookinger er kommet inn via en integrasjon ennå.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {bookingItems.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {b.clientName ?? 'Ukjent kunde'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.providerLabel}
                      {b.scheduledAt ? ` · ${formatDateTime(b.scheduledAt)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(b.syncedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <WebhookSetupDialog open={webhookOpen} onOpenChange={setWebhookOpen} />

      <Dialog
        open={guideProvider !== null}
        onOpenChange={(open) => !open && setGuideProvider(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-brand-500" />
              {activeGuideLabel} — oppsett
            </DialogTitle>
            {activeGuide ? (
              <DialogDescription>{activeGuide.intro}</DialogDescription>
            ) : null}
          </DialogHeader>
          {activeGuide ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {activeGuide.steps.map((step, i) => (
                <li key={i} className="text-foreground">
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
          {activeGuide?.usesGenericWebhook ? (
            <Button
              type="button"
              size="sm"
              className="self-start"
              onClick={() => {
                setGuideProvider(null);
                const webhook = items.find((i) => i.provider === 'generic_webhook');
                if (webhook && webhook.status !== 'disconnected') {
                  setWebhookOpen(true);
                } else {
                  connect.mutate('generic_webhook');
                }
              }}
            >
              <Link2 className="size-4" />
              Sett opp generisk webhook
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
