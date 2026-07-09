/**
 * Compatibility shim: maps next/navigation-style APIs to wouter equivalents.
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
