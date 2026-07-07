'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import {
  type SvarItem,
  SvarList,
  type SvarStatusFilter as SvarStatusFilterType,
} from '@/lib/contracts/svar';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Venter',
  REMINDED: 'Påminnet',
  CONFIRMED: 'Bekreftet',
  CANCELLED: 'Kansellert',
  RESCHEDULE_REQUESTED: 'Ombestilling',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  REMINDED: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  RESCHEDULE_REQUESTED: 'secondary',
};

const FILTER_OPTIONS: { value: SvarStatusFilterType; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'CONFIRMED', label: 'Bekreftet' },
  { value: 'CANCELLED', label: 'Kansellert' },
  { value: 'RESCHEDULE_REQUESTED', label: 'Ombestilling' },
  { value: 'REMINDED', label: 'Påminnet' },
];

export function SvarPage() {
  const [items, setItems] = useState<SvarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SvarStatusFilterType>('all');
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(
    async (isPolling = false) => {
      if (isPolling) setPolling(true);
      try {
        const params = new URLSearchParams({
          status: statusFilter,
          page: String(page),
          limit: String(limit),
        });
        const data = await apiFetch(`/api/svar?${params.toString()}`, { schema: SvarList });
        setItems(data.items);
        setTotal(data.total);
      } catch {
        if (!isPolling) toast.error('Kunne ikke hente svar');
      } finally {
        setLoading(false);
        setPolling(false);
      }
    },
    [statusFilter, page],
  );

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetch(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  async function patchItem(id: string, payload: Record<string, string>) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/svar/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await fetch();
      toast.success('Oppdatert');
    } catch {
      toast.error('Handlingen feilet');
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as SvarStatusFilterType);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {polling && <span className="text-xs text-muted-foreground">Oppdaterer…</span>}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Laster…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Ingen svar funnet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kundenavn</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefon</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avtale</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{item.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.clientPhone}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(item.scheduledAt).toLocaleString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[item.status] ?? 'outline'}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'RESCHEDULE_REQUESTED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === item.id}
                          onClick={() => patchItem(item.id, { status: 'CONFIRMED' })}
                        >
                          Bekreft ombestilling
                        </Button>
                      )}
                      {item.status === 'REMINDED' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === item.id}
                            onClick={() => patchItem(item.id, { status: 'CONFIRMED' })}
                          >
                            Marker som møtt
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={actionLoading === item.id}
                            onClick={() => patchItem(item.id, { action: 'send_followup' })}
                          >
                            Send purring
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Forrige
          </Button>
          <span className="text-sm text-muted-foreground">
            Side {page + 1} av {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Neste
          </Button>
        </div>
      )}
    </div>
  );
}
