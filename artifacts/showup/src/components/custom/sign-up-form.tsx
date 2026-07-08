// @polsia:user-owned
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { signUp } from '@/lib/auth-client';
import { SocialAuthButtons } from '@/components/custom/social-auth-buttons';

export function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const { error: signUpError } = await signUp.email({ name, email, password });
    if (signUpError) {
      setPending(false);
      setError(signUpError.message ?? 'Kunne ikke opprette konto. Prøv igjen.');
      return;
    }
    if (businessType) {
      await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ businessType }),
      }).catch(() => {});
    }
    window.location.assign('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <SocialAuthButtons callbackURL="/dashboard" />
      <Label htmlFor="sign-up-name">Navn</Label>
      <Input
        id="sign-up-name"
        name="name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        aria-invalid={error ? true : undefined}
      />
      <Label htmlFor="sign-up-email">E-postadresse</Label>
      <Input
        id="sign-up-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="deg@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-invalid={error ? true : undefined}
      />
      <Label htmlFor="sign-up-password">Passord</Label>
      <Input
        id="sign-up-password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-invalid={error ? true : undefined}
      />
      <Label htmlFor="sign-up-business-type">Virksomhetstype</Label>
      <Select value={businessType} onValueChange={setBusinessType}>
        <SelectTrigger id="sign-up-business-type">
          <SelectValue placeholder="Velg type virksomhet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tannlege">Tannlege</SelectItem>
          <SelectItem value="frisør">Frisør</SelectItem>
          <SelectItem value="bilverksted">Bilverksted</SelectItem>
          <SelectItem value="annet">Annet</SelectItem>
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Oppretter konto…' : 'Opprett konto'}
      </Button>
    </form>
  );
}
