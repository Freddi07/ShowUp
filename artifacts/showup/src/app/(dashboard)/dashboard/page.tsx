// @polsia:user-owned
'use client';

import {
  ArrowRight,
  CalendarClock,
  CheckCircle,
  FileSpreadsheet,
  MessageSquare,
  Plug,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { useRouter, useSearchParams } from '@/lib/compat/next-navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useSession } from '@/lib/auth-client';
import { CustomerList } from '@/lib/contracts/customer';
import { StatsResponse, type StatsResponse as StatsResponseType } from '@/lib/contracts/stats';
import { type TrialStatus, TrialStatusSchema } from '@/lib/contracts/stripe';

function planLabel(status: TrialStatus | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!status) return { label: '—', variant: 'outline' };
  const s = status.subscriptionStatus;
  if (s === 'active') return { label: 'Aktivt abonnement', variant: 'default' };
  if (s === 'canceled') return { label: 'Avsluttet', variant: 'destructive' };
  if (s === 'past_due') return { label: 'Betaling forfalt', variant: 'destructive' };
  if (status.trialActive) return { label: 'Prøveperiode', variant: 'secondary' };
  return { label: 'Ingen aktiv plan', variant: 'outline' };
}

function PaymentSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setVisible(true);
      router.replace('/dashboard');
      return;
    }
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      apiFetch('/api/billing/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
      setVisible(true);
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
      <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-green-800 dark:text-green-300">
        Betalingen er bekreftet — abonnementet ditt er nå aktivt.
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  {
    href: '/dashboard/kunder',
    title: 'Kunder',
    description: 'Se, søk og legg til kunder. Importer fra fil.',
    icon: Users,
  },
  {
    href: '/dashboard/integrations',
    title: 'Registrer avtaler',
    description: 'Koble til plattform, importer fil eller bruk API.',
    icon: Plug,
  },
  {
    href: '/dashboard/maler',
    title: 'Meldingsmaler',
    description: 'Tilpass teksten i påminnelsene dine.',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/statistikk',
    title: 'Statistikk',
    description: 'Se hvor mange som møter opp og bekrefter.',
    icon: CalendarClock,
  },
] as const;

const REGISTER_METHODS = [
  {
    icon: Plug,
    title: 'Automatisk via API / Zapier',
    body: 'Koble booking- eller kalendersystemet ditt til via API-nøkkelen din (Zapier eller Make). Nye kunder og avtaler kommer inn av seg selv.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Import fra fil (CSV / Excel)',
    body: 'Last opp en eksportfil. En avtale registreres når raden har både dato/tid og telefonnummer. Kolonner: navn, telefon, dato, tid (eller tidspunkt).',
  },
  {
    icon: CalendarClock,
    title: 'Manuelt i dashbordet',
    body: 'Åpne en kunde og trykk «+ Ny avtale». Du kan når som helst endre tidspunkt, status eller sende en påminnelse manuelt.',
  },
] as const;

export default function DashboardPage() {
  const { data: session } = useSession();
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [stats, setStats] = useState<StatsResponseType | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/api/trial/status', { schema: TrialStatusSchema })
      .then(setTrial)
      .catch(() => {});
    apiFetch('/api/stats', { schema: StatsResponse })
      .then(setStats)
      .catch(() => {});
    apiFetch('/api/customers', { schema: CustomerList })
      .then((d) => setCustomerCount(d.items.length))
      .catch(() => {});
  }, []);

  const firstName = (session?.user?.name || session?.user?.email?.split('@')[0] || '').split(' ')[0];
  const plan = planLabel(trial);
  const last30 = stats?.last30d;
  const confirmRate =
    last30 && last30.sent > 0 ? `${Math.round((last30.confirmed / last30.sent) * 100)}%` : '—';

  return (
    <div className="space-y-8">
      <PaymentSuccessBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 text-foreground">
            Hei{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Her er en oversikt over kundene og påminnelsene dine.</p>
        </div>
        <Badge variant={plan.variant}>{plan.label}</Badge>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Kunder"
          value={customerCount ?? '—'}
          subtitle="Totalt registrert"
          icon={Users}
        />
        <MetricCard
          title="Påminnelser sendt"
          value={last30?.sent ?? '—'}
          subtitle="Siste 30 dager"
          icon={MessageSquare}
        />
        <MetricCard
          title="Bekreftet"
          value={last30?.confirmed ?? '—'}
          subtitle="Siste 30 dager"
          icon={CheckCircle}
        />
        <MetricCard
          title="Bekreftelsesrate"
          value={confirmRate}
          subtitle="Andel som bekreftet"
          icon={CalendarClock}
        />
      </section>

      <section>
        <h2 className="mb-3 text-h4 text-foreground">Hurtigvalg</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <span className="rounded-md bg-secondary p-2 text-secondary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    {a.title}
                    <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{a.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-h4 text-foreground">Slik registreres avtaler</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Avtaler kan komme inn på tre måter. Alle avtaler får automatisk en SMS-påminnelse.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {REGISTER_METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.title}>
                <CardHeader className="pb-2">
                  <span className="mb-1 inline-flex w-fit rounded-md bg-secondary p-2 text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Gå til registrering av avtaler
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
