// A Napló lap oszlopai – ugyanaz a sorrend és fejléc az xlsx/csv exportban, a táblázat nézetben
// és a DEMO Excel beolvasásakor. Egy helyen van, hogy könnyű legyen az Excelhez igazítani.

import type { Baseline } from '../baseline';
import { parseFlexibleDate } from '../dates';
import { formatDuration, weekdayShort } from '../format';
import { nightScore } from '../nightScore';
import { parseDuration } from '../parse/duration';
import { parseDecimal } from '../parse/number';
import type { BloatingWhen, DayEntry, DietAdherence, Exercise, ISODate, Location } from '../types';
import { dietWeek } from '../weeks';
import { normalizeHeader, stripAccents } from './table';

export const LOCATION_LABELS: Record<Location, string> = {
  budapest: 'Budapest',
  home_sk: 'Otthon (SK)',
  other: 'Máshol',
};

export const BLOATING_WHEN_LABELS: Record<BloatingWhen, string> = {
  none: 'Nem volt',
  breakfast: 'Reggeli után',
  lunch: 'Ebéd után',
  dinner: 'Vacsora után',
  allday: 'Egész nap',
};

export const DIET_LABELS: Record<DietAdherence, string> = {
  yes: 'Igen',
  partial: 'Részben',
  no: 'Nem',
};

export const EXERCISE_LABELS: Record<Exercise, string> = {
  none: 'Nincs',
  light: 'Könnyű',
  moderate: 'Közepes',
  intense: 'Intenzív',
};

function reverseLookup<T extends string>(labels: Record<T, string>, raw: unknown): T | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = stripAccents(String(raw).trim().toLowerCase());
  for (const [k, v] of Object.entries(labels) as [T, string][]) {
    if (stripAccents(v.toLowerCase()) === s || k === s) return k;
  }
  // rugalmasabb egyezések
  for (const [k, v] of Object.entries(labels) as [T, string][]) {
    if (stripAccents(v.toLowerCase()).startsWith(s) || s.startsWith(stripAccents(v.toLowerCase())))
      return k;
  }
  return undefined;
}

function parseBool(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'boolean') return raw;
  const s = stripAccents(String(raw).trim().toLowerCase());
  if (['igen', 'i', 'yes', 'y', 'true', '1', 'x'].includes(s)) return true;
  if (['nem', 'n', 'no', 'false', '0', '-'].includes(s)) return false;
  return undefined;
}

function parseList(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const items = String(raw)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function durationCell(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw < 1 ? Math.round(raw * 1440) : Math.round(raw);
  return parseDuration(raw as string | undefined);
}

export type CellValue = string | number | undefined;

/** Az oszlop típusa – az exportálók ez alapján formáznak (xlsx: [h]:mm, csv: „7:56”). */
export type ColumnType = 'date' | 'text' | 'number' | 'duration' | 'score';

export interface JournalColumn {
  id: string;
  /** Fejléc – szóról szóra az Excel-tracker Napló lapjáról. */
  header: string;
  aliases: string[];
  type: ColumnType;
  /** Szerkeszthető mező a táblázatban (a számított oszlopoknál nincs). */
  field?: keyof DayEntry;
  width: number;
  /** Nyers érték: időtartamnál perc, dátumnál ISO nap, pontszámnál szám. */
  value: (e: DayEntry, ctx: JournalContext) => CellValue;
  parse?: (raw: unknown) => Partial<DayEntry>;
}

export interface JournalContext {
  start: ISODate;
  baseline: Baseline;
}

const num = (field: keyof DayEntry) => (raw: unknown) => {
  const v = parseDecimal(raw as string | number | undefined);
  return v === undefined ? {} : ({ [field]: v } as Partial<DayEntry>);
};
const dur = (field: keyof DayEntry) => (raw: unknown) => {
  const v = durationCell(raw);
  return v === undefined ? {} : ({ [field]: v } as Partial<DayEntry>);
};
const scaleCol = (
  id: keyof DayEntry & string,
  header: string,
  aliases: string[],
  width = 9,
): JournalColumn => ({
  id,
  header,
  aliases,
  type: 'number',
  field: id,
  width,
  value: (e) => e[id] as number | undefined,
  parse: num(id),
});
const durationCol = (
  id: keyof DayEntry & string,
  header: string,
  aliases: string[],
): JournalColumn => ({
  id,
  header,
  aliases,
  type: 'duration',
  field: id,
  width: 9,
  value: (e) => e[id] as number | undefined,
  parse: dur(id),
});

/**
 * Az Excel Napló lapjának oszlopai (B → AA), ugyanabban a sorrendben, ugyanazzal a fejléccel.
 * A végén két, csak az appban létező oszlop: „Mi volt?” és „Címkék”.
 */
export const JOURNAL_COLUMNS: JournalColumn[] = [
  {
    id: 'week',
    header: 'Hét',
    aliases: ['hét'],
    type: 'number',
    width: 5,
    value: (e, c) => {
      const w = dietWeek(e.date, c.start);
      return w >= 1 ? w : undefined;
    },
  },
  {
    id: 'date',
    header: 'Dátum',
    aliases: ['dátum', 'date'],
    type: 'date',
    width: 11,
    value: (e) => e.date,
    parse: (raw) => {
      const d = parseFlexibleDate(raw);
      return d ? { date: d } : {};
    },
  },
  {
    id: 'weekday',
    header: 'Nap',
    aliases: ['nap'],
    type: 'text',
    width: 5,
    value: (e) => weekdayShort(e.date),
  },
  {
    id: 'partnerStayed',
    header: 'Barátnő itt aludt?',
    aliases: ['barátnő itt aludt?', 'barátnő itt aludt', 'barátnő'],
    type: 'text',
    field: 'partnerStayed',
    width: 10,
    value: (e) => (e.partnerStayed === undefined ? undefined : e.partnerStayed ? 'Igen' : 'Nem'),
    parse: (raw) => {
      const v = parseBool(raw);
      return v === undefined ? {} : { partnerStayed: v };
    },
  },
  {
    id: 'location',
    header: 'Hol aludtál?',
    aliases: ['hol aludtál?', 'hol aludtál', 'hely'],
    type: 'text',
    field: 'location',
    width: 12,
    value: (e) => (e.location ? LOCATION_LABELS[e.location] : undefined),
    parse: (raw) => {
      const v = reverseLookup(LOCATION_LABELS, raw);
      return v ? { location: v } : {};
    },
  },
  scaleCol(
    'sleepQuality',
    'Alvásminőség\n(1–10)',
    ['alvásminőség (1–10)', 'alvásminőség (1-10)', 'alvásminőség'],
    11,
  ),
  durationCol('sleepMin', 'Alvásidő\n(ó:pp)', ['alvásidő (ó:pp)', 'alvásidő', 'alvás']),
  durationCol('awakeMin', 'Ébren éjjel\n(ó:pp)', ['ébren éjjel (ó:pp)', 'ébren éjjel', 'ébren']),
  durationCol('deepMin', 'Mélyalvás\n(ó:pp)', ['mélyalvás (ó:pp)', 'mélyalvás', 'mély']),
  durationCol('remMin', 'REM\n(ó:pp)', ['rem (ó:pp)', 'rem']),
  scaleCol('hrvNight', 'HRV\n(ms)', ['hrv (ms)', 'hrv']),
  scaleCol('rhrNight', 'Pulzus\n(bpm)', ['pulzus (bpm)', 'pulzus']),
  {
    id: 'nightScore',
    header: 'Éjszaka\nvs. átlag',
    aliases: ['éjszaka vs. átlag', 'éjszaka-összkép', 'összkép'],
    type: 'score',
    width: 11,
    value: (e, c) => nightScore(e, c.baseline),
  },
  scaleCol('nose', 'Orr / légzés\n(0–10)', [
    'orr / légzés (0–10)',
    'orr / légzés (0-10)',
    'orr / légzés',
    'orr',
  ]),
  scaleCol('fatigue', 'Fáradtság\n(0–10)', ['fáradtság (0–10)', 'fáradtság (0-10)', 'fáradtság']),
  scaleCol(
    'postMealFatigue',
    'Evés utáni\nfáradtság\n(0–10)',
    ['evés utáni fáradtság (0–10)', 'evés utáni fáradtság (0-10)', 'evés utáni fáradtság'],
    11,
  ),
  scaleCol('bloating', 'Puffadás\n(0–10)', ['puffadás (0–10)', 'puffadás (0-10)', 'puffadás']),
  {
    id: 'bloatingWhen',
    header: 'Puffadás\nmikor?',
    aliases: ['puffadás mikor?', 'puffadás mikor'],
    type: 'text',
    field: 'bloatingWhen',
    width: 12,
    value: (e) => (e.bloatingWhen ? BLOATING_WHEN_LABELS[e.bloatingWhen] : undefined),
    parse: (raw) => {
      const v = reverseLookup(BLOATING_WHEN_LABELS, raw);
      return v ? { bloatingWhen: v } : {};
    },
  },
  {
    id: 'diet',
    header: 'Diéta\nbetartva?',
    aliases: ['diéta betartva?', 'diéta betartva', 'diéta'],
    type: 'text',
    field: 'diet',
    width: 10,
    value: (e) => (e.diet ? DIET_LABELS[e.diet] : undefined),
    parse: (raw) => {
      const v = reverseLookup(DIET_LABELS, raw);
      return v ? { diet: v } : {};
    },
  },
  scaleCol('caffeine', 'Koffein\n(adag)', ['koffein (adag)', 'koffein'], 8),
  scaleCol('alcohol', 'Alkohol\n(ital)', ['alkohol (ital)', 'alkohol'], 8),
  {
    id: 'exercise',
    header: 'Mozgás',
    aliases: ['mozgás'],
    type: 'text',
    field: 'exercise',
    width: 10,
    value: (e) => (e.exercise ? EXERCISE_LABELS[e.exercise] : undefined),
    parse: (raw) => {
      const v = reverseLookup(EXERCISE_LABELS, raw);
      return v ? { exercise: v } : {};
    },
  },
  scaleCol('stress', 'Stressz\n(0–10)', ['stressz (0–10)', 'stressz (0-10)', 'stressz'], 8),
  scaleCol('rhrDay', 'Nappali\npulzus (opc.)', ['nappali pulzus (opc.)', 'nappali pulzus'], 10),
  scaleCol('hrvDay', 'Nappali\nHRV (opc.)', ['nappali hrv (opc.)', 'nappali hrv'], 10),
  {
    id: 'note',
    header: 'Megjegyzés (gyógyszer, orrspray, betegség, kilengés…)',
    aliases: ['megjegyzés (gyógyszer, orrspray, betegség, kilengés…)', 'megjegyzés'],
    type: 'text',
    field: 'note',
    width: 36,
    value: (e) => e.note,
    parse: (raw) =>
      raw === undefined || raw === null || String(raw).trim() === ''
        ? {}
        : { note: String(raw).trim() },
  },
  {
    id: 'dietSlip',
    header: 'Mi volt?',
    aliases: ['mi volt?', 'mi volt'],
    type: 'text',
    field: 'dietSlip',
    width: 18,
    value: (e) =>
      [...(e.dietSlip ?? []), ...(e.dietSlipNote ? [e.dietSlipNote] : [])].join(', ') || undefined,
    parse: (raw) => {
      const v = parseList(raw);
      return v ? { dietSlip: v } : {};
    },
  },
  {
    id: 'tags',
    header: 'Címkék',
    aliases: ['címkék', 'tags'],
    type: 'text',
    field: 'tags',
    width: 20,
    value: (e) => e.tags?.join(', ') || undefined,
    parse: (raw) => {
      const v = parseList(raw);
      return v ? { tags: v } : {};
    },
  },
];

/** Excel-számformátum az „Éjszaka vs. átlag” oszlophoz – ugyanaz, mint a trackerben. */
export const NIGHT_SCORE_FORMAT = '[>=0.5]"▲ jobb";[<=-0.5]"▼ rosszabb";"● átlagos"';

/** Megjelenítéshez / csv-hez formázott cellaérték. */
export function displayCell(col: JournalColumn, v: CellValue): string {
  if (v === undefined || v === '') return '';
  if (col.type === 'duration') return formatDuration(v as number);
  if (col.type === 'score') return String(Math.round((v as number) * 100) / 100).replace('.', ',');
  if (typeof v === 'number') return String(v).replace('.', ',');
  return String(v);
}

/** A Napló lap sorai csv-hez: fejléc (sortörés nélkül) + formázott adatsorok. */
export function journalCsvRows(entries: readonly DayEntry[], ctx: JournalContext): string[][] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return [
    JOURNAL_COLUMNS.map((c) => c.header.replace(/\n/g, ' ')),
    ...sorted.map((e) => JOURNAL_COLUMNS.map((c) => displayCell(c, c.value(e, ctx)))),
  ];
}

/** Fejlécsor → oszlop-megfeleltetés (pontos, majd ékezet nélküli, majd előtag-egyezés). */
export function mapJournalHeaders(headers: unknown[]): Map<number, JournalColumn> {
  const out = new Map<number, JournalColumn>();
  const norm = headers.map((h) => stripAccents(normalizeHeader(h)));
  const used = new Set<string>();
  for (const pass of [0, 1] as const) {
    norm.forEach((h, i) => {
      if (!h || out.has(i)) return;
      const col = JOURNAL_COLUMNS.find(
        (c) =>
          c.parse &&
          !used.has(c.id) &&
          c.aliases.some((a) => {
            const x = stripAccents(normalizeHeader(a));
            return pass === 0 ? x === h : h.startsWith(x);
          }),
      );
      if (col) {
        out.set(i, col);
        used.add(col.id);
      }
    });
  }
  return out;
}

/** Napló-sorok visszaolvasása DayEntry-kké (DEMO Excel, saját export). */
export function parseJournalRows(
  headers: unknown[],
  rows: unknown[][],
  now = new Date().toISOString(),
): DayEntry[] {
  const mapping = mapJournalHeaders(headers);
  const out: DayEntry[] = [];
  for (const r of rows) {
    let entry: Partial<DayEntry> = {};
    for (const [i, col] of mapping) {
      entry = { ...entry, ...col.parse!(r[i]) };
    }
    if (entry.date) out.push({ ...entry, date: entry.date, updatedAt: now });
  }
  return out;
}
