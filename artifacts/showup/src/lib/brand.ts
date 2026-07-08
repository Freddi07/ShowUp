// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'BookPling';
export const siteDescription =
  'Slutt å miste kunder på grunn av glemte avtaler. Automatiserte påminnelser for lokale servicebedrifter.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#16a34a',
  /** PWA splash + install background. */
  backgroundColor: '#ffffff',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#16a34a',
    foreground: '#ffffff',
    /** Second line under the site name; '' hides it. */
    tagline: 'Slutt å miste kunder på grunn av glemte avtaler.',
  },
} as const;
