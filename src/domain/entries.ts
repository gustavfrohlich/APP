// Napi bejegyzés-segédek: kitöltöttség, check-in állapot, gyors keresés dátum szerint.

import { DATA_FIELDS, WATCH_METRICS } from './metrics';
import type { DayEntry, ISODate } from './types';

export type EntryMap = ReadonlyMap<ISODate, DayEntry>;

export function toEntryMap(entries: readonly DayEntry[]): Map<ISODate, DayEntry> {
  return new Map(entries.map((e) => [e.date, e]));
}

export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

/** Van-e bármely adatmező kitöltve (a metaadatok nem számítanak). */
export function hasAnyData(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  return DATA_FIELDS.some((f) => isFilled(entry[f]));
}

/**
 * Kész-e a reggeli check-in. A pusztán fájlból importált óraadat még nem check-in,
 * de a kérdések bármelyike vagy a kézzel beírt óraadat már igen.
 */
export function morningDone(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.morningDoneAt) return true;
  if (isFilled(entry.location) || isFilled(entry.partnerStayed) || isFilled(entry.sleepQuality))
    return true;
  return entry.deviceSource !== 'import' && WATCH_METRICS.some((m) => isFilled(entry[m]));
}

const EVENING_CORE = [
  'nose',
  'fatigue',
  'postMealFatigue',
  'bloating',
  'diet',
  'caffeine',
  'alcohol',
  'exercise',
  'stress',
  'note',
  'tags',
] as const;

export function eveningDone(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.eveningDoneAt) return true;
  return EVENING_CORE.some((f) => isFilled(entry[f]));
}

export function hasWatchData(entry: DayEntry | undefined): boolean {
  return !!entry && WATCH_METRICS.some((m) => isFilled(entry[m]));
}

/** Üres mezők eltávolítása (undefined, üres szöveg/tömb). */
export function compactEntry(entry: DayEntry): DayEntry {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry)) {
    if (k === 'date' || k === 'updatedAt' || isFilled(v)) out[k] = v;
  }
  return out as unknown as DayEntry;
}

export type CheckinState = 'todo' | 'partial' | 'done';

/**
 * A check-in állapota a Ma képernyőhöz: kész (lezárva, vagy a fő kérdések megvannak),
 * félbehagyott (van már válasz), vagy kitöltendő.
 */
export function checkinState(
  entry: DayEntry | undefined,
  kind: 'morning' | 'evening',
): CheckinState {
  if (!entry) return 'todo';
  if (kind === 'morning') {
    if (entry.morningDoneAt) return 'done';
    if (entry.sleepQuality !== undefined && entry.location !== undefined) return 'done';
    return morningDone(entry) ? 'partial' : 'todo';
  }
  if (entry.eveningDoneAt) return 'done';
  if (
    ['nose', 'fatigue', 'postMealFatigue', 'bloating'].every(
      (k) => entry[k as keyof DayEntry] !== undefined,
    )
  ) {
    return 'done';
  }
  return eveningDone(entry) ? 'partial' : 'todo';
}
