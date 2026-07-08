// Lightweight CSV parsing for customer imports. Handles quoted fields,
// comma/semicolon/tab delimiters, and common Norwegian/English column names so
// exports from any platform (Fiken, Fresha, HubSpot, Excel, …) just work.

export interface ParsedContact {
  name: string;
  phone: string | null;
  email: string | null;
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

  const hasHeader =
    nameIdx !== -1 || firstIdx !== -1 || phoneIdx !== -1 || emailIdx !== -1;

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
    const phone = hasHeader
      ? get(phoneIdx) || null
      : get(1) || null;
    const email = hasHeader
      ? get(emailIdx) || null
      : get(2) || null;

    if (!name) continue;
    contacts.push({ name, phone, email });
  }
  return contacts;
}
