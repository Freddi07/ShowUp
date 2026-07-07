'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  token?: string;
}

interface ResetResponse {
  success?: boolean;
  error?: string;
}

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Ugyldig lenke. Bruk lenken fra e-posten din.');
      return;
    }

    if (password.length < 8) {
      setError('Passord må være minst 8 tegn.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passordene er ikke like.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data: ResetResponse = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Noe gikk galt. Prøv igjen.');
        return;
      }

      router.push('/login?reset=success');
    } catch {
      setError('En feil oppstod. Prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-h4">Ugyldig lenke</CardTitle>
          <CardDescription>
            Denne lenken er ugyldig eller utløpt. Be om en ny lenke for å tilbakestille passordet.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button asChild className="w-full">
            <a href="/forgot-password">Be om ny lenke</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-h4">Nytt passord</CardTitle>
        <CardDescription>Skriv inn ditt nye passord</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-small">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nytt passord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minst 8 tegn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Bekreft passord</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Skriv passordet på nytt"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Tilbakestiller...' : 'Tilbakestill passord'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
