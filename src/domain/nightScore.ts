// Éjszaka-összkép: a 6 éjszakai óraadat közül a meglévők előjelezett z-értékeinek átlaga.

import type { Baseline } from './baseline';
import {
  DAY_Z,
  signedZ,
  toneOf,
  TONE_LABELS,
  WEEK_Z,
  type Tone,
  type ToneLabel,
} from './deviation';
import { metricValue, WATCH_METRICS, type WatchMetric } from './metrics';
import type { DayEntry } from './types';

export interface NightComponent {
  metric: WatchMetric;
  value: number;
  z: number;
  delta: number;
}

/** Az összkép összetevői (csak a meglévő, baseline-nal rendelkező mutatók). */
export function nightComponents(entry: DayEntry | undefined, baseline: Baseline): NightComponent[] {
  const out: NightComponent[] = [];
  for (const metric of WATCH_METRICS) {
    const value = metricValue(entry, metric);
    const stat = baseline[metric];
    const z = signedZ(metric, value, stat);
    if (value !== undefined && z !== undefined && stat) {
      out.push({ metric, value, z, delta: value - stat.mean });
    }
  }
  return out;
}

export function nightScore(entry: DayEntry | undefined, baseline: Baseline): number | undefined {
  const comps = nightComponents(entry, baseline);
  if (comps.length === 0) return undefined;
  return comps.reduce((a, c) => a + c.z, 0) / comps.length;
}

/** ▲ jobb / ● átlagos / ▼ rosszabb – napi értéknél ±0,5, heti átlagnál ±0,25. */
export function nightTone(score: number | undefined, scope: 'day' | 'week'): Tone | undefined {
  return toneOf(score, scope === 'day' ? DAY_Z : WEEK_Z);
}

export function nightLabel(
  score: number | undefined,
  scope: 'day' | 'week',
): ToneLabel | undefined {
  const tone = nightTone(score, scope);
  return tone ? TONE_LABELS[tone] : undefined;
}
