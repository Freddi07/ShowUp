import { API_BASE, getToken } from './auth';

export const OPTIONAL_SECTION_KEYS = [
  'kunder',
  'svar',
  'maler',
  'statistikk',
  'integrations',
] as const;

export type SectionKey = (typeof OPTIONAL_SECTION_KEYS)[number];

export interface OnboardingStatus {
  onboardingCompleted: boolean;
  businessType: string | null;
  enabledSections: string[] | null;
}

export interface OptionItem {
  key: string;
  label: string;
  description?: string;
}

export const BUSINESS_TYPES: OptionItem[] = [
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

export const SECTION_META: OptionItem[] = [
  { key: 'kunder', label: 'Kunder', description: 'Se og administrer kundene dine.' },
  { key: 'svar', label: 'Svar', description: 'Følg med på svar fra kundene.' },
  { key: 'maler', label: 'Meldingsmaler', description: 'Lag og rediger påminnelser.' },
  { key: 'statistikk', label: 'Statistikk', description: 'Se oppmøte over tid.' },
  {
    key: 'integrations',
    label: 'Integrasjoner',
    description: 'Koble til bookingsystemet ditt.',
  },
];

export const INTEGRATION_OPTIONS: OptionItem[] = [
  { key: 'manuell', label: 'Manuelt / CSV', description: 'Legg inn kunder selv.' },
  { key: 'fresha', label: 'Fresha', description: 'Synk kunder fra Fresha.' },
  { key: 'calendly', label: 'Calendly', description: 'Synk kunder fra Calendly.' },
  {
    key: 'msbookings',
    label: 'Microsoft Bookings',
    description: 'Synk fra Microsoft Bookings.',
  },
  { key: 'hubspot', label: 'HubSpot', description: 'Synk kunder fra HubSpot.' },
  { key: 'pipedrive', label: 'Pipedrive', description: 'Synk fra Pipedrive.' },
];

export function isSectionEnabled(
  key: string,
  enabledSections: string[] | null | undefined,
): boolean {
  if (!enabledSections) return true;
  return enabledSections.includes(key);
}

/**
 * Reads the signed-in user's onboarding state. Retries transient failures so an
 * unstable connection doesn't leave the gate unresolved (which would otherwise
 * let a not-yet-onboarded user slip past). Returns null only if there is no
 * session, or after all retries are exhausted.
 */
export async function fetchOnboarding(
  retries = 3,
): Promise<OnboardingStatus | null> {
  const token = await getToken();
  if (!token) return null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/onboarding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 401 is terminal (no valid session) — don't keep retrying.
      if (res.status === 401) return null;
      if (res.ok) return (await res.json()) as OnboardingStatus;
    } catch {
      // Network error — fall through to retry.
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

/** Persists onboarding changes and returns the updated state. */
export async function saveOnboarding(
  body: Partial<OnboardingStatus>,
): Promise<OnboardingStatus> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/api/onboarding`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Save failed');
  return (await res.json()) as OnboardingStatus;
}
