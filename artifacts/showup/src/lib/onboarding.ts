// Shared onboarding metadata used by the wizard, the dashboard nav filter,
// and the account settings customizer.

export const OPTIONAL_SECTION_KEYS = [
  'kunder',
  'svar',
  'maler',
  'statistikk',
  'integrations',
] as const;

export type SectionKey = (typeof OPTIONAL_SECTION_KEYS)[number];

export interface SectionMeta {
  key: SectionKey;
  label: string;
  description: string;
}

export const SECTION_META: SectionMeta[] = [
  {
    key: 'kunder',
    label: 'Kunder',
    description: 'Se og administrer kundene dine.',
  },
  {
    key: 'svar',
    label: 'Svar',
    description: 'Følg med på svar fra kundene på påminnelser.',
  },
  {
    key: 'maler',
    label: 'Meldingsmaler',
    description: 'Lag og rediger maler for påminnelser.',
  },
  {
    key: 'statistikk',
    label: 'Statistikk',
    description: 'Se oppmøte og trender over tid.',
  },
  {
    key: 'integrations',
    label: 'Integrasjoner',
    description: 'Koble til bookingsystemet ditt.',
  },
];

export interface BusinessType {
  key: string;
  label: string;
}

export const BUSINESS_TYPES: BusinessType[] = [
  { key: 'frisor', label: 'Frisør og skjønnhet' },
  { key: 'tannlege', label: 'Tannlege og tannpleie' },
  { key: 'helse', label: 'Helse og klinikk' },
  { key: 'velvare', label: 'Velvære og spa' },
  { key: 'trening', label: 'Trening og PT' },
  { key: 'verksted', label: 'Verksted og bil' },
  { key: 'konsulent', label: 'Konsulent og rådgivning' },
  { key: 'restaurant', label: 'Restaurant og booking' },
  { key: 'aktivitet', label: 'Aktivitet og opplevelser' },
  { key: 'annet', label: 'Annet' },
];

export interface IntegrationOption {
  key: string;
  label: string;
  description: string;
}

export const INTEGRATION_OPTIONS: IntegrationOption[] = [
  {
    key: 'manuell',
    label: 'Manuelt / CSV',
    description: 'Legg inn kunder selv eller importer fra fil.',
  },
  { key: 'fresha', label: 'Fresha', description: 'Synk kunder fra Fresha.' },
  { key: 'calendly', label: 'Calendly', description: 'Synk kunder fra Calendly.' },
  {
    key: 'msbookings',
    label: 'Microsoft Bookings',
    description: 'Synk kunder fra Microsoft Bookings.',
  },
  { key: 'hubspot', label: 'HubSpot', description: 'Synk kunder fra HubSpot.' },
  { key: 'pipedrive', label: 'Pipedrive', description: 'Synk kunder fra Pipedrive.' },
];

export interface OnboardingStatus {
  onboardingCompleted: boolean;
  businessType: string | null;
  enabledSections: string[] | null;
}

/** A section is visible when the user hasn't onboarded yet (null) or chose it. */
export function isSectionEnabled(
  key: string,
  enabledSections: string[] | null | undefined,
): boolean {
  if (!enabledSections) return true;
  return enabledSections.includes(key);
}
