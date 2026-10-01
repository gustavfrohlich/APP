import type { Baseline } from '@/domain/baseline';
import type { DayEntry } from '@/domain/types';

export function entry(date: string, fields: Partial<DayEntry> = {}): DayEntry {
  return { date, updatedAt: `${date}T08:00:00.000Z`, ...fields };
}

/** Egyszerű baseline: kerek számok, hogy a z-értékek fejben is ellenőrizhetők legyenek. */
export const BASELINE: Baseline = {
  sleepMin: { mean: 460, sd: 30, n: 30, from: '2026-09-01', to: '2026-09-30' },
  awakeMin: { mean: 20, sd: 10, n: 30, from: '2026-09-01', to: '2026-09-30' },
  deepMin: { mean: 40, sd: 10, n: 30, from: '2026-09-01', to: '2026-09-30' },
  remMin: { mean: 120, sd: 20, n: 30, from: '2026-09-01', to: '2026-09-30' },
  hrvNight: { mean: 70, sd: 10, n: 30, from: '2026-09-01', to: '2026-09-30' },
  rhrNight: { mean: 55, sd: 2, n: 30, from: '2026-09-01', to: '2026-09-30' },
};
