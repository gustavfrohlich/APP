// „Mi hat az alvásodra?” – éjszakák csoportosítása és a csoportátlagok különbsége.
// Különbség = első csoport − második (időknél percben). 5 éjszaka alatt: „kevés adat”.

import type { Baseline } from './baseline';
import { addDays } from './dates';
import type { EntryMap } from './entries';
import { metricValue } from './metrics';
import { nightScore } from './nightScore';
import { mean } from './stats';
import type { DayEntry } from './types';

export const MIN_NIGHTS = 5;

export type ComparisonMetric =
  'sleepQuality' | 'sleepMin' | 'awakeMin' | 'hrvNight' | 'rhrNight' | 'nightScore';

export const COMPARISON_METRICS: readonly ComparisonMetric[] = [
  'sleepQuality',
  'sleepMin',
  'awakeMin',
  'hrvNight',
  'rhrNight',
  'nightScore',
];

export type ComparisonKey = 'partner' | 'location' | 'alcohol' | 'exercise';

export interface GroupStat {
  label: string;
  n: number;
  means: Partial<Record<ComparisonMetric, number>>;
}

export interface Comparison {
  key: ComparisonKey;
  title: string;
  a: GroupStat;
  b: GroupStat;
  diffs: Partial<Record<ComparisonMetric, number>>;
  enough: boolean;
}

type Classifier = (entry: DayEntry, prev: DayEntry | undefined) => 'a' | 'b' | undefined;

/**
 * `self`: a csoportosító mező maga is éjszakai adat (az Excelhez hasonlóan minden olyan
 * éjszaka számít, ahol meg van adva); különben csak a mért éjszakák.
 */
const DEFS: {
  key: ComparisonKey;
  title: string;
  a: string;
  b: string;
  self: boolean;
  classify: Classifier;
}[] = [
  {
    key: 'partner',
    title: 'Barátnővel vagy nélküle',
    a: 'Barátnővel',
    b: 'Nélküle',
    self: true,
    classify: (e) => (e.partnerStayed === undefined ? undefined : e.partnerStayed ? 'a' : 'b'),
  },
  {
    key: 'location',
    title: 'Budapest vagy otthon (SK)',
    a: 'Budapest',
    b: 'Otthon (SK)',
    self: true,
    classify: (e) => (e.location === 'budapest' ? 'a' : e.location === 'home_sk' ? 'b' : undefined),
  },
  {
    key: 'alcohol',
    title: 'Előző napi alkohol',
    a: 'Volt alkohol',
    b: 'Nem volt',
    self: false,
    classify: (_e, p) => (p?.alcohol === undefined ? undefined : p.alcohol > 0 ? 'a' : 'b'),
  },
  {
    key: 'exercise',
    title: 'Előző napi mozgás',
    a: 'Volt mozgás',
    b: 'Nem volt',
    self: false,
    classify: (_e, p) =>
      p?.exercise === undefined ? undefined : p.exercise !== 'none' ? 'a' : 'b',
  },
];

function nightValues(e: DayEntry, baseline: Baseline): Partial<Record<ComparisonMetric, number>> {
  return {
    sleepQuality: metricValue(e, 'sleepQuality'),
    sleepMin: metricValue(e, 'sleepMin'),
    awakeMin: metricValue(e, 'awakeMin'),
    hrvNight: metricValue(e, 'hrvNight'),
    rhrNight: metricValue(e, 'rhrNight'),
    nightScore: nightScore(e, baseline),
  };
}

function isNight(v: Partial<Record<ComparisonMetric, number>>): boolean {
  return COMPARISON_METRICS.some((m) => v[m] !== undefined);
}

export function compareNights(entries: EntryMap, baseline: Baseline): Comparison[] {
  return DEFS.map((def) => {
    const groups: Record<'a' | 'b', Partial<Record<ComparisonMetric, number>>[]> = { a: [], b: [] };
    for (const e of entries.values()) {
      const values = nightValues(e, baseline);
      if (!def.self && !isNight(values)) continue;
      const g = def.classify(e, entries.get(addDays(e.date, -1)));
      if (g) groups[g].push(values);
    }
    const stat = (label: string, rows: Partial<Record<ComparisonMetric, number>>[]): GroupStat => {
      const means: Partial<Record<ComparisonMetric, number>> = {};
      for (const m of COMPARISON_METRICS) {
        const v = mean(rows.map((r) => r[m]));
        if (v !== undefined) means[m] = v;
      }
      return { label, n: rows.length, means };
    };
    const a = stat(def.a, groups.a);
    const b = stat(def.b, groups.b);
    const diffs: Partial<Record<ComparisonMetric, number>> = {};
    for (const m of COMPARISON_METRICS) {
      const x = a.means[m];
      const y = b.means[m];
      if (x !== undefined && y !== undefined) diffs[m] = x - y;
    }
    return {
      key: def.key,
      title: def.title,
      a,
      b,
      diffs,
      enough: a.n >= MIN_NIGHTS && b.n >= MIN_NIGHTS,
    };
  });
}
