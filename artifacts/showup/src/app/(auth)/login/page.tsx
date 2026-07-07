// @polsia:user-owned — converted from async server component for Vite.
'use client';

import { useSearchParams } from '@/lib/compat/next-navigation';
import { SignInForm } from '@/components/custom/sign-in-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const reset = searchParams.get('reset');

  return (
    <main className="min-h-dvh flex items-center justify-center px-gutter py-section bg-[var(--background)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[var(--brand-100)] opacity-40 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--brand-200)] opacity-30 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-h4">Velkommen tilbake</CardTitle>
          <CardDescription>Logg inn på kontoen din for å fortsette</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {reset === 'success' && (
            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-small">
              Passordet er oppdatert. Du kan nå logge inn.
            </div>
          )}
          <SignInForm />
          <p className="mt-3 text-center text-small">
            <a
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Glemt passord?
            </a>
          </p>
          <p className="mt-4 text-center text-small text-muted-foreground">
            Har du ikke en konto?{' '}
            <a
              href="/signup"
              className="text-brand-600 font-medium hover:text-brand-700 hover:underline underline-offset-2 transition-colors"
            >
              Opprett en
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
