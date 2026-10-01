// Mentés-verzió és összefésülés – zod nélkül, hogy az első betöltésbe ne kerüljön a validátor.

import type { AppData, DayEntry, PlanWeek } from '../types';

export const BACKUP_APP = 'bazis';
export const CURRENT_SCHEMA_VERSION = 2;

/** Mentés-objektum; a demó jelző mindig hamis, hogy visszatöltéskor ne kapcsoljon demó módba. */
export function makeBackup(data: AppData, now = new Date()) {
  return {
    app: BACKUP_APP as typeof BACKUP_APP,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      ...data,
      settings: { ...data.settings, demo: false, schemaVersion: CURRENT_SCHEMA_VERSION },
    },
  };
}

/** Összefésülés: dátumonként a frissebb (updatedAt) bejegyzés nyer. */
export function mergeDays(current: readonly DayEntry[], incoming: readonly DayEntry[]): DayEntry[] {
  const map = new Map(current.map((e) => [e.date, e]));
  for (const e of incoming) {
    const existing = map.get(e.date);
    if (!existing || e.updatedAt > existing.updatedAt) map.set(e.date, e);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Terv összefésülése: hetenként a lezárt/későbbi változat marad. */
export function mergePlan(current: readonly PlanWeek[], incoming: readonly PlanWeek[]): PlanWeek[] {
  const map = new Map(current.map((w) => [w.week, w]));
  for (const w of incoming) {
    const existing = map.get(w.week);
    if (
      !existing ||
      (w.closedAt ?? '') > (existing.closedAt ?? '') ||
      (!existing.result && w.result)
    ) {
      map.set(w.week, w);
    }
  }
  return [...map.values()].sort((a, b) => a.week - b.week);
}
