// Baseline-statisztika az importált exportokból: átlag, minta-szórás, n, első és utolsó nap.

import type { BaselineMetric } from './metrics';
import { BASELINE_METRICS } from './metrics';
import { mean, sampleSd } from './stats';
import type { BaselineDay, BaselineNight, ISODate } from './types';

export interface BaselineStat {
  mean: number;
  /** Minta-szórás (n − 1); egyetlen értéknél nincs. */
  sd?: number;
  n: number;
  from: ISODate;
  to: ISODate;
}

export type Baseline = Partial<Record<BaselineMetric, BaselineStat>>;

type Getter = (row: BaselineNight & BaselineDay) => number | undefined;

const SOURCES: Record<BaselineMetric, { from: 'nights' | 'days'; get: Getter }> = {
  sleepMin: { from: 'nights', get: (r) => r.sleepMin },
  awakeMin: { from: 'nights', get: (r) => r.awakeMin },
  deepMin: { from: 'nights', get: (r) => r.deepMin },
  remMin: { from: 'nights', get: (r) => r.remMin },
  hrvNight: { from: 'nights', get: (r) => r.hrv },
  rhrNight: { from: 'nights', get: (r) => r.rhr },
  rhrDay: { from: 'days', get: (r) => r.rhrDay },
  hrvDay: { from: 'days', get: (r) => r.hrvDay },
};

export function statOf(
  rows: { date: ISODate; value: number | undefined }[],
): BaselineStat | undefined {
  const present = rows.filter(
    (r): r is { date: ISODate; value: number } =>
      typeof r.value === 'number' && Number.isFinite(r.value),
  );
  if (present.length === 0) return undefined;
  const values = present.map((r) => r.value);
  const dates = present.map((r) => r.date).sort();
  return {
    mean: mean(values)!,
    sd: sampleSd(values),
    n: present.length,
    from: dates[0]!,
    to: dates[dates.length - 1]!,
  };
}

export function computeBaseline(
  nights: readonly BaselineNight[],
  days: readonly BaselineDay[],
): Baseline {
  const out: Baseline = {};
  for (const metric of BASELINE_METRICS) {
    const src = SOURCES[metric];
    const rows = (src.from === 'nights' ? nights : days) as (BaselineNight & BaselineDay)[];
    const stat = statOf(rows.map((r) => ({ date: r.date, value: src.get(r) })));
    if (stat) out[metric] = stat;
  }
  return out;
}

/** Kézzel megadott baseline (pl. a DEMO Excel Baseline lapjáról): átlag + szórás. */
export function baselineFromValues(
  values: Partial<Record<BaselineMetric, { mean: number; sd?: number; n?: number }>>,
  from: ISODate,
  to: ISODate,
): Baseline {
  const out: Baseline = {};
  for (const [k, v] of Object.entries(values) as [
    BaselineMetric,
    { mean: number; sd?: number; n?: number },
  ][]) {
    out[k] = { mean: v.mean, sd: v.sd, n: v.n ?? 0, from, to };
  }
  return out;
}

export function hasWatchBaseline(b: Baseline): boolean {
  return (['sleepMin', 'awakeMin', 'deepMin', 'remMin', 'hrvNight', 'rhrNight'] as const).some(
    (m) => b[m]?.sd !== undefined,
  );
}
