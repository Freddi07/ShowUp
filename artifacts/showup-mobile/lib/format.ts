const DAYS_SHORT = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
const DAYS_LONG = [
  'søndag',
  'mandag',
  'tirsdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lørdag',
];
const MONTHS_SHORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'mai',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'des',
];
const MONTHS_LONG = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000,
  );
}

/** e.g. "I dag", "I morgen", "I går", or "man. 8. jul". */
export function formatDayHeading(d: Date): string {
  const delta = diffDays(d, new Date());
  if (delta === 0) return 'I dag';
  if (delta === 1) return 'I morgen';
  if (delta === -1) return 'I går';
  return `${DAYS_SHORT[d.getDay()]}. ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** e.g. "09:00". */
export function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** e.g. "mandag 8. juli 2026". */
export function formatLongDate(d: Date): string {
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "8. jul 2026". */
export function formatShortDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
