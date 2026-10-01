// Az óra exportjainak beolvasása (baseline és tömeges óraadat-import).
//
// Éjszakai export: Date, Sleep, Awake, REM, Core, Deep, Sleep (h), Awake (h), HRV (ms), RHR (bpm),
//                  Readiness Sleep (h). Az időtartamok szövegek: „8:04”, „11m”, „1:07”.
// Nappali export:  Date, Awake RHR (bpm), HRV (ms).
// A „Sleep” az ébren töltött perceket is tartalmazza (REM + Core + Deep + Awake ≈ Sleep).

import { parseFlexibleDate } from '../dates';
import type { EntryMap } from '../entries';
import type { WatchMetric } from '../metrics';
import { parseDuration } from '../parse/duration';
import { parseDecimal } from '../parse/number';
import type { BaselineDay, BaselineNight, ISODate } from '../types';
import {
  autoMap,
  normalizeHeader,
  type ColumnMapping,
  type FieldSpec,
  type RawTable,
} from './table';

export type NightField = Exclude<keyof BaselineNight, never>;
export type DayField = keyof BaselineDay;

type ValueType = 'date' | 'duration' | 'number';

export interface ImportField<K extends string> extends FieldSpec<K> {
  type: ValueType;
}

export const NIGHT_FIELDS: ImportField<NightField>[] = [
  {
    key: 'date',
    label: 'Dátum',
    aliases: ['date', 'dátum', 'nap', 'day'],
    type: 'date',
    required: true,
  },
  {
    key: 'sleepMin',
    label: 'Alvásidő (Sleep)',
    aliases: ['sleep', 'alvás', 'alvásidő', 'total sleep', 'asleep'],
    type: 'duration',
  },
  {
    key: 'awakeMin',
    label: 'Ébren (Awake)',
    aliases: ['awake', 'ébren', 'ébren éjjel'],
    type: 'duration',
  },
  { key: 'remMin', label: 'REM', aliases: ['rem'], type: 'duration' },
  { key: 'coreMin', label: 'Core', aliases: ['core', 'könnyű', 'light'], type: 'duration' },
  {
    key: 'deepMin',
    label: 'Mély (Deep)',
    aliases: ['deep', 'mély', 'mélyalvás'],
    type: 'duration',
  },
  { key: 'hrv', label: 'HRV (ms)', aliases: ['hrv (ms)', 'hrv', 'hrv éjjel'], type: 'number' },
  {
    key: 'rhr',
    label: 'Pulzus (RHR, bpm)',
    aliases: ['rhr (bpm)', 'rhr', 'pulzus (bpm)', 'pulzus', 'resting heart rate'],
    type: 'number',
  },
  {
    key: 'readinessSleepH',
    label: 'Readiness Sleep (h)',
    aliases: ['readiness sleep (h)', 'readiness sleep', 'readiness alvás (ó)'],
    type: 'number',
  },
];

export const DAY_FIELDS: ImportField<DayField>[] = [
  {
    key: 'date',
    label: 'Dátum',
    aliases: ['date', 'dátum', 'nap', 'day'],
    type: 'date',
    required: true,
  },
  {
    key: 'rhrDay',
    label: 'Nappali pulzus (Awake RHR)',
    aliases: ['awake rhr (bpm)', 'awake rhr', 'nappali pulzus', 'rhr (bpm)', 'rhr'],
    type: 'number',
  },
  {
    key: 'hrvDay',
    label: 'Nappali HRV',
    aliases: ['hrv (ms)', 'hrv', 'nappali hrv'],
    type: 'number',
  },
];

export type ExportKind = 'nights' | 'days' | 'unknown';

/** Az export fajtája a fejlécek alapján. */
export function detectKind(headers: string[]): ExportKind {
  const h = headers.map(normalizeHeader);
  const has = (x: string) => h.includes(x);
  if (has('sleep') || has('deep') || has('rem') || has('core') || has('awake')) return 'nights';
  if (has('awake rhr (bpm)') || has('awake rhr')) return 'days';
  return 'unknown';
}

function parseCell(type: ValueType, key: string, raw: unknown): number | ISODate | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (type === 'date') return parseFlexibleDate(raw);
  if (type === 'number') return parseDecimal(raw as string | number);
  // időtartam
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return undefined;
    if (raw < 1) return Math.round(raw * 1440); // Excel-időcella: a nap törtrésze
    if (key === 'sleepMin' && raw <= 24) return Math.round(raw * 60); // tizedes óra
    return Math.round(raw);
  }
  return parseDuration(String(raw));
}

export interface ImportResult<T> {
  rows: T[];
  skipped: number;
  duplicates: number;
}

function convert<T extends { date: ISODate }, K extends string>(
  table: RawTable,
  fields: ImportField<K>[],
  mapping: ColumnMapping<K>,
): ImportResult<T> {
  const byDate = new Map<ISODate, T>();
  let skipped = 0;
  let duplicates = 0;
  for (const r of table.rows) {
    const obj: Record<string, unknown> = {};
    for (const f of fields) {
      const col = mapping[f.key];
      if (col === undefined) continue;
      const v = parseCell(f.type, f.key, r[col]);
      if (v !== undefined) obj[f.key] = v;
    }
    const date = obj.date as ISODate | undefined;
    const hasValue = Object.keys(obj).some((k) => k !== 'date');
    if (!date || !hasValue) {
      skipped++;
      continue;
    }
    if (byDate.has(date)) duplicates++;
    byDate.set(date, obj as T);
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { rows, skipped, duplicates };
}

export function autoMapNights(headers: string[]): ColumnMapping<NightField> {
  return autoMap(headers, NIGHT_FIELDS);
}

export function autoMapDays(headers: string[]): ColumnMapping<DayField> {
  return autoMap(headers, DAY_FIELDS);
}

/** Megfeleltetés elég-e (dátum + legalább egy mutató). */
export function mappingIsUsable<K extends string>(
  mapping: ColumnMapping<K>,
  fields: ImportField<K>[],
): boolean {
  if (mapping['date' as K] === undefined) return false;
  return fields.some((f) => f.key !== 'date' && mapping[f.key] !== undefined);
}

export function importNights(
  table: RawTable,
  mapping = autoMapNights(table.headers),
): ImportResult<BaselineNight> {
  return convert<BaselineNight, NightField>(table, NIGHT_FIELDS, mapping);
}

export function importDays(
  table: RawTable,
  mapping = autoMapDays(table.headers),
): ImportResult<BaselineDay> {
  return convert<BaselineDay, DayField>(table, DAY_FIELDS, mapping);
}

// ---------------------------------------------------------------------------
// Tömeges óraadat-import a kísérlet alatt: dátum szerint beolvad a napokba.
// Kézzel beírt értéket kérdés nélkül nem ír felül.
// ---------------------------------------------------------------------------

const NIGHT_TO_ENTRY: [keyof BaselineNight, WatchMetric][] = [
  ['sleepMin', 'sleepMin'],
  ['awakeMin', 'awakeMin'],
  ['deepMin', 'deepMin'],
  ['remMin', 'remMin'],
  ['hrv', 'hrvNight'],
  ['rhr', 'rhrNight'],
];

export interface WatchMergePlan {
  /** Kérdés nélkül alkalmazható értékek (üres mező vagy korábbi import). */
  apply: { date: ISODate; values: Partial<Record<WatchMetric, number>> }[];
  /** Kézzel beírt, eltérő értékek – a felhasználó dönt. */
  conflicts: { date: ISODate; metric: WatchMetric; current: number; incoming: number }[];
  unchanged: number;
}

export function nightToWatchValues(n: BaselineNight): Partial<Record<WatchMetric, number>> {
  const out: Partial<Record<WatchMetric, number>> = {};
  for (const [from, to] of NIGHT_TO_ENTRY) {
    const v = n[from];
    if (typeof v === 'number') out[to] = v;
  }
  return out;
}

export function planWatchMerge(rows: readonly BaselineNight[], entries: EntryMap): WatchMergePlan {
  const plan: WatchMergePlan = { apply: [], conflicts: [], unchanged: 0 };
  for (const row of rows) {
    const incoming = nightToWatchValues(row);
    const entry = entries.get(row.date);
    const values: Partial<Record<WatchMetric, number>> = {};
    for (const [metric, v] of Object.entries(incoming) as [WatchMetric, number][]) {
      const current = entry?.[metric];
      if (current === undefined || entry?.deviceSource === 'import') {
        if (current !== v) values[metric] = v;
        else plan.unchanged++;
      } else if (Math.abs(current - v) < 1e-9) {
        plan.unchanged++;
      } else {
        plan.conflicts.push({ date: row.date, metric, current, incoming: v });
      }
    }
    if (Object.keys(values).length) plan.apply.push({ date: row.date, values });
  }
  return plan;
}
