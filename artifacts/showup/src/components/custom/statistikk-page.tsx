'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { StatsResponse, type StatsResponse as StatsResponseType } from '@/lib/contracts/stats';

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function pct(n: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

export function StatistikkPage() {
  const [data, setData] = useState<StatsResponseType | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch('/api/stats', { schema: StatsResponse })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Kunne ikke hente statistikk. Prøv igjen.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(['s1', 's2', 's3', 's4'] as const).map((k) => (
            <Card key={k}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const { last7d, last30d, total, dailySeries } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Siste 7 dager
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Påminnelser sendt" value={last7d.sent} />
          <StatCard
            title="Bekreftelsesrate"
            value={pct(last7d.confirmed, last7d.sent)}
            subtitle={`${last7d.confirmed} av ${last7d.sent}`}
          />
          <StatCard
            title="No-show-rate"
            value={pct(last7d.noResponse, last7d.sent)}
            subtitle={`${last7d.noResponse} uten svar`}
          />
          <StatCard
            title="Ombestillingsrate"
            value={pct(last7d.rescheduleRequested, last7d.sent)}
            subtitle={`${last7d.rescheduleRequested} ombestillinger`}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Siste 30 dager
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Påminnelser sendt" value={last30d.sent} />
          <StatCard
            title="Bekreftelsesrate"
            value={pct(last30d.confirmed, last30d.sent)}
            subtitle={`${last30d.confirmed} av ${last30d.sent}`}
          />
          <StatCard
            title="No-show-rate"
            value={pct(last30d.noResponse, last30d.sent)}
            subtitle={`${last30d.noResponse} uten svar`}
          />
          <StatCard
            title="Ombestillingsrate"
            value={pct(last30d.rescheduleRequested, last30d.sent)}
            subtitle={`${last30d.rescheduleRequested} ombestillinger`}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Totalt
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Påminnelser sendt" value={total.sent} />
          <StatCard title="Bekreftede" value={total.confirmed} />
          <StatCard title="Kansellerte" value={total.cancelled} />
          <StatCard title="Ombestillinger" value={total.rescheduleRequested} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivitet over tid (siste 30 dager)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailySeries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ingen data ennå.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailySeries} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, 'Sendt']}
                  labelFormatter={(label: string) => label}
                />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="hsl(var(--brand-500))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = '/api/stats/export';
          }}
        >
          Eksporter til CSV
        </Button>
      </div>
    </div>
  );
}
