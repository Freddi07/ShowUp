'use client';

import { useRouter } from '@/lib/compat/next-navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type { CustomerDetail as CustomerDetailType } from '@/lib/contracts/customer';
import { CustomerDetail as CustomerDetailSchema } from '@/lib/contracts/customer';

const SOURCE_LABELS: Record<string, string> = {
  tripletex: 'Tripletex',
  opus_dental: 'Opus Dental',
  google_calendar: 'Google Calendar',
  microsoft_outlook: 'Microsoft 365',
  fresha: 'Fresha',
  manual: 'Manuell',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Venter',
  REMINDED: 'Påmint',
  CONFIRMED: 'Bekreftet',
  CANCELLED: 'Avlyst',
  RESCHEDULE_REQUESTED: 'Ønsker å endre',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'secondary',
  REMINDED: 'outline',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  RESCHEDULE_REQUESTED: 'outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const SKELETON_CELL_KEYS = ['sc-1', 'sc-2', 'sc-3', 'sc-4', 'sc-5'];

interface Props {
  customerId: string;
}

export function CustomerDetail({ customerId }: Props) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/customers/${customerId}`, { schema: CustomerDetailSchema })
      .then((data) => setCustomer(data))
      .catch(() => setError('Kunne ikke laste kundedetaljer. Prøv å laste siden på nytt.'));
  }, [customerId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/kunder')}>
          ← Kunder
        </Button>
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SKELETON_CELL_KEYS.map((k) => (
            <div
              key={k}
              className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/dashboard/kunder')}
        >
          ← Kunder
        </Button>
        <h1 className="text-h2 text-foreground">{customer.name}</h1>
        {customer.source && (
          <Badge variant="secondary" className="mt-2">
            {SOURCE_LABELS[customer.source] ?? customer.source}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Telefon
          </p>
          <p className="text-sm font-medium text-foreground">{customer.phone ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            E-post
          </p>
          <p className="text-sm font-medium text-foreground break-all">{customer.email ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Antall avtaler
          </p>
          <p className="text-sm font-medium text-foreground">{customer.appointmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Opprettet
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatDateTime(customer.createdAt)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-h4 text-foreground mb-4">Avtalehistorikk</h2>
        {customer.appointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border border-border rounded-lg">
            Ingen avtaler registrert.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dato</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tid</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Navn</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Påminnelse sendt
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.appointments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{formatDate(a.scheduledAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTime(a.scheduledAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.clientName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[a.status] ?? 'secondary'}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.twilioSid ? 'Ja' : 'Nei'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {customer.appointments.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Siste besøk:{' '}
            <span className="font-medium text-foreground">
              {customer.lastVisitAt ? formatDate(customer.lastVisitAt) : '—'}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
