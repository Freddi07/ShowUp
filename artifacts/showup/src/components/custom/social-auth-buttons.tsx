'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';

const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';
const APPLE_ENABLED = import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.36 12.78c.02 2.6 2.27 3.46 2.3 3.47-.02.06-.36 1.24-1.19 2.46-.72 1.06-1.46 2.11-2.64 2.13-1.15.02-1.53-.68-2.85-.68-1.32 0-1.73.66-2.82.7-1.13.05-2-1.14-2.72-2.2-1.48-2.14-2.62-6.06-1.1-8.7.76-1.32 2.11-2.15 3.58-2.17 1.11-.02 2.16.75 2.85.75.68 0 1.96-.93 3.3-.79.56.02 2.14.23 3.16 1.71-.08.05-1.88 1.1-1.86 3.27M14.19 4.6c.61-.74 1.02-1.77.9-2.8-.88.04-1.94.59-2.57 1.33-.56.65-1.06 1.7-.92 2.7.98.08 1.98-.5 2.59-1.23" />
    </svg>
  );
}

/**
 * Google / Apple quick sign-in buttons. Each provider only renders when it has
 * been configured (VITE_ENABLE_*_AUTH flags, set once its OAuth credentials are
 * added on the API server). When neither is enabled, nothing renders.
 */
export function SocialAuthButtons({ callbackURL = '/dashboard' }: { callbackURL?: string }) {
  const [pending, setPending] = useState<string | null>(null);

  if (!GOOGLE_ENABLED && !APPLE_ENABLED) return null;

  async function handle(provider: 'google' | 'apple') {
    setPending(provider);
    try {
      await signIn.social({ provider, callbackURL });
    } catch {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {GOOGLE_ENABLED && (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={pending !== null}
            onClick={() => handle('google')}
          >
            <GoogleIcon />
            {pending === 'google' ? 'Kobler til…' : 'Fortsett med Google'}
          </Button>
        )}
        {APPLE_ENABLED && (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={pending !== null}
            onClick={() => handle('apple')}
          >
            <AppleIcon />
            {pending === 'apple' ? 'Kobler til…' : 'Fortsett med Apple'}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">eller</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
