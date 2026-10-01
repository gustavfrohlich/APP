// A mutatók leírása: irány (melyik a jobb), címke, mértékegység, bevitel típusa.

import type { DayEntry } from './types';

export type WatchMetric = 'sleepMin' | 'awakeMin' | 'deepMin' | 'remMin' | 'hrvNight' | 'rhrNight';
export type SymptomMetric = 'nose' | 'fatigue' | 'postMealFatigue' | 'bloating';
export type ScaleMetric = 'sleepQuality' | SymptomMetric | 'stress';
export type DayVitalMetric = 'rhrDay' | 'hrvDay';
export type NumericMetric = WatchMetric | ScaleMetric | DayVitalMetric;
export type BaselineMetric = WatchMetric | DayVitalMetric;

export const WATCH_METRICS: readonly WatchMetric[] = [
  'sleepMin',
  'awakeMin',
  'deepMin',
  'remMin',
  'hrvNight',
  'rhrNight',
];

export const SYMPTOM_METRICS: readonly SymptomMetric[] = [
  'nose',
  'fatigue',
  'postMealFatigue',
  'bloating',
];

export const BASELINE_METRICS: readonly BaselineMetric[] = [...WATCH_METRICS, 'rhrDay', 'hrvDay'];

export type MetricKind = 'duration' | 'decimal' | 'scale';

export interface MetricDef {
  key: NumericMetric;
  label: string;
  short: string;
  unit: string;
  kind: MetricKind;
  higherIsBetter: boolean;
  min?: number;
  max?: number;
  decimals: number;
}

export const METRICS: Record<NumericMetric, MetricDef> = {
  sleepMin: {
    key: 'sleepMin',
    label: 'Alvásidő',
    short: 'Alvás',
    unit: 'ó:pp',
    kind: 'duration',
    higherIsBetter: true,
    decimals: 0,
  },
  awakeMin: {
    key: 'awakeMin',
    label: 'Ébren éjjel',
    short: 'Ébren',
    unit: 'perc',
    kind: 'duration',
    higherIsBetter: false,
    decimals: 0,
  },
  deepMin: {
    key: 'deepMin',
    label: 'Mélyalvás',
    short: 'Mély',
    unit: 'ó:pp',
    kind: 'duration',
    higherIsBetter: true,
    decimals: 0,
  },
  remMin: {
    key: 'remMin',
    label: 'REM',
    short: 'REM',
    unit: 'ó:pp',
    kind: 'duration',
    higherIsBetter: true,
    decimals: 0,
  },
  hrvNight: {
    key: 'hrvNight',
    label: 'HRV (éjjel)',
    short: 'HRV',
    unit: 'ms',
    kind: 'decimal',
    higherIsBetter: true,
    decimals: 1,
  },
  rhrNight: {
    key: 'rhrNight',
    label: 'Pulzus (éjjel)',
    short: 'Pulzus',
    unit: 'bpm',
    kind: 'decimal',
    higherIsBetter: false,
    decimals: 1,
  },
  sleepQuality: {
    key: 'sleepQuality',
    label: 'Alvásminőség',
    short: 'Alvásmin.',
    unit: '1–10',
    kind: 'scale',
    higherIsBetter: true,
    min: 1,
    max: 10,
    decimals: 1,
  },
  nose: {
    key: 'nose',
    label: 'Orr / légzés',
    short: 'Orr',
    unit: '0–10',
    kind: 'scale',
    higherIsBetter: false,
    min: 0,
    max: 10,
    decimals: 1,
  },
  fatigue: {
    key: 'fatigue',
    label: 'Fáradtság',
    short: 'Fáradtság',
    unit: '0–10',
    kind: 'scale',
    higherIsBetter: false,
    min: 0,
    max: 10,
    decimals: 1,
  },
  postMealFatigue: {
    key: 'postMealFatigue',
    label: 'Evés utáni fáradtság',
    short: 'Evés után',
    unit: '0–10',
    kind: 'scale',
    higherIsBetter: false,
    min: 0,
    max: 10,
    decimals: 1,
  },
  bloating: {
    key: 'bloating',
    label: 'Puffadás',
    short: 'Puffadás',
    unit: '0–10',
    kind: 'scale',
    higherIsBetter: false,
    min: 0,
    max: 10,
    decimals: 1,
  },
  stress: {
    key: 'stress',
    label: 'Stressz',
    short: 'Stressz',
    unit: '0–10',
    kind: 'scale',
    higherIsBetter: false,
    min: 0,
    max: 10,
    decimals: 1,
  },
  rhrDay: {
    key: 'rhrDay',
    label: 'Nappali pulzus',
    short: 'Napp. pulzus',
    unit: 'bpm',
    kind: 'decimal',
    higherIsBetter: false,
    decimals: 1,
  },
  hrvDay: {
    key: 'hrvDay',
    label: 'Nappali HRV',
    short: 'Napp. HRV',
    unit: 'ms',
    kind: 'decimal',
    higherIsBetter: true,
    decimals: 1,
  },
};

/** +1, ha a magasabb érték a jobb, −1, ha az alacsonyabb. */
export function direction(metric: NumericMetric): 1 | -1 {
  return METRICS[metric].higherIsBetter ? 1 : -1;
}

export function metricValue(
  entry: DayEntry | undefined,
  metric: NumericMetric,
): number | undefined {
  const v = entry?.[metric];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export const MORNING_FIELDS = [
  'location',
  'partnerStayed',
  'sleepQuality',
  ...WATCH_METRICS,
] as const satisfies readonly (keyof DayEntry)[];

export const EVENING_FIELDS = [
  'nose',
  'fatigue',
  'postMealFatigue',
  'bloating',
  'bloatingWhen',
  'diet',
  'dietSlip',
  'dietSlipNote',
  'caffeine',
  'alcohol',
  'exercise',
  'stress',
  'rhrDay',
  'hrvDay',
  'tags',
  'note',
] as const satisfies readonly (keyof DayEntry)[];

export const DATA_FIELDS: readonly (keyof DayEntry)[] = [...MORNING_FIELDS, ...EVENING_FIELDS];
