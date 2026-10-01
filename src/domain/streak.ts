// Kimaradt napok és sorozat (streak). A streak sosem büntet: csak a megszakítás nélküli napokat számolja.

import { addDays, eachDay } from './dates';
import { eveningDone, hasAnyData, morningDone, type EntryMap } from './entries';
import type { ISODate } from './types';

/** Elmúlt nap a kísérlet kezdetétől tegnapig, ahol egyetlen mező sincs kitöltve. */
export function missedDays(entries: EntryMap, start: ISODate, today: ISODate): ISODate[] {
  const yesterday = addDays(today, -1);
  if (yesterday < start) return [];
  return eachDay(start, yesterday).filter((d) => !hasAnyData(entries.get(d)));
}

function anyCheckin(entries: EntryMap, d: ISODate): boolean {
  const e = entries.get(d);
  return morningDone(e) || eveningDone(e);
}

/** A ma vagy tegnap óta visszafelé megszakítás nélküli napok száma, ahol legalább egy check-in kész. */
export function streak(entries: EntryMap, today: ISODate): number {
  let d = anyCheckin(entries, today) ? today : addDays(today, -1);
  let n = 0;
  while (anyCheckin(entries, d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface CatchUp {
  date: ISODate;
  morning: boolean;
  evening: boolean;
}

/** Pótolható tegnapi check-inek (csak a kísérlet kezdetétől). */
export function catchUpForYesterday(
  entries: EntryMap,
  start: ISODate,
  today: ISODate,
): CatchUp | undefined {
  const y = addDays(today, -1);
  if (y < start) return undefined;
  const e = entries.get(y);
  const morning = !morningDone(e);
  const evening = !eveningDone(e);
  return morning || evening ? { date: y, morning, evening } : undefined;
}
