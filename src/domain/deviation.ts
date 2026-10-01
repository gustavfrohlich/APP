// Eltérés egy mutatón: előjelezett z-érték és a jobb / semleges / rosszabb besorolás.

import type { BaselineStat } from './baseline';
import { direction, type NumericMetric } from './metrics';
import { EPS } from './stats';

export type Tone = 'good' | 'neutral' | 'bad';

/** Napi érték küszöbe (szórásban). */
export const DAY_Z = 0.5;
/** Heti átlag küszöbe (szórásban). */
export const WEEK_Z = 0.25;
/** A szubjektív mutatók heti küszöbe a saját becsléshez (pont). */
export const SUBJECTIVE_POINTS = 1;

/**
 * z = (x − átlag) / szórás, a „jobb, ha alacsonyabb” mutatóknál előjelváltással,
 * így a pozitív érték mindig a jobbat jelenti.
 */
export function signedZ(
  metric: NumericMetric,
  x: number | undefined,
  stat: Pick<BaselineStat, 'mean' | 'sd'> | undefined,
): number | undefined {
  if (x === undefined || !Number.isFinite(x) || !stat || !stat.sd || stat.sd <= 0) return undefined;
  return ((x - stat.mean) / stat.sd) * direction(metric);
}

/** Besorolás egy előjelezett (pozitív = jobb) értékre és küszöbre. */
export function toneOf(signed: number | undefined, threshold: number): Tone | undefined {
  if (signed === undefined || !Number.isFinite(signed)) return undefined;
  if (signed >= threshold - EPS) return 'good';
  if (signed <= -threshold + EPS) return 'bad';
  return 'neutral';
}

/** Szubjektív mutató eltérése a saját becsléstől, előjelezve (pozitív = jobb). */
export function signedPoints(
  metric: NumericMetric,
  x: number | undefined,
  estimate: number | undefined,
): number | undefined {
  if (x === undefined || estimate === undefined) return undefined;
  return (x - estimate) * direction(metric);
}

export interface ToneLabel {
  tone: Tone;
  symbol: '▲' | '●' | '▼';
  text: string;
}

export const TONE_LABELS: Record<Tone, ToneLabel> = {
  good: { tone: 'good', symbol: '▲', text: 'jobb' },
  neutral: { tone: 'neutral', symbol: '●', text: 'átlagos' },
  bad: { tone: 'bad', symbol: '▼', text: 'rosszabb' },
};
