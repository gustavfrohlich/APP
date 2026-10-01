// Naptári napok kezelése időzóna- és nyári időszámítás-függetlenül.
// Minden számítás az 'YYYY-MM-DD' alakon, UTC-éjfélként értelmezve történik.

import type { ISODate } from './types';

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  return toISOFromUTC(t) === value;
}

function toUTC(iso: ISODate): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Érvénytelen dátum: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toISOFromUTC(t: number): ISODate {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Helyi idő szerinti naptári nap egy Date-ből. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

/** Helyi éjfél Date-ként (date-fns formázáshoz). */
export function toLocalDate(iso: ISODate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Érvénytelen dátum: ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(iso: ISODate, n: number): ISODate {
  return toISOFromUTC(toUTC(iso) + n * DAY_MS);
}

/** b − a napokban (pozitív, ha b későbbi). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** A hét napja: 0 = hétfő … 6 = vasárnap. */
export function weekdayIndex(iso: ISODate): number {
  const js = new Date(toUTC(iso)).getUTCDay(); // 0 = vasárnap
  return (js + 6) % 7;
}

export function isWeekend(iso: ISODate): boolean {
  return weekdayIndex(iso) >= 5;
}

export function mondayOf(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

/** A következő hétfő; ha a nap maga hétfő, akkor az. */
export function nextMondayFrom(iso: ISODate): ISODate {
  const wd = weekdayIndex(iso);
  return wd === 0 ? iso : addDays(iso, 7 - wd);
}

/** Zárt intervallum minden napja, időrendben. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const n = diffDays(from, to);
  const out: ISODate[] = [];
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** Excel dátum-sorszám (1900-as rendszer) → ISO nap. */
export function fromExcelSerial(serial: number): ISODate {
  // 25569 = 1970-01-01 az Excel 1900-as rendszerében (a szökőév-hibát is beleértve)
  const t = Math.round((serial - 25569) * DAY_MS);
  return toISOFromUTC(Math.floor(t / DAY_MS) * DAY_MS);
}

/**
 * Rugalmas dátumfelismerés importhoz: ISO, ISO + idő, „2026.08.03.”, „2026/08/03”,
 * „03.08.2026”, „8/3/2026” (amerikai), Excel-sorszám és Date objektum.
 */
export function parseFlexibleDate(value: unknown): ISODate | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    // Táblázatkezelők néha néhány másodperccel éjfél elé kerekítenek – egy perc tűrés.
    return toISODate(new Date(value.getTime() + 60_000));
  }
  if (typeof value === 'number') {
    if (value > 20000 && value < 80000) return fromExcelSerial(value);
    return undefined;
  }
  const s = String(value).trim();
  let m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?(?:[ T].*)?$/.exec(s);
  if (m) return normalize(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?(?:\s.*)?$/.exec(s);
  if (m) return normalize(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,].*)?$/.exec(s);
  if (m) {
    const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return normalize(year, Number(m[1]), Number(m[2]));
  }
  if (/^\d+(\.\d+)?$/.test(s)) return parseFlexibleDate(Number(s));
  return undefined;
}

function normalize(y: number, m: number, d: number): ISODate | undefined {
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isISODate(iso) ? iso : undefined;
}
