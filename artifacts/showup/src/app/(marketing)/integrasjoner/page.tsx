// @polsia:user-owned — public marketing page served at /integrasjoner.

import {
  ArrowRight,
  CalendarDays,
  FileSpreadsheet,
  FileUp,
  Plug,
  Receipt,
  Stethoscope,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// The two ways customers actually get into BookPling today.
const methods = [
  {
    icon: FileUp,
    title: 'Fil-import (CSV / Excel)',
    description:
      'Eksporter kundelisten fra hvilket som helst system og last den opp. Vi gjenkjenner navn, telefon og e-post automatisk — og hopper over duplikater.',
    cta: 'Importer kunder',
    href: '/signup',
  },
  {
    icon: Plug,
    title: 'API, Zapier & Make',
    description:
      'Koble bookingsystemet ditt til BookPling med en personlig API-nøkkel. Nye kunder og avtaler sendes inn automatisk — ingen manuell jobb.',
    cta: 'Kom i gang med API',
    href: '/signup',
  },
];

type Method = 'zapier' | 'csv';

interface Platform {
  name: string;
  category: string;
  icon: typeof CalendarDays;
  method: Method;
}

// Platforms BookPling supports today, consistent with the in-app integrasjoner-guide.
// `zapier` = kan sende kunder automatisk via Zapier/Make. `csv` = eksporter og last opp.
const platforms: Platform[] = [
  { name: 'Fresha', category: 'Booking', icon: CalendarDays, method: 'zapier' },
  { name: 'Timma', category: 'Booking', icon: CalendarDays, method: 'zapier' },
  { name: 'Calendly', category: 'Booking', icon: CalendarDays, method: 'zapier' },
  { name: 'Microsoft Bookings', category: 'Booking', icon: CalendarDays, method: 'zapier' },
  { name: 'HubSpot', category: 'CRM', icon: Users, method: 'zapier' },
  { name: 'Salesforce', category: 'CRM', icon: Users, method: 'zapier' },
  { name: 'Pipedrive', category: 'CRM', icon: Users, method: 'zapier' },
  { name: 'Zoho', category: 'CRM', icon: Users, method: 'zapier' },
  { name: 'Fiken', category: 'Regnskap', icon: Receipt, method: 'csv' },
  { name: 'Tripletex', category: 'Regnskap', icon: Receipt, method: 'csv' },
  { name: 'Opus Dental', category: 'Journal', icon: Stethoscope, method: 'csv' },
  { name: 'Excel & Google Sheets', category: 'Regneark', icon: FileSpreadsheet, method: 'csv' },
];

const methodLabel: Record<Method, string> = {
  zapier: 'Automatisk via Zapier eller Make',
  csv: 'Eksporter og importer på minutter',
};

export default function IntegrasjonerPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="section relative overflow-hidden pt-20 md:pt-28">
        <div className="absolute inset-0 -z-0" aria-hidden="true">
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[oklch(var(--brand-100))] opacity-70 blur-[100px]" />
          <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[oklch(var(--brand-200))] opacity-50 blur-[80px]" />
        </div>
        <div className="container-page relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-6">
              Ingen migrering nødvendig
            </Badge>
            <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.04] tracking-tight">
              Fungerer med verktøyene du <span className="text-primary">allerede bruker</span>
            </h1>
            <p className="mt-6 text-body-lg text-muted-foreground">
              Få kundene dine inn i BookPling uten å bytte system. Last opp en fil, eller koble til
              bookingsystemet ditt automatisk via API, Zapier eller Make.
            </p>
          </div>
        </div>
      </section>

      {/* Connection methods */}
      <section className="section pt-0">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <Card
                  key={m.title}
                  className="group flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{m.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {m.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild variant="link" className="h-auto p-0 text-brand-500">
                      <a href={m.href}>
                        {m.cta}
                        <ArrowRight className="ml-1 size-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="section border-t border-border bg-muted/20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Plattformer vi støtter</p>
            <h2 className="font-display text-h2 tracking-tight">Koble til der kundene dine bor</h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              Booking, CRM, regnskap eller regneark — kundene dine er allerede et sted. Hent dem
              inn i BookPling og la påminnelsene gå av seg selv.
            </p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.name} className="transition-colors hover:border-primary/40">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {p.category}
                        </p>
                      </div>
                    </div>
                    <CardDescription className="mt-3 flex items-center gap-1.5 text-sm">
                      {p.method === 'zapier' ? (
                        <Zap className="size-3.5 text-brand-500" />
                      ) : (
                        <FileUp className="size-3.5 text-brand-500" />
                      )}
                      {methodLabel[p.method]}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8 bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Har du en plattform som ikke er nevnt?</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                De fleste bookings-, CRM- og regnskapssystemer kan sende nye kunder til BookPling via
                Zapier eller Make med API-nøkkelen din. Har du et system uten slik støtte,
                eksporterer du bare en CSV-fil og laster den opp. Ta kontakt hvis du ønsker hjelp
                med et spesifikt oppsett.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section border-t border-border">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center shadow-lg md:px-12 md:py-20">
            <div className="absolute inset-0 -z-0 opacity-50" aria-hidden="true">
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[oklch(var(--brand-200))] blur-3xl" />
              <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[oklch(var(--brand-300))] blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-h1 tracking-tight">Klar til å koble til?</h2>
              <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-foreground">
                Kom i gang på minutter. Importer kundene dine eller koble til bookingsystemet — og
                la BookPling håndtere påminnelsene.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <a href="/signup">Kom i gang gratis</a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/#features">Les mer om BookPling</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
