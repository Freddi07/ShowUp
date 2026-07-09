/**
 * The catalogue of booking-source providers surfaced in the dashboard.
 *
 * `implemented` gates whether the connect/sync flow is live yet. The foundation
 * ships the shared plumbing with everything marked not-yet-implemented; the
 * dependent tasks (Generic Webhook, and the OAuth calendar connectors) flip
 * each provider on as it lands.
 */
export type ProviderId =
  | "generic_webhook"
  | "google_calendar"
  | "microsoft_outlook"
  | "calendly"
  | "onlinebooq"
  | "fresha"
  | "timma"
  | "booksy";

export type ProviderCategory = "webhook" | "calendar" | "booking";
export type ProviderAuthType = "webhook" | "oauth" | "manual";

export interface CatalogEntry {
  provider: ProviderId;
  label: string;
  description: string;
  category: ProviderCategory;
  authType: ProviderAuthType;
  implemented: boolean;
}

export const PROVIDER_CATALOG: CatalogEntry[] = [
  {
    provider: "generic_webhook",
    label: "Generisk webhook",
    description:
      "Ta imot bookinger fra et hvilket som helst system som kan sende utgående webhooks.",
    category: "webhook",
    authType: "webhook",
    implemented: false,
  },
  {
    provider: "google_calendar",
    label: "Google Kalender",
    description:
      "Koble til Google Kalender så nye hendelser automatisk blir til påminnelser.",
    category: "calendar",
    authType: "oauth",
    implemented: false,
  },
  {
    provider: "microsoft_outlook",
    label: "Microsoft Outlook",
    description:
      "Koble til Outlook-kalenderen din via Microsoft, med automatisk synk.",
    category: "calendar",
    authType: "oauth",
    implemented: false,
  },
  {
    provider: "calendly",
    label: "Calendly",
    description:
      "Koble til Calendly — nye bookinger kommer inn i sanntid via webhooks.",
    category: "booking",
    authType: "oauth",
    implemented: false,
  },
  {
    provider: "onlinebooq",
    label: "Onlinebooq",
    description:
      "Onlinebooq støtter utgående webhooks. Sett opp via den generiske webhooken.",
    category: "booking",
    authType: "webhook",
    implemented: false,
  },
  {
    provider: "fresha",
    label: "Fresha",
    description:
      "Fresha har ikke et åpent booking-API. Bruk fil-import eller generisk webhook.",
    category: "booking",
    authType: "manual",
    implemented: false,
  },
  {
    provider: "timma",
    label: "Timma",
    description:
      "Timma har ikke et åpent utvikler-API. Bruk fil-import eller generisk webhook.",
    category: "booking",
    authType: "manual",
    implemented: false,
  },
  {
    provider: "booksy",
    label: "Booksy",
    description:
      "Booksy har ikke et offisielt offentlig API. Bruk fil-import for å hente kunder.",
    category: "booking",
    authType: "manual",
    implemented: false,
  },
];

export function getCatalogEntry(provider: string): CatalogEntry | undefined {
  return PROVIDER_CATALOG.find((c) => c.provider === provider);
}
