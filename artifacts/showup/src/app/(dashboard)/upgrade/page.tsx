import { UpgradePlansIsland } from '@/components/custom/upgrade-plans-island';


export default function UpgradePage() {
  return (
    <main className="min-h-dvh bg-background px-gutter py-section">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[var(--brand-100)] opacity-25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-eyebrow mb-2 text-brand-500">Prøveperioden er over</p>
          <h1 className="text-h2 mb-3">Velg en plan for å fortsette</h1>
          <p className="text-body text-muted-foreground max-w-xl mx-auto">
            Alle planer inkluderer automatiske SMS- og e-postpåminnelser, full kundeadministrasjon
            og 14 dagers prøveperiode uten binding.
          </p>
        </div>

        <UpgradePlansIsland />
      </div>
    </main>
  );
}
