import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, Sparkles, TrendingUp, ShieldCheck, MapPin, BarChart3, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
            L
          </div>
          <span className="font-bold text-xl tracking-tight">LokalRadar</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Logg inn
          </Link>
          <Link href="/signup">
            <Button className="rounded-full px-6">Prøv gratis</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-4 h-4" />
          <span>Din nye digitale assistent</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-backwards">
          Vi holder øye med nabolaget. <br className="hidden md:block" />
          <span className="text-muted-foreground">Du driver butikken.</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-backwards">
          For frisører, verksteder, restauranter og lokale helter. LokalRadar overvåker konkurrentene dine og skriver ferdig markedsføring for deg — uten at du trenger å løfte en finger.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500 fill-mode-backwards">
          <Link href="/signup">
            <Button size="lg" className="rounded-full px-8 h-14 text-base gap-2 w-full sm:w-auto">
              Kom i gang gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Ingen kredittkort kreves
          </p>
        </div>
      </section>

      {/* Image / Dashboard Preview mock */}
      <section className="container mx-auto px-6 pb-32">
        <div className="relative rounded-3xl border bg-card/50 shadow-2xl overflow-hidden aspect-video max-h-[600px] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent"></div>
          <div className="w-full h-full border rounded-2xl bg-background shadow-lg overflow-hidden flex flex-col relative z-10">
            {/* Fake browser chrome */}
            <div className="h-12 border-b bg-muted/30 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            {/* Fake dashboard content */}
            <div className="flex-1 p-8 flex gap-8 opacity-80 pointer-events-none">
              <div className="w-48 flex flex-col gap-4 border-r pr-8">
                <div className="h-6 w-32 bg-primary/20 rounded mb-4"></div>
                <div className="h-4 w-24 bg-muted-foreground/20 rounded"></div>
                <div className="h-4 w-28 bg-muted-foreground/20 rounded"></div>
                <div className="h-4 w-20 bg-muted-foreground/20 rounded"></div>
              </div>
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex gap-4">
                  <div className="h-24 flex-1 bg-card border shadow-sm rounded-xl"></div>
                  <div className="h-24 flex-1 bg-card border shadow-sm rounded-xl"></div>
                  <div className="h-24 flex-1 bg-card border shadow-sm rounded-xl"></div>
                </div>
                <div className="h-64 bg-card border shadow-sm rounded-xl flex-1"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - 2 Modules */}
      <section className="bg-white dark:bg-black/20 py-32 border-y">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">To verktøy, én plattform</h2>
            <p className="text-lg text-muted-foreground">Alt du trenger for å ligge et hestehode foran, bygget spesielt for små bedrifter i Norge.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Konkurrentovervåking */}
            <div className="group rounded-3xl p-8 bg-card border hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Konkurrent&shy;overvåking</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Mens du klipper hår eller bytter dekk, sjekker LokalRadar naboens nettsider og Google-anmeldelser. Endrer de priser? Får de dårlige anmeldelser? Du får en rolig oppsummering når noe viktig skjer.
              </p>
              <ul className="space-y-3">
                {["Prisendringer og nye tilbud", "Nye Google-anmeldelser", "Endringer i åpningstider"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Markedsføringsassistent */}
            <div className="group rounded-3xl p-8 bg-card border hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Markedsførings&shy;assistent</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Usikker på hva du skal poste på Facebook eller Google? Assistenten din skriver ferdige innlegg basert på din bransje og hva som fungerer i ditt nærområde akkurat nå. Bare kopier og lim inn.
              </p>
              <ul className="space-y-3">
                {["Ferdige innlegg for sosiale medier", "Svarforslag på anmeldelser", "Lokale SEO-tips for din bransje"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container mx-auto px-6 py-32">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Spar verdifull tid</h3>
            <p className="text-muted-foreground">Slipp å stresse med hva konkurrentene gjør. Vi gir deg oversikten på ett minutt, én gang i uken.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Lokal trygghet</h3>
            <p className="text-muted-foreground">Designet spesifikt for norske forhold og småbedrifter, ikke internasjonale byråer.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Treff nabolaget</h3>
            <p className="text-muted-foreground">Få innhold og tips som faktisk treffer kundene i din by og din gate.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-card py-32 border-t" id="pricing">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Enkle priser, ingen skjulte gebyrer</h2>
            <p className="text-lg text-muted-foreground">Velg pakken som passer din bedrift. Du kan når som helst bytte eller si opp.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Gratis */}
            <div className="rounded-3xl p-8 bg-background border flex flex-col">
              <h3 className="text-xl font-bold mb-2">Gratis</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">0 kr</span>
                <span className="text-muted-foreground">/mnd</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">Perfekt for å teste vannet og se hvordan det fungerer.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> 1 konkurrent overvåkes</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Begrenset AI-assistent</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Ukentlig oppsummering</li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full rounded-full">Velg Gratis</Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-3xl p-8 bg-primary text-primary-foreground border border-primary shadow-xl relative flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Mest populær
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">149 kr</span>
                <span className="text-primary-foreground/70">/mnd</span>
              </div>
              <p className="text-sm text-primary-foreground/80 mb-8 min-h-[40px]">For bedriften som vil vokse og ta markedsandeler lokalt.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-accent" /> Opptil 5 konkurrenter</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-accent" /> Full AI-assistent</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-accent" /> Umiddelbare varsler</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-accent" /> AI-svar på anmeldelser</li>
              </ul>
              <Link href="/signup">
                <Button className="w-full rounded-full bg-background text-foreground hover:bg-muted">Start prøveperiode</Button>
              </Link>
            </div>

            {/* Bedrift */}
            <div className="rounded-3xl p-8 bg-background border flex flex-col">
              <h3 className="text-xl font-bold mb-2">Bedrift</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">399 kr</span>
                <span className="text-muted-foreground">/mnd</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">For kjeder og bedrifter som dominerer flere områder.</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Ubegrenset konkurrenter</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Ubegrenset AI-bruk</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Prioritert kundestøtte</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Tilgang for flere ansatte</li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full rounded-full">Kontakt oss</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-serif font-bold text-sm">
              L
            </div>
            <span className="font-semibold text-muted-foreground">LokalRadar</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Laget for norske småbedrifter. © {new Date().getFullYear()} LokalRadar AS.
          </p>
        </div>
      </footer>
    </div>
  );
}
