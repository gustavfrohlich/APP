// Diéta-hét és alvás-hét.
//
// hét(d) = floor((d − kezdés) / 7 nap) + 1
// Az éjszakai mezők a reggel dátumára kerülnek, de az előző nap ételét tükrözik, ezért
// alvás-hét(d) = hét(d − 1 nap): a heti alvásátlag keddtől a következő hétfő reggelig tart.

import { addDays, diffDays } from './dates';
import type { ISODate } from './types';

export function dietWeek(date: ISODate, start: ISODate): number {
  return Math.floor(diffDays(start, date) / 7) + 1;
}

export function sleepWeek(date: ISODate, start: ISODate): number {
  return dietWeek(addDays(date, -1), start);
}

/** A diéta-hét hányadik napja (1 = hétfő … 7 = vasárnap, a kezdőnaphoz igazítva). */
export function dayInWeek(date: ISODate, start: ISODate): number {
  const d = diffDays(start, date);
  return (((d % 7) + 7) % 7) + 1;
}

/** A diéta-hét napjai (étel szerint). */
export function dietWeekRange(week: number, start: ISODate): { from: ISODate; to: ISODate } {
  const from = addDays(start, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

/** Az alvás-hét reggelei: a diéta-hét keddjétől a következő hétfőig. */
export function sleepWeekRange(week: number, start: ISODate): { from: ISODate; to: ISODate } {
  const r = dietWeekRange(week, start);
  return { from: addDays(r.from, 1), to: addDays(r.to, 1) };
}

export type Phase = 'before' | 'running' | 'after';

export interface WeekInfo {
  phase: Phase;
  /** Az aktuális diéta-hét (a kísérlet előtt 0 vagy kisebb, utána > hossz). */
  week: number;
  /** 1–7 */
  dayInWeek: number;
  /** Ennyi nap van még a kezdésig (csak 'before' fázisban pozitív). */
  daysUntilStart: number;
  planLength: number;
}

export function weekInfo(today: ISODate, start: ISODate, planLength: number): WeekInfo {
  const week = dietWeek(today, start);
  const until = diffDays(today, start);
  const phase: Phase = until > 0 ? 'before' : week > planLength ? 'after' : 'running';
  return {
    phase,
    week,
    dayInWeek: dayInWeek(today, start),
    daysUntilStart: Math.max(0, until),
    planLength,
  };
}
