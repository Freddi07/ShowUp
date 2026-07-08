'use client';

import {
  CalendarCheck,
  CreditCard,
  Hourglass,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { AdminStatsResponse } from '@/lib/contracts/admin-stats';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Venter',
  REMINDED: 'Påminnet',
  CONFIRMED: 'Bekreftet',
  CANCELLED: 'Avlyst',
  RESCHEDULE_REQUESTED: 'Ny tid ønsket',
};

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-brand-500">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/stats', { schema: AdminStatsResponse })
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
            key={i}
            className="h-28 animate-pulse rounded-lg border border-border/60 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="size-4" />}
          label="Totalt antall brukere"
          value={stats.totalUsers}
          hint={`${stats.bannedUsers} deaktivert`}
        />
        <MetricCard
          icon={<UserPlus className="size-4" />}
          label="Nye brukere (7 dager)"
          value={stats.newUsers7d}
        />
        <MetricCard
          icon={<CreditCard className="size-4" />}
          label="Aktive abonnementer"
          value={stats.activeSubscriptions}
          hint="Betalende kunder"
        />
        <MetricCard
          icon={<Hourglass className="size-4" />}
          label="I prøveperiode"
          value={stats.trialingUsers}
        />
        <MetricCard
          icon={<Users className="size-4" />}
          label="Kunder totalt"
          value={stats.totalCustomers}
        />
        <MetricCard
          icon={<CalendarCheck className="size-4" />}
          label="Avtaler totalt"
          value={stats.totalAppointments}
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Avtaler etter status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(stats.appointmentsByStatus).map(([status, count]) => (
              <div
                key={status}
                className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-center"
              >
                <div className="text-xl font-semibold">{count}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {STATUS_LABELS[status] ?? status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
