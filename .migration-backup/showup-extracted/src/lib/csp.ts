// @polsia:framework-owned — DO NOT EDIT. Builds the Content-Security-Policy
// applied per-request in proxy.ts.
//
// SECURITY POSTURE (platform decision — not the agent's to change):
//   - script-src stays STRICT: per-request nonce + 'strict-dynamic', and NO
//     'unsafe-inline'/'unsafe-eval' in production. This is the directive that
//     actually stops XSS; it is the non-negotiable rampart.
//   - style-src intentionally allows 'unsafe-inline' (and carries NO nonce).
//     Headless UI primitives (Radix/shadcn poppers, slider, progress, toast, …)
//     position and animate via runtime inline style ATTRIBUTES, which are not
//     nonce-eligible. A nonce on style-src silently breaks them in PRODUCTION
//     (they look fine in dev) while buying only marginal CSS-injection
//     protection. Relaxing style-src — and only style-src — keeps every
//     primitive working with zero per-component effort, with the XSS-critical
//     script-src untouched.
//
// CSP spec note: a nonce on a directive makes 'unsafe-inline' IGNORED, so to
// allow inline styles we deliberately do NOT put a nonce on style-src.

export function buildCsp(nonce: string, isDev: boolean, apiUrl = ''): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' ${apiUrl};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}
