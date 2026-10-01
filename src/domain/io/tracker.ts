// A régi Excel-tracker (Eliminacios_dieta_tracker.xlsx) beolvasása.
// Bemenet: lapnév → mátrix (a SheetJS sheet_to_json({ header: 1, raw: true }) kimenete).
// A cellákat fejléc-szöveg alapján keresi, nem fix oszlopbetűk szerint.

import type { BaselineMetric } from '../metrics';
import { parseFlexibleDate } from '../dates';
import { parseDecimal } from '../parse/number';
import type {
  BaselineDay,
  BaselineNight,
  DayEntry,
  ISODate,
  PlanWeek,
  SubjectiveBaseline,
} from '../types';
import { parseResult } from '../verdict';
import { autoMapDays, autoMapNights, importDays, importNights } from './baselineImport';
import { parseJournalRows } from './journalColumns';
import { normalizeHeader, stripAccents } from './table';

export type SheetMatrix = unknown[][];

export interface TrackerOverviewRow {
  week: number;
  food: string;
  filledDays?: number;
  sleepMin?: number;
  awakeMin?: number;
  deepMin?: number;
  remMin?: number;
  hrvNight?: number;
  rhrNight?: number;
  nightScore?: number;
  sleepQuality?: number;
  nose?: number;
  fatigue?: number;
  postMealFatigue?: number;
  bloating?: number;
  /** A „Romlás az előző héthez képest” cella szövege, pl. „▼ orr, puffadás”. */
  worsening: string;
  result?: string;
}

export interface TrackerImport {
  startDate?: ISODate;
  subjective: SubjectiveBaseline;
  /** A Baseline lap számított statisztikái (perc / ms / bpm). */
  baselineStats: Partial<Record<BaselineMetric, { mean: number; sd?: number; n?: number }>>;
  baselineNights: BaselineNight[];
  baselineDays: BaselineDay[];
  days: DayEntry[];
  plan: PlanWeek[];
  overview: TrackerOverviewRow[];
}

const key = (v: unknown) => stripAccents(normalizeHeader(v));

function findRow(m: SheetMatrix, pred: (row: unknown[]) => boolean, from = 0): number {
  for (let i = from; i < m.length; i++) if (pred(m[i] ?? [])) return i;
  return -1;
}

function indexOfCell(row: unknown[], text: string, from = 0): number {
  const t = key(text);
  for (let i = from; i < row.length; i++) if (key(row[i]) === t) return i;
  return -1;
}

const num = (v: unknown) => (typeof v === 'number' ? v : parseDecimal(v as string | undefined));
const dayFracToMin = (v: unknown) => {
  const n = num(v);
  return n === undefined ? undefined : n < 1 ? n * 1440 : n;
};

function sliceTable(m: SheetMatrix, headerRow: number, from: number, to?: number) {
  const headers = (m[headerRow] ?? []).slice(from, to).map((h) => String(h ?? ''));
  const rows = m
    .slice(headerRow + 1)
    .map((r) => r.slice(from, to))
    .filter((r) => r.some((c) => c !== undefined && c !== null && c !== ''));
  return { headers, rows };
}

const BASELINE_LABELS: [string, BaselineMetric, boolean][] = [
  ['alvásidő', 'sleepMin', true],
  ['ébren éjjel', 'awakeMin', true],
  ['mélyalvás', 'deepMin', true],
  ['rem', 'remMin', true],
  ['hrv – éjjel (ms)', 'hrvNight', false],
  ['pulzus – éjjel (bpm)', 'rhrNight', false],
  ['nappali pulzus (bpm)', 'rhrDay', false],
  ['nappali hrv (ms)', 'hrvDay', false],
];

const SUBJECTIVE_LABELS: [string, keyof SubjectiveBaseline][] = [
  ['alvásminőség (1–10)', 'sleepQuality'],
  ['orr / légzés (0–10)', 'nose'],
  ['fáradtság (0–10)', 'fatigue'],
  ['evés utáni fáradtság (0–10)', 'postMealFatigue'],
  ['puffadás (0–10)', 'bloating'],
];

function parseBaselineSheet(m: SheetMatrix | undefined) {
  const stats: TrackerImport['baselineStats'] = {};
  const subjective: SubjectiveBaseline = {};
  let nights: BaselineNight[] = [];
  let days: BaselineDay[] = [];
  if (!m) return { stats, subjective, nights, days };

  const statHeader = findRow(
    m,
    (r) => indexOfCell(r, 'Átlag') >= 0 && indexOfCell(r, 'Szórás') >= 0,
  );
  if (statHeader >= 0) {
    const hr = m[statHeader]!;
    const labelCol = indexOfCell(hr, 'Mutató');
    const meanCol = indexOfCell(hr, 'Átlag');
    const sdCol = indexOfCell(hr, 'Szórás');
    const nCol = indexOfCell(hr, 'Napok');
    for (let i = statHeader + 1; i < Math.min(m.length, statHeader + 12); i++) {
      const row = m[i] ?? [];
      const label = key(row[labelCol]);
      const def = BASELINE_LABELS.find(([l]) => key(l) === label);
      if (!def) continue;
      const [, metric, isDuration] = def;
      const conv = isDuration ? dayFracToMin : num;
      const mean = conv(row[meanCol]);
      if (mean === undefined) continue;
      stats[metric] = { mean, sd: conv(row[sdCol]), n: num(row[nCol]) };
    }
  }

  const subjHeader = findRow(m, (r) => indexOfCell(r, 'Becslésed') >= 0);
  if (subjHeader >= 0) {
    const hr = m[subjHeader]!;
    const labelCol = indexOfCell(hr, 'Mutató');
    const valCol = indexOfCell(hr, 'Becslésed');
    for (let i = subjHeader + 1; i < Math.min(m.length, subjHeader + 8); i++) {
      const row = m[i] ?? [];
      const def = SUBJECTIVE_LABELS.find(([l]) => key(l) === key(row[labelCol]));
      const v = num(row[valCol]);
      if (def && v !== undefined) subjective[def[1]] = v;
    }
  }

  const rawHeader = findRow(m, (r) => indexOfCell(r, 'Dátum') >= 0 && indexOfCell(r, 'Alvás') >= 0);
  if (rawHeader >= 0) {
    const hr = m[rawHeader]!;
    const firstDate = indexOfCell(hr, 'Dátum');
    const secondDate = indexOfCell(hr, 'Dátum', firstDate + 1);
    const nt = sliceTable(m, rawHeader, firstDate, secondDate >= 0 ? secondDate : undefined);
    nights = importNights(nt, autoMapNights(nt.headers)).rows;
    if (secondDate >= 0) {
      const dt = sliceTable(m, rawHeader, secondDate);
      days = importDays(dt, autoMapDays(dt.headers)).rows;
    }
  }
  return { stats, subjective, nights, days };
}

function parseNaplo(m: SheetMatrix | undefined): DayEntry[] {
  if (!m) return [];
  const hr = findRow(
    m,
    (r) => indexOfCell(r, 'Dátum') >= 0 && r.some((c) => key(c).startsWith('alvasminoseg')),
  );
  if (hr < 0) return [];
  const rows = m.slice(hr + 1);
  // Csak a ténylegesen kitöltött sorok (a dátum képlettel mindig ott van).
  const entries = parseJournalRows(m[hr]!, rows);
  return entries.filter((e) => Object.keys(e).some((k) => k !== 'date' && k !== 'updatedAt'));
}

function parsePlan(m: SheetMatrix | undefined): PlanWeek[] {
  if (!m) return [];
  const hr = findRow(m, (r) => indexOfCell(r, 'Hét') >= 0 && indexOfCell(r, 'Eredmény') >= 0);
  if (hr < 0) return [];
  const h = m[hr]!;
  const col = (prefix: string) => h.findIndex((c) => key(c).startsWith(key(prefix)));
  const cWeek = col('Hét');
  const cFood = col('Új étel');
  const cEat = col('Mit eszel');
  const cTip = col('Adag');
  const cRes = col('Eredmény');
  const cNote = col('Megjegyzés');
  const out: PlanWeek[] = [];
  for (let i = hr + 1; i < m.length; i++) {
    const row = m[i] ?? [];
    const wm = /^(\d+)\.\s*hét/i.exec(String(row[cWeek] ?? '').trim());
    if (!wm) {
      if (out.length) break;
      continue;
    }
    const week: PlanWeek = {
      week: Number(wm[1]),
      food: String(row[cFood] ?? '').trim(),
      eat: String(row[cEat] ?? '').trim(),
      tip: String(row[cTip] ?? '').trim(),
    };
    const result = parseResult(row[cRes]);
    if (result) week.result = result;
    const note = String(row[cNote] ?? '').trim();
    if (note) week.resultNote = note;
    out.push(week);
  }
  return out;
}

function parseOverview(m: SheetMatrix | undefined): {
  start?: ISODate;
  rows: TrackerOverviewRow[];
} {
  if (!m) return { rows: [] };
  let start: ISODate | undefined;
  for (let i = 0; i < m.length && !start; i++) {
    const row = m[i] ?? [];
    const c = row.findIndex((v) => key(v).startsWith('kezdes'));
    if (c >= 0) start = parseFlexibleDate(m[i + 1]?.[c]);
  }
  const hr = findRow(m, (r) => indexOfCell(r, 'Étel') >= 0 && indexOfCell(r, 'Napok') >= 0);
  if (hr < 0) return { start, rows: [] };
  const h = m[hr]!;
  const col = (label: string) => indexOfCell(h, label);
  const prefix = (p: string) => h.findIndex((c) => key(c).startsWith(key(p)));
  const C = {
    week: col('Hét'),
    food: col('Étel'),
    days: col('Napok'),
    sleep: col('Alvásidő'),
    awake: col('Ébren'),
    deep: col('Mély'),
    rem: col('REM'),
    hrv: col('HRV'),
    rhr: col('Pulzus'),
    score: col('Éjszaka összkép'),
    sq: col('Alvásminőség'),
    nose: col('Orr / légzés'),
    fatigue: col('Fáradtság'),
    pmf: col('Evés utáni fáradtság'),
    bloat: col('Puffadás'),
    worse: prefix('Romlás'),
    result: col('Eredmény'),
  };
  const rows: TrackerOverviewRow[] = [];
  for (let i = hr + 1; i < m.length; i++) {
    const r = m[i] ?? [];
    const wm = /^(\d+)\.\s*hét/i.exec(String(r[C.week] ?? '').trim());
    if (!wm) {
      if (rows.length) break;
      continue;
    }
    rows.push({
      week: Number(wm[1]),
      food: String(r[C.food] ?? ''),
      filledDays: num(r[C.days]),
      sleepMin: dayFracToMin(r[C.sleep]),
      awakeMin: dayFracToMin(r[C.awake]),
      deepMin: dayFracToMin(r[C.deep]),
      remMin: dayFracToMin(r[C.rem]),
      hrvNight: num(r[C.hrv]),
      rhrNight: num(r[C.rhr]),
      nightScore: num(r[C.score]),
      sleepQuality: num(r[C.sq]),
      nose: num(r[C.nose]),
      fatigue: num(r[C.fatigue]),
      postMealFatigue: num(r[C.pmf]),
      bloating: num(r[C.bloat]),
      worsening: String(r[C.worse] ?? '').trim(),
      result: r[C.result] ? String(r[C.result]) : undefined,
    });
  }
  return { start, rows };
}

/** Igaz, ha a munkafüzet a Bázis előd Excel-trackere. */
export function isTrackerWorkbook(sheetNames: string[]): boolean {
  const names = sheetNames.map(key);
  return names.includes(key('Napló')) && names.includes(key('Baseline'));
}

export function parseTrackerWorkbook(sheets: Record<string, SheetMatrix>): TrackerImport {
  const byKey = new Map(Object.entries(sheets).map(([k, v]) => [key(k), v]));
  const sheet = (name: string) => byKey.get(key(name));
  const base = parseBaselineSheet(sheet('Baseline'));
  const overview = parseOverview(sheet('Áttekintés'));
  return {
    startDate: overview.start,
    subjective: base.subjective,
    baselineStats: base.stats,
    baselineNights: base.nights,
    baselineDays: base.days,
    days: parseNaplo(sheet('Napló')),
    plan: parsePlan(sheet('Terv')),
    overview: overview.rows,
  };
}

/** „▼ alvásminőség, orr” / „✓ nincs” / „–” → a romlott mutatók címkéi (vagy null, ha „–” / üres). */
export function parseWorseningCell(text: string): string[] | null {
  const t = text.trim();
  if (!t || t === '–' || t === '-') return null;
  if (/nincs/i.test(t)) return [];
  return t
    .replace(/^▼\s*/, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
