'use client';

import { Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StripeCheckoutButton } from '@/components/custom/stripe-checkout-button';
import { apiFetch } from '@/lib/api-client';
import { SIGNUP_CHECKOUT_URL } from '@/lib/checkout-config';
import { BillingVerifyResponseSchema } from '@/lib/contracts/stripe';

export function PaymentForm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  if (sessionId) {
    return <VerifyPayment sessionId={sessionId} />;
  }

  return <CheckoutPrompt />;
}

function CheckoutPrompt() {
  if (!SIGNUP_CHECKOUT_URL) {
    return (
      <p className="text-sm text-destructive">
        Betalingsløsningen er midlertidig utilgjengelig. Prøv igjen senere eller kontakt oss.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
        Kortet ditt belastes ikke i prøveperioden. Du kan si opp når som helst.
      </p>

      <StripeCheckoutButton href={SIGNUP_CHECKOUT_URL} className="w-full" size="lg">
        Bekreft og start prøveperiode
      </StripeCheckoutButton>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        Sikker betaling via Stripe
      </p>
    </div>
  );
}

function VerifyPayment({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    apiFetch('/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
      schema: BillingVerifyResponseSchema,
    })
      .then((data) => {
        if (data.verified) {
          window.location.assign('/dashboard');
        } else {
          setErrorMessage('Betalingen kunne ikke bekreftes. Kontakt oss om problemet vedvarer.');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMessage('En feil oppstod ved bekreftelse av betaling. Prøv å laste siden på nytt.');
        setStatus('error');
      });
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Bekrefter betaling…</p>
      </div>
    );
  }

  return <p className="text-sm text-destructive">{errorMessage}</p>;
}
