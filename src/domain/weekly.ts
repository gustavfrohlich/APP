// Heti összesítő (az Excel Áttekintés lapja), színezés és „Romlás az előző héthez”.
//
// - Kitöltött napok: diéta-hét szerint (ahol bármely mező ki van töltve).
// - Óraadatok, alvásminőség, összkép: alvás-hét szerint (kedd → következő hétfő reggel).
// - Orr, fáradtság, evés utáni fáradtság, puffadás: diéta-hét szerint.
// - Színezés: óraadatok ±0,25 szórás a baseline-hoz, szubjektív mutatók ±1 pont a becsléshez.

import type { Baseline } from './baseline';
import { eachDay } from './dates';
import { SUBJECTIVE_POINTS, signedPoints, signedZ, toneOf, WEEK_Z, type Tone } from './deviation';
import { hasAnyData, type EntryMap } from './entries';
import {
  metricValue,
  SYMPTOM_METRICS,
  WATCH_METRICS,
  type SymptomMetric,
  type WatchMetric,
} from './metrics';
import { nightScore, nightTone } from './nightScore';
import { EPS, mean } from './stats';
import type { ISODate, PlanWeek, SubjectiveBaseline } from './types';
import { dietWeekRange, sleepWeekRange } from './weeks';

export type WorsenKey = 'sleepQuality' | 'nightScore' | SymptomMetric;

/** A romlás-lista sorrendje és címkéi – egyezik az Excel Áttekintés lapjával. */
export const WORSEN_KEYS: readonly WorsenKey[] = [
  'sleepQuality',
  'nightScore',
  'nose',
  'fatigue',
  'postMealFatigue',
  'bloating',
];

export const WORSEN_LABELS: Record<WorsenKey, string> = {
  sleepQuality: 'alvásminőség',
  nightScore: 'óraadatok',
  nose: 'orr',
  fatigue: 'fáradtság',
  postMealFatigue: 'evés utáni fáradtság',
  bloating: 'puffadás',
};

/** Romlási küszöbök: alvásminőség ≤ −1, összkép ≤ −0,3, tünetek ≥ +1. */
export const WORSEN_THRESHOLDS: Record<WorsenKey, number> = {
  sleepQuality: -1,
  nightScore: -0.3,
  nose: 1,
  fatigue: 1,
  postMealFatigue: 1,
  bloating: 1,
};

export type KeyValues = Partial<Record<WorsenKey, number>>;

export interface WeekComparison {
  /**
   * Az Excel Áttekintés lapjának logikája szerint:
   * 'empty' = a hétnek nincs kitöltött napja (üres cella),
   * 'na'    = az előző hétnek nincs kitöltött napja („–”),
   * 'ok'    = összevethető (lista vagy „nincs”).
   */
  status: 'ok' | 'na' | 'empty';
  against: 'baseline' | number;
  current: KeyValues;
  previous: KeyValues;
  deltas: KeyValues;
  worsened: WorsenKey[];
}

export type SummaryToneKey = WatchMetric | 'sleepQuality' | 'nightScore' | SymptomMetric;

export interface WeekSummary {
  week: number;
  plan?: PlanWeek;
  dietRange: { from: ISODate; to: ISODate };
  sleepRange: { from: ISODate; to: ISODate };
  filledDays: number;
  /** Éjszakák száma az alvás-hétben, ahol van óraadat vagy alvásminőség. */
  nights: number;
  watch: Partial<Record<WatchMetric, number>>;
  sleepQuality?: number;
  nightScore?: number;
  symptoms: Partial<Record<SymptomMetric, number>>;
  tones: Partial<Record<SummaryToneKey, Tone>>;
  comparison: WeekComparison;
}

export interface WeeklyInput {
  entries: EntryMap;
  start: ISODate;
  weeks: number;
  plan?: readonly PlanWeek[];
  baseline: Baseline;
  subjective: SubjectiveBaseline;
}

/**
 * A baseline „napjainak” száma (az Excelben Baseline!E6): az 1. hét ehhez viszonyít.
 * Ha nincs importált óraadat, de van szubjektív becslés, az is elég viszonyítási alapnak.
 */
export function baselineCount(baseline: Baseline, subjective: SubjectiveBaseline): number {
  const n = Math.max(0, ...WATCH_METRICS.map((m) => baseline[m]?.n ?? 0));
  if (n > 0) return n;
  return Object.values(subjective).some((v) => v !== undefined) ? 1 : 0;
}

export function keyValuesOf(
  s: Pick<WeekSummary, 'sleepQuality' | 'nightScore' | 'symptoms'>,
): KeyValues {
  return {
    sleepQuality: s.sleepQuality,
    nightScore: s.nightScore,
    nose: s.symptoms.nose,
    fatigue: s.symptoms.fatigue,
    postMealFatigue: s.symptoms.postMealFatigue,
    bloating: s.symptoms.bloating,
  };
}

/** Az 1. hét viszonyítási alapja: a szubjektív becslések, az összképnél 0. */
export function baselineKeyValues(subjective: SubjectiveBaseline): KeyValues {
  return {
    sleepQuality: subjective.sleepQuality,
    nightScore: 0,
    nose: subjective.nose,
    fatigue: subjective.fatigue,
    postMealFatigue: subjective.postMealFatigue,
    bloating: subjective.bloating,
  };
}

function anyValue(v: KeyValues): boolean {
  return WORSEN_KEYS.some((k) => v[k] !== undefined);
}

export function isWorse(key: WorsenKey, delta: number): boolean {
  const t = WORSEN_THRESHOLDS[key];
  return t < 0 ? delta <= t + EPS : delta >= t - EPS;
}

export function compareKeyValues(
  current: KeyValues,
  previous: KeyValues,
  against: 'baseline' | number,
  counts?: { current: number; previous: number },
): WeekComparison {
  const hasCurrent = counts ? counts.current > 0 : anyValue(current);
  const hasPrevious = counts ? counts.previous > 0 : anyValue(previous);
  if (!hasCurrent) return { status: 'empty', against, current, previous, deltas: {}, worsened: [] };
  if (!hasPrevious) return { status: 'na', against, current, previous, deltas: {}, worsened: [] };
  const deltas: KeyValues = {};
  const worsened: WorsenKey[] = [];
  for (const key of WORSEN_KEYS) {
    const c = current[key];
    const p = previous[key];
    if (c === undefined || p === undefined) continue;
    const d = c - p;
    deltas[key] = d;
    if (isWorse(key, d)) worsened.push(key);
  }
  return { status: 'ok', against, current, previous, deltas, worsened };
}

/** „alvásminőség, óraadatok, orr” / „nincs” / „–” / „” (üres hét) */
export function worseningText(c: WeekComparison): string {
  if (c.status === 'empty') return '';
  if (c.status === 'na') return '–';
  if (c.worsened.length === 0) return 'nincs';
  return c.worsened.map((k) => WORSEN_LABELS[k]).join(', ');
}

function summarizeWeek(input: WeeklyInput, week: number): Omit<WeekSummary, 'comparison'> {
  const { entries, start, baseline, subjective } = input;
  const dietRange = dietWeekRange(week, start);
  const sleepRange = sleepWeekRange(week, start);
  const dietDays = eachDay(dietRange.from, dietRange.to).map((d) => entries.get(d));
  const sleepDays = eachDay(sleepRange.from, sleepRange.to).map((d) => entries.get(d));

  const watch: Partial<Record<WatchMetric, number>> = {};
  for (const m of WATCH_METRICS) {
    const v = mean(sleepDays.map((e) => metricValue(e, m)));
    if (v !== undefined) watch[m] = v;
  }
  const sleepQuality = mean(sleepDays.map((e) => metricValue(e, 'sleepQuality')));
  const nightScoreAvg = mean(sleepDays.map((e) => nightScore(e, baseline)));
  const symptoms: Partial<Record<SymptomMetric, number>> = {};
  for (const m of SYMPTOM_METRICS) {
    const v = mean(dietDays.map((e) => metricValue(e, m)));
    if (v !== undefined) symptoms[m] = v;
  }

  const tones: Partial<Record<SummaryToneKey, Tone>> = {};
  for (const m of WATCH_METRICS) {
    const t = toneOf(signedZ(m, watch[m], baseline[m]), WEEK_Z);
    if (t) tones[m] = t;
  }
  const nt = nightTone(nightScoreAvg, 'week');
  if (nt) tones.nightScore = nt;
  const sq = toneOf(
    signedPoints('sleepQuality', sleepQuality, subjective.sleepQuality),
    SUBJECTIVE_POINTS,
  );
  if (sq) tones.sleepQuality = sq;
  for (const m of SYMPTOM_METRICS) {
    const t = toneOf(signedPoints(m, symptoms[m], subjective[m]), SUBJECTIVE_POINTS);
    if (t) tones[m] = t;
  }

  return {
    week,
    plan: input.plan?.find((p) => p.week === week),
    dietRange,
    sleepRange,
    filledDays: dietDays.filter((e) => hasAnyData(e)).length,
    nights: sleepDays.filter(
      (e) =>
        e &&
        (WATCH_METRICS.some((m) => metricValue(e, m) !== undefined) ||
          metricValue(e, 'sleepQuality') !== undefined),
    ).length,
    watch,
    sleepQuality,
    nightScore: nightScoreAvg,
    symptoms,
    tones,
  };
}

/** Az 1…N. hét összesítője, mindegyik a romlás-összevetéssel együtt. */
export function weeklySummaries(input: WeeklyInput): WeekSummary[] {
  const base = Array.from({ length: input.weeks }, (_, i) => summarizeWeek(input, i + 1));
  const baseN = baselineCount(input.baseline, input.subjective);
  return base.map((s, i) => {
    const prev = i === 0 ? baselineKeyValues(input.subjective) : keyValuesOf(base[i - 1]!);
    const comparison = compareKeyValues(keyValuesOf(s), prev, i === 0 ? 'baseline' : i, {
      current: s.filledDays,
      previous: i === 0 ? baseN : base[i - 1]!.filledDays,
    });
    return { ...s, comparison };
  });
}
