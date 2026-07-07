import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentForm } from '@/components/custom/payment-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Legg til betalingsinformasjon — ShowUp',
  description: '14 dager gratis prøveperiode. Kortet belastes ikke i prøveperioden.',
};

export default function SignupPaymentPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-gutter py-section bg-[var(--background)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[var(--brand-100)] opacity-40 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--brand-200)] opacity-30 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-h4">Legg til betalingsinformasjon</CardTitle>
          <CardDescription>Kortet belastes ikke i de 14 første dagene</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Laster…</p>}>
            <PaymentForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
