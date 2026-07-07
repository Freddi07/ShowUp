// @polsia:user-owned — starter home served at /. Replace it in place, or delete
// this route group before adding another page that resolves to /.

import { ShowUpLandingClient } from '@/components/custom/showup-landing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteDescription, siteName } from '@/lib/site';


const features = [
  {
    title: 'Flere kanaler for påminnelser',
    description:
      'SMS, e-post og tale-påminnelser sendes automatisk slik at kundene aldri glemmer en avtale.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
  {
    title: 'Toveis bekreftelse',
    description:
      'Kundene bekrefter eller endrer avtale med et enkelt svar — ingen apper å laste ned, ingen lenker å klikke.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
  },
  {
    title: 'Smart planlegging',
    description:
      'Sett det opp én gang. ShowUp lærer seg din åpningstid og sender påminnelser på perfekt tidspunkt.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    title: 'Talepåminnelser',
    description: 'Ring kundene med en profesjonell talepåminnelse for viktige avtaler.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
  },
  {
    title: 'Kundehåndtering',
    description:
      'Hold oversikt over alle kundene og deres påminnelsespreferanser i ett enkelt dashbord.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.097a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Sanntidsvarsler',
    description:
      'Få umiddelbare varsler når kunder bekrefter eller ber om endringer — alltid ett steg foran.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'Sett din åpningstid',
    description:
      'Fortell oss din åpningstid og hvor lang tid i forveien du vil minne kundene. Det er alt som trengs.',
  },
  {
    number: '02',
    title: 'Legg til kundene dine',
    description:
      'Importer kundelisten på minutter. ShowUp fanger opp telefonnumre og e-postadresser automatisk.',
  },
  {
    number: '03',
    title: 'Automatisér og slapp av',
    description:
      'ShowUp sender påminnelser via SMS, e-post og tale automatisk. Kundene bekrefter eller endrer avtale med et enkelt svar.',
  },
];

export default function SetupPlaceholder() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="section relative overflow-hidden pt-20 md:pt-28">
        <div className="absolute inset-0 -z-0">
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[oklch(var(--brand-100))] blur-[100px] opacity-70" />
          <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[oklch(var(--brand-200))] blur-[80px] opacity-50" />
        </div>
        <div className="container-page relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="max-w-xl">
              <Badge variant="secondary" className="mb-6">
                Laget for lokale servicebedrifter
              </Badge>
              <h1 className="font-display text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.02] tracking-tight">
                Slutt å miste kunder på grunn av{' '}
                <span className="text-primary">glemte avtaler</span>
              </h1>
              <p className="mt-6 text-body-lg text-muted-foreground">
                ShowUp sender automatiserte SMS, e-post og tale-påminnelser slik at kundene dine
                aldri glemmer en avtale. Reduser uteblivelser med opptil 38% uten innsats etter
                oppsett.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="/signup">Kom i gang gratis</a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/#how-it-works">Se hvordan det fungerer</a>
                </Button>
              </div>
            </div>
            <div className="relative">
              {/* Decorative card stack */}
              <div className="relative mx-auto max-w-md">
                <Card className="relative z-20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Påminnelse sendt</CardTitle>
                    <CardDescription>Aktiv nettopp</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/60 p-4 text-sm">
                      <p className="font-medium">📅 Avtale i morgen</p>
                      <p className="mt-1 text-muted-foreground">
                        Hei Maria, dette er en påminnelse om din tannlegeundersøkelse i morgen kl.
                        10:00. Svar JA for å bekrefte eller NY for å velge ny tid.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Kunde bekreftet</p>
                          <p className="text-xs text-muted-foreground">via SMS-svar</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Decorative background card */}
                <div className="absolute -bottom-4 -right-4 z-10 w-full rounded-xl border bg-muted/40 p-6 backdrop-blur-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-primary">38%</p>
              <p className="mt-1 text-sm text-muted-foreground">Reduksjon i uteblivelser</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-primary">10 min</p>
              <p className="mt-1 text-sm text-muted-foreground">Gjennomsnittlig oppsetttid</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-primary">3</p>
              <p className="mt-1 text-sm text-muted-foreground">Kanaler: SMS, e-post, tale</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-primary">0</p>
              <p className="mt-1 text-sm text-muted-foreground">Tekniske ferdigheter kreves</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Hvorfor ShowUp</p>
            <h2 className="font-display text-h2 tracking-tight">
              Alt du trenger for å holde kalenderen full
            </h2>
            <p className="mt-4 text-muted-foreground text-body-lg">
              Enkle, automatiserte påminnelser som fungerer for kundene dine og bunnlinjen.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section border-t border-border bg-muted/20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Simpelt som 1-2-3</p>
            <h2 className="font-display text-h2 tracking-tight">I gang på minutter</h2>
            <p className="mt-4 text-muted-foreground text-body-lg">
              Ingen teknisk kunnskap kreves. Ingen komplisert oppsett. Bare resultater.
            </p>
          </div>
          <div className="mt-16">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-8 top-0 h-full w-px bg-border md:left-1/2 md:-translate-x-px" />
              <div className="space-y-12">
                {steps.map((step, i) => (
                  <div
                    key={step.number}
                    className={`relative flex flex-col items-center gap-6 md:flex-row ${
                      i % 2 === 1 ? 'md:flex-row-reverse' : ''
                    }`}
                  >
                    <div className="flex w-full items-center md:w-1/2">
                      <Card className="relative z-10 w-full shadow-md">
                        <CardHeader>
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
                            {step.number}
                          </div>
                          <CardTitle className="text-xl">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{step.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="hidden md:block md:w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="section">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-eyebrow mb-3">Designet for deg</p>
              <h2 className="font-display text-h2 tracking-tight">
                Laget for små bedrifter, ikke bedriftsbudsjetter
              </h2>
              <p className="mt-4 text-body-lg text-muted-foreground">
                Store planleggingsverktøy er laget for bedrifter med dedikert IT-personale og høye
                programvarebudsjetter. ShowUp er annerledes.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Overkommelig pris</p>
                    <p className="text-sm text-muted-foreground">
                      Designet for lokale butikker, ikke bedriftskontoer.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Ingen teknisk ekspertise nødvendig</p>
                    <p className="text-sm text-muted-foreground">
                      Hvis du kan sette en timeplan, kan du bruke ShowUp.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium"> Fungerer med din eksisterende arbeidsflyt</p>
                    <p className="text-sm text-muted-foreground">
                      Ingen nye apper å laste ned, ingen lenker å administrere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Card className="w-full max-w-sm shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-lg">Kundene dine vil elske det</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ingen glemte avtaler lenger. Ingen flere siste-litenvarsler eller jakting på
                    kunder. ShowUp håndterer oppfølgingen så du kan fokusere på å drive bedriften
                    din.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section border-t border-border">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Priser</p>
            <h2 className="font-display text-h2 tracking-tight">Enkel og transparent prisleie</h2>
            <p className="mt-4 text-muted-foreground text-body-lg">
              Ingen skjulte gebyrer, ingen bindingstid. Velg planen som passer din bedrift.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Starter */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>For mindre bedrifter med få ansatte</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold tracking-tight">199 kr</span>
                  <span className="text-muted-foreground">/mnd</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Opptil 100 kunder
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    SMS-påminnelser
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    E-postpåminnelser
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Enkel kundeimport
                  </li>
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <a href="/signup">Velg denne planen</a>
                </Button>
              </CardContent>
            </Card>

            {/* Pro - highlighted */}
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Anbefalt</Badge>
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For voksende virksomheter</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold tracking-tight text-primary">
                    499 kr
                  </span>
                  <span className="text-muted-foreground">/mnd</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Opptil 500 kunder
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    SMS + e-post + tale
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Toveis bekreftelse
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Sanntidsvarsler
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Prioritert støtte
                  </li>
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <a href="/signup">Velg denne planen</a>
                </Button>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Business</CardTitle>
                <CardDescription>For større operasjoner med flere ansatte</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold tracking-tight">999 kr</span>
                  <span className="text-muted-foreground">/mnd</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Ubegrenset antall kunder
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Alle kanaler inkludert
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Flere ansatte/isbrukere
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Avansert statistikk
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <title>Inkludert</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Dedikert kontosjef
                  </li>
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <a href="/signup">Velg denne planen</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Client component for interactive sections (FAQ + CTA) */}
      <ShowUpLandingClient />
    </main>
  );
}
