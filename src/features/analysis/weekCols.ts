// A heti összesítő oszlopai (az Excel Áttekintés lapjának sorrendjében).
import type { Baseline } from '@/domain/baseline';
import { formatDuration, formatNumber, formatSigned } from '@/domain/format';
import type { SubjectiveBaseline } from '@/domain/types';
import type { SummaryToneKey, WeekSummary } from '@/domain/weekly';

export type Col = {
  key: string;
  label: string;
  tone?: SummaryToneKey;
  value: (s: WeekSummary) => string;
  base: (b: Baseline, subj: SubjectiveBaseline, baseN: number) => string;
};

const dur = (v: number | undefined) => (v === undefined ? '' : formatDuration(v));
const num = (v: number | undefined, d = 1) => (v === undefined ? '' : formatNumber(v, d, false));

export const WEEK_COLS: Col[] = [
  {
    key: 'sleepMin',
    label: 'Alvásidő',
    tone: 'sleepMin',
    value: (s) => dur(s.watch.sleepMin),
    base: (b) => dur(b.sleepMin?.mean),
  },
  {
    key: 'awakeMin',
    label: 'Ébren',
    tone: 'awakeMin',
    value: (s) => dur(s.watch.awakeMin),
    base: (b) => dur(b.awakeMin?.mean),
  },
  {
    key: 'deepMin',
    label: 'Mély',
    tone: 'deepMin',
    value: (s) => dur(s.watch.deepMin),
    base: (b) => dur(b.deepMin?.mean),
  },
  {
    key: 'remMin',
    label: 'REM',
    tone: 'remMin',
    value: (s) => dur(s.watch.remMin),
    base: (b) => dur(b.remMin?.mean),
  },
  {
    key: 'hrvNight',
    label: 'HRV',
    tone: 'hrvNight',
    value: (s) => num(s.watch.hrvNight),
    base: (b) => num(b.hrvNight?.mean),
  },
  {
    key: 'rhrNight',
    label: 'Pulzus',
    tone: 'rhrNight',
    value: (s) => num(s.watch.rhrNight),
    base: (b) => num(b.rhrNight?.mean),
  },
  {
    key: 'nightScore',
    label: 'Éjszaka-összkép',
    tone: 'nightScore',
    value: (s) => (s.nightScore === undefined ? '' : formatSigned(s.nightScore, 2)),
    base: () => 'referencia',
  },
  {
    key: 'sleepQuality',
    label: 'Alvásminőség',
    tone: 'sleepQuality',
    value: (s) => num(s.sleepQuality),
    base: (_b, j) => num(j.sleepQuality),
  },
  {
    key: 'nose',
    label: 'Orr / légzés',
    tone: 'nose',
    value: (s) => num(s.symptoms.nose),
    base: (_b, j) => num(j.nose),
  },
  {
    key: 'fatigue',
    label: 'Fáradtság',
    tone: 'fatigue',
    value: (s) => num(s.symptoms.fatigue),
    base: (_b, j) => num(j.fatigue),
  },
  {
    key: 'postMealFatigue',
    label: 'Evés utáni fáradtság',
    tone: 'postMealFatigue',
    value: (s) => num(s.symptoms.postMealFatigue),
    base: (_b, j) => num(j.postMealFatigue),
  },
  {
    key: 'bloating',
    label: 'Puffadás',
    tone: 'bloating',
    value: (s) => num(s.symptoms.bloating),
    base: (_b, j) => num(j.bloating),
  },
];
