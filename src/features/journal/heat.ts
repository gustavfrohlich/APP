// Cellaszínek a hőtérképhez és a táblázathoz – ugyanaz a szemantika, mint az Excel Napló lapján.

import type { Baseline } from '@/domain/baseline';
import { DAY_Z, signedZ, toneOf, type Tone } from '@/domain/deviation';
import { metricValue, METRICS, type NumericMetric } from '@/domain/metrics';
import { nightScore } from '@/domain/nightScore';
import type { DayEntry } from '@/domain/types';
import { scaleFill, valueFill } from '@/components/scaleColor';

export type HeatMetric =
  'nightScore' | 'sleepQuality' | 'nose' | 'bloating' | 'fatigue' | 'postMealFatigue';

export const HEAT_METRICS: { key: HeatMetric; label: string }[] = [
  { key: 'nightScore', label: 'Éjszaka-összkép' },
  { key: 'sleepQuality', label: 'Alvásminőség' },
  { key: 'nose', label: 'Orr' },
  { key: 'bloating', label: 'Puffadás' },
  { key: 'fatigue', label: 'Fáradtság' },
  { key: 'postMealFatigue', label: 'Evés utáni fáradtság' },
];

export function heatValue(
  e: DayEntry | undefined,
  metric: HeatMetric,
  baseline: Baseline,
): number | undefined {
  if (!e) return undefined;
  return metric === 'nightScore' ? nightScore(e, baseline) : metricValue(e, metric);
}

/** Egy z-érték (pozitív = jobb) színe: a határon túl erősödő zöld/piros, közte semleges. */
export function zFill(z: number | undefined, threshold = DAY_Z): string | undefined {
  if (z === undefined) return undefined;
  const tone = toneOf(z, threshold);
  if (tone === 'neutral') return 'var(--surface-2)';
  const strength = Math.min(1, (Math.abs(z) - threshold) / 1.2);
  const base = tone === 'good' ? 'var(--good-fill)' : 'var(--bad-fill)';
  const ink = tone === 'good' ? 'var(--good)' : 'var(--bad)';
  return `color-mix(in oklab, ${ink} ${Math.round(strength * 22)}%, ${base})`;
}

export function heatFill(metric: HeatMetric, v: number | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (metric === 'nightScore') return zFill(v);
  if (metric === 'sleepQuality') return valueFill(v, 1, 10, true);
  return scaleFill(v);
}

/** Táblázat-cella színe egy mutatóhoz (óraadat: z ±0,5; skála: színskála). */
export function cellFill(
  metric: NumericMetric,
  v: number | undefined,
  baseline: Baseline,
): string | undefined {
  if (v === undefined) return undefined;
  const def = METRICS[metric];
  if (def.kind === 'scale') {
    if (metric === 'sleepQuality') return valueFill(v, 1, 10, true);
    return scaleFill(v);
  }
  const z = signedZ(metric, v, baseline[metric as keyof Baseline]);
  const t = toneOf(z, DAY_Z);
  if (!t || t === 'neutral') return undefined;
  return t === 'good' ? 'var(--good-fill)' : 'var(--bad-fill)';
}

export function cellTone(
  metric: NumericMetric,
  v: number | undefined,
  baseline: Baseline,
): Tone | undefined {
  return toneOf(signedZ(metric, v, baseline[metric as keyof Baseline]), DAY_Z);
}
