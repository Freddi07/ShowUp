// @polsia:user-owned — programmatic SEO URLs for /sitemap.xml: dynamic [slug]
// pages that aren't in the nav menu. Edit this file freely.
// In Vite, sitemap generation happens externally; this file is kept for reference only.

/** App-absolute `path` (e.g. /items/aatrox) + optional sitemap fields. */
export type SeoRoute = {
  path: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  lastModified?: Date | string;
};

export async function seoRoutes(): Promise<SeoRoute[]> {
  return [];
}
