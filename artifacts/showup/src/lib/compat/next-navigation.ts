/**
 * Compatibility shim: maps next/navigation APIs to wouter equivalents.
 * Replace `from '@/lib/compat/next-navigation'` with `from '@/lib/compat/next-navigation'`.
 */
import { useLocation } from 'wouter';

export function useRouter() {
  const [, navigate] = useLocation();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.location.reload(),
    prefetch: (_href: string) => {},
  };
}

export function usePathname(): string {
  const [location] = useLocation();
  return location;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function redirect(href: string): never {
  window.location.href = href;
  // This throw is unreachable but satisfies the `never` return type.
  throw new Error(`redirect: ${href}`);
}

export function notFound(): never {
  throw new Error('not-found');
}
