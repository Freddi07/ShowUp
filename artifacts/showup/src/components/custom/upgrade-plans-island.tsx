'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/lib/auth-client';
import {
  PLAN_CHECKOUT_URLS,
  type PlanId,
  withCheckoutBinding,
} from '@/lib/checkout-config';

interface Plan {
  id: PlanId;
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    title: 'Starter',
    price: '199',
    period: 'kr/mnd',
    description: 'Perfekt for enkeltpersoner og små bedrifter.',
    features: [
      'Opptil 100 kunder',
      'SMS-påminnelser',
      'E-postpåminnelser',
      'Grunnleggende statistikk',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    title: 'Pro',
    price: '499',
    period: 'kr/mnd',
    description: 'For bedrifter med et voksende kundebase.',
    features: [
      'Opptil 500 kunder',
      'SMS + e-post + alle kanaler',
      'Avansert statistikk',
      'Prioritert støtte',
    ],
    highlighted: true,
  },
  {
    id: 'business',
    title: 'Business',
    price: '999',
    period: 'kr/mnd',
    description: 'For store virksomheter med avanserte behov.',
    features: [
      'Ubegrenset antall kunder',
      'Alle kanaler',
      'Avansert statistikk og rapporter',
      'Dedikert støtte',
    ],
    highlighted: false,
  },
];

export function UpgradePlansIsland() {
  const { data: session, isPending } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const userId = session?.user?.id;
  const email = session?.user?.email;

  function handleSelectPlan(planId: PlanId) {
    if (!userId) return;
    const url = withCheckoutBinding(PLAN_CHECKOUT_URLS[planId], userId, email);
    if (!url) return;
    setLoadingPlan(planId);
    window.location.assign(url);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {!isPending && !userId && (
        <p className="text-sm text-destructive">
          Du må være innlogget for å velge en plan. Logg inn og prøv igjen.
        </p>
      )}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isLoading = loadingPlan === plan.id;
          const planUrl = PLAN_CHECKOUT_URLS[plan.id];
          const isDisabled =
            loadingPlan !== null || isPending || !userId || !planUrl;
          return (
            <Card
              key={plan.id}
              className={
                plan.highlighted
                  ? 'relative border-brand-500 shadow-lg ring-2 ring-brand-500/30 bg-card'
                  : 'relative border-border/60 bg-card/80'
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand-500 text-white text-xs px-3">Anbefalt</Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-6 text-center">
                <CardTitle className="text-h4">{plan.title}</CardTitle>
                <div className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-1 text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 pb-6">
                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  disabled={isDisabled}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      Venter…
                    </>
                  ) : (
                    'Velg plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
