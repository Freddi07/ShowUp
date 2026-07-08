'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useRouter } from '@/lib/compat/next-navigation';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BUSINESS_TYPES,
  INTEGRATION_OPTIONS,
  OPTIONAL_SECTION_KEYS,
  SECTION_META,
} from '@/lib/onboarding';
import {
  useOnboardingStatus,
  useUpdateOnboarding,
} from '@/hooks/use-onboarding';

const STEP_TITLES = ['Virksomhet', 'Funksjoner', 'Kundekilde', 'Ferdig'];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: status } = useOnboardingStatus();
  const update = useUpdateOnboarding();

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>([...OPTIONAL_SECTION_KEYS]);
  const [integration, setIntegration] = useState<string>('manuell');

  // Not logged in → send to login.
  useEffect(() => {
    if (!isPending && !session?.user) router.replace('/login');
  }, [isPending, session?.user, router]);

  // Already onboarded → straight to the dashboard.
  useEffect(() => {
    if (status?.onboardingCompleted) router.replace('/dashboard');
  }, [status?.onboardingCompleted, router]);

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function finish(skip = false) {
    try {
      await update.mutateAsync(
        skip
          ? { onboardingCompleted: true, enabledSections: null }
          : {
              onboardingCompleted: true,
              businessType,
              enabledSections: sections,
            },
      );
      router.replace('/dashboard');
    } catch {
      // The mutation surfaces its own error state; keep the user on the page.
    }
  }

  const saving = update.isPending;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-gutter py-10">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {STEP_TITLES.map((title, i) => (
              <div key={title} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {i < step ? <Check className="size-4" /> : i + 1}
                </span>
                {i < STEP_TITLES.length - 1 && (
                  <span
                    className={cn(
                      'h-px w-4 sm:w-8',
                      i < step ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => finish(true)}
            disabled={saving}
          >
            Hopp over
          </Button>
        </div>

        <div className="flex-1">
          {step === 0 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">
                Hva slags virksomhet har du?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Vi bruker dette til å tilpasse opplevelsen din.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BUSINESS_TYPES.map((t) => {
                  const active = businessType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setBusinessType(t.key)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50',
                      )}
                    >
                      <span>{t.label}</span>
                      {active && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">
                Hvilke funksjoner vil du bruke?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Vi viser bare det du velger. Du kan endre dette senere under
                Konto.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {SECTION_META.map((s) => {
                  const active = sections.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSection(s.key)}
                      className={cn(
                        'flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50',
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {s.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {s.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {active && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">
                Hvordan får du inn kundene dine?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Velg der du henter avtaler fra. Du kan sette opp koblingen når
                som helst.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INTEGRATION_OPTIONS.map((o) => {
                  const active = integration === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setIntegration(o.key)}
                      className={cn(
                        'flex flex-col rounded-lg border px-4 py-3 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50',
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {o.label}
                        </span>
                        {active && <Check className="size-4 text-primary" />}
                      </span>
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {o.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">
                Alt klart!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Dashbordet ditt er tilpasset valgene dine. Du kan alltid endre
                dem senere under Konto.
              </p>
              <div className="mt-6 rounded-lg border border-border p-4">
                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Virksomhet</dt>
                    <dd className="text-right font-medium">
                      {BUSINESS_TYPES.find((b) => b.key === businessType)
                        ?.label ?? 'Ikke valgt'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Funksjoner</dt>
                    <dd className="text-right font-medium">
                      {sections.length > 0
                        ? SECTION_META.filter((s) =>
                            sections.includes(s.key),
                          )
                            .map((s) => s.label)
                            .join(', ')
                        : 'Ingen valgt'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Kundekilde</dt>
                    <dd className="text-right font-medium">
                      {INTEGRATION_OPTIONS.find((o) => o.key === integration)
                        ?.label ?? '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="size-4" />
            Tilbake
          </Button>

          {step < STEP_TITLES.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Neste
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => finish(false)} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Kom i gang
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
