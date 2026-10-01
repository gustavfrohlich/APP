// Okos alapértékek: ami általában ugyanaz, az előre ki van töltve (javaslatként).

import { addDays, isWeekend } from './dates';
import type { EntryMap } from './entries';
import type { DayEntry, ISODate, Location } from './types';

/** Hétvégi ébredésnél „Otthon (SK)”, hétköznap a legutóbbi hétköznapi hely, alapból Budapest. */
export function suggestLocation(date: ISODate, entries: EntryMap): Location {
  if (isWeekend(date)) return 'home_sk';
  for (let i = 1; i <= 14; i++) {
    const d = addDays(date, -i);
    if (isWeekend(d)) continue;
    const loc = entries.get(d)?.location;
    if (loc) return loc;
  }
  return 'budapest';
}

export type EveningDefaults = Pick<
  DayEntry,
  'diet' | 'caffeine' | 'alcohol' | 'exercise' | 'stress'
>;

/**
 * „A nap röviden” – a tegnapi (vagy a legutóbbi, max. 7 napos) értékekkel előtöltve.
 * Kivétel a diéta és az alkohol: ezeknél a szabály szerinti „Igen” és 0 a javaslat,
 * mert egy kivételes nap (pl. egy családi ebéd) után nem az ismétlődés a valószínű.
 */
export function suggestEvening(date: ISODate, entries: EntryMap): EveningDefaults {
  const out: EveningDefaults = {};
  for (let i = 1; i <= 7; i++) {
    const e = entries.get(addDays(date, -i));
    if (!e) continue;
    out.caffeine ??= e.caffeine;
    out.exercise ??= e.exercise;
    out.stress ??= e.stress;
  }
  return {
    diet: 'yes',
    caffeine: out.caffeine ?? 0,
    alcohol: 0,
    exercise: out.exercise ?? 'none',
    stress: out.stress,
  };
}
