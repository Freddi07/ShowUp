/**
 * BookPling design tokens — warm amber brand palette.
 * Derived from the web app's OKLCH palette (--brand-h: 38) converted to hex,
 * so web and mobile share one visual identity.
 */

const brand = {
  50: '#ffece0',
  100: '#ffd8c6',
  200: '#ffbca0',
  300: '#ff9471',
  400: '#ee6438',
  500: '#ce4714',
  600: '#b22a00',
  700: '#901700',
  800: '#6d0b00',
  900: '#480700',
};

const colors = {
  brand,

  light: {
    text: '#16100e',
    tint: brand[600],

    background: '#fefbfa',
    foreground: '#16100e',

    card: '#ffffff',
    cardForeground: '#16100e',

    primary: brand[600],
    primaryForeground: '#fff7f3',

    secondary: '#f6f0ef',
    secondaryForeground: '#3a302c',

    muted: '#f6f0ef',
    mutedForeground: '#6e605b',

    accent: brand[100],
    accentForeground: brand[800],

    destructive: '#e7000b',
    destructiveForeground: '#ffffff',

    border: '#e9e1de',
    input: '#e9e1de',
  },

  dark: {
    text: '#f6f0ef',
    tint: brand[400],

    background: '#120c0a',
    foreground: '#f6f0ef',

    card: '#1f1613',
    cardForeground: '#f6f0ef',

    primary: brand[400],
    primaryForeground: '#1a0e08',

    secondary: '#2a1f1a',
    secondaryForeground: '#f0e6e2',

    muted: '#2a1f1a',
    mutedForeground: '#b0a099',

    accent: '#3a251b',
    accentForeground: brand[200],

    destructive: '#ff6b6b',
    destructiveForeground: '#1a0e08',

    border: '#332621',
    input: '#332621',
  },

  radius: 12,
};

export type AppointmentStatusKey =
  | 'PENDING'
  | 'REMINDED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'RESCHEDULE_REQUESTED';

export const statusMeta: Record<
  AppointmentStatusKey,
  { color: string; label: string; icon: string; short: string }
> = {
  CONFIRMED: {
    color: '#2e9e52',
    label: 'Bekreftet',
    short: 'Bekreftet',
    icon: 'checkmark-circle',
  },
  CANCELLED: {
    color: '#de3b3d',
    label: 'Avlyst',
    short: 'Avlyst',
    icon: 'close-circle',
  },
  RESCHEDULE_REQUESTED: {
    color: '#3a84ca',
    label: 'Vil endre tid',
    short: 'Endre',
    icon: 'calendar',
  },
  REMINDED: {
    color: '#e49e22',
    label: 'Påminnelse sendt',
    short: 'Påminnet',
    icon: 'notifications',
  },
  PENDING: {
    color: '#8a7a72',
    label: 'Venter',
    short: 'Venter',
    icon: 'ellipse-outline',
  },
};

export default colors;
