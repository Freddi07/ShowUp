// Lightweight CSV parsing for customer imports. Handles quoted fields,
// comma/semicolon/tab delimiters, and common Norwegian/English column names so
// exports from any platform (Fiken, Fresha, HubSpot, Excel, …) just work.
//
// An appointment is registered for a row only when it has BOTH a date and a
// time (or one combined date/time column) AND a phone number.

export interface ParsedContact {
  name: string;
  phone: string | null;
  email: string | null;
  /** ISO datetime string when the row also describes an appointment, else null. */
  appointmentAt: string | null;
}

const NAME_KEYS = [
  'name',
  'navn',
  'fullt navn',
  'full name',
  'customer',
  'customer name',
  'kunde',
  'kundenavn',
  'contact',
  'contact name',
  'kontakt',
];
const FIRST_KEYS = ['first name', 'firstname', 'fornavn', 'given name'];
const LAST_KEYS = ['last name', 'lastname', 'etternavn', 'surname', 'family name'];
const PHONE_KEYS = [
  'phone',
  'phone number',
  'telefon',
  'telefonnummer',
  'mobil',
  'mobile',
  'mobilnummer',
  'tlf',
  'cell',
  'cellphone',
];
const EMAIL_KEYS = ['email', 'e-mail', 'e-post', 'epost', 'e post', 'mail', 'e-postadresse'];

// Combined date+time column (contains both, e.g. "2026-07-10 14:30").
const DATETIME_KEYS = [
  'tidspunkt',
  'avtaletidspunkt',
  'dato og tid',
  'datetime',
  'date/time',
  'date time',
  'when',
  'start',
  'starttidspunkt',
  'appointment time',
];
// Date-only column.
const DATE_KEYS = [
  'date',
  'dato',
  'avtaledato',
  'appointment date',
  'appointmentdate',
  'booking date',
  'bookingdate',
  'avtale',
  'booking',
];
// Time-of-day column.
const TIME_KEYS = ['time', 'klokkeslett', 'klokke', 'tid', 'starttid', 'start time', 'kl'];

function detectDelimiter(firstLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function findIndex(header: string[], keys: string[]): number {
  return header.findIndex((h) => keys.includes(h));
}

/**
 * Normalize a date fragment to YYYY-MM-DD, or null. Accepts ISO and
 * DD.MM.YYYY / DD/MM/YYYY. Impossible calendar dates (e.g. 31.02) are rejected
 * rather than silently rolled over to the next month.
 */
function normalizeDate(value: string): string | null {
  const v = value.trim();
  let y: number;
  let mo: number;
  let d: number;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const eu = v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
  } else if (eu) {
    d = Number(eu[1]);
    mo = Number(eu[2]);
    y = Number(eu[3]);
    if (eu[3].length === 2) y += 2000;
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // Round-trip check catches impossible dates (31.02, 30.02, etc.).
  const test = new Date(y, mo - 1, d);
  if (test.getFullYear() !== y || test.getMonth() !== mo - 1 || test.getDate() !== d) {
    return null;
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Normalize a time fragment to HH:MM (24h), or null. */
function normalizeTime(value: string): string | null {
  const m = value.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Build a canonical appointment string from a date fragment and optional time.
 *
 * - If the input carries an explicit timezone (…Z or ±HH:MM), it's an absolute
 *   instant and is returned as a full UTC ISO string.
 * - Otherwise it's a wall-clock time and is returned as a naive
 *   "YYYY-MM-DDTHH:MM" string; the server interprets it in Europe/Oslo so the
 *   result is stable regardless of who runs the import or from which timezone.
 *
 * Returns null when a valid date+time cannot be formed.
 */
function toAppointmentIso(dateStr: string, timeStr: string): string | null {
  let d = dateStr.trim();
  let t = timeStr.trim();
  if (!d) return null;

  // Absolute instant: explicit timezone present (e.g. 2026-07-10T14:30:00Z).
  if (!t && /t.*(z|[+-]\d{2}:?\d{2})$/i.test(d)) {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  // Extract an embedded time from the date field (e.g. "10.07.2026 14:30" or
  // "2026-07-10T14:30").
  if (!t) {
    const parts = d.split(/[\sT]+/).filter(Boolean);
    if (parts.length >= 2 && /\d{1,2}[:.]\d{2}/.test(parts[parts.length - 1])) {
      t = parts.pop() ?? '';
      d = parts.join(' ');
    }
  }

  const nd = normalizeDate(d);
  const nt = normalizeTime(t);
  if (!nd || !nt) return null;

  // Naive wall-clock time; the server resolves it against Europe/Oslo.
  return `${nd}T${nt}`;
}

/** Parse raw CSV text into contacts, auto-detecting delimiter and columns. */
export function parseContactsCsv(text: string): ParsedContact[] {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];

  const firstLine = trimmed.split('\n')[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows = parseRows(trimmed, delimiter);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = findIndex(header, NAME_KEYS);
  const firstIdx = findIndex(header, FIRST_KEYS);
  const lastIdx = findIndex(header, LAST_KEYS);
  const phoneIdx = findIndex(header, PHONE_KEYS);
  const emailIdx = findIndex(header, EMAIL_KEYS);
  const datetimeIdx = findIndex(header, DATETIME_KEYS);
  const dateIdx = findIndex(header, DATE_KEYS);
  const timeIdx = findIndex(header, TIME_KEYS);

  const hasHeader =
    nameIdx !== -1 ||
    firstIdx !== -1 ||
    phoneIdx !== -1 ||
    emailIdx !== -1 ||
    datetimeIdx !== -1 ||
    dateIdx !== -1;

  const contacts: ParsedContact[] = [];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  for (const cols of dataRows) {
    const get = (i: number) => (i >= 0 && i < cols.length ? cols[i].trim() : '');
    let name = '';
    if (hasHeader) {
      if (nameIdx !== -1) name = get(nameIdx);
      if (!name) name = [get(firstIdx), get(lastIdx)].filter(Boolean).join(' ').trim();
    } else {
      // No recognizable header: assume name, phone, email by position.
      name = get(0);
    }
    const phone = hasHeader ? get(phoneIdx) || null : get(1) || null;
    const email = hasHeader ? get(emailIdx) || null : get(2) || null;

    let appointmentAt: string | null = null;
    if (hasHeader) {
      if (datetimeIdx !== -1 && get(datetimeIdx)) {
        appointmentAt = toAppointmentIso(get(datetimeIdx), '');
      } else if (dateIdx !== -1 && get(dateIdx)) {
        appointmentAt = toAppointmentIso(get(dateIdx), get(timeIdx));
      }
    }

    if (!name) continue;
    contacts.push({ name, phone, email, appointmentAt });
  }
  return contacts;
}
