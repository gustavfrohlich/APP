// IndexedDB (Dexie) séma verziókkal és migrációkkal.
// A demó adatok külön adatbázisban élnek, így a valódiakat soha nem írhatják felül.

import Dexie, { type Table } from 'dexie';
import { kindOf } from '@/domain/plan';
import type { BaselineDay, BaselineNight, DayEntry, PlanWeek, Settings } from '@/domain/types';

export const REAL_DB_NAME = 'bazis';
export const DEMO_DB_NAME = 'bazis-demo';
export const DB_SCHEMA_VERSION = 2;

export type SettingsRow = Settings & { id: 'app' };
export interface KvRow {
  key: string;
  value: unknown;
}

export class BazisDB extends Dexie {
  days!: Table<DayEntry, string>;
  plan!: Table<PlanWeek, number>;
  settings!: Table<SettingsRow, string>;
  baselineNights!: Table<BaselineNight, string>;
  baselineDays!: Table<BaselineDay, string>;
  kv!: Table<KvRow, string>;

  constructor(name: string) {
    super(name);
    // 1. verzió: az alap táblák.
    this.version(1).stores({
      days: 'date',
      plan: 'week',
      settings: 'id',
      baselineNights: 'date',
      baselineDays: 'date',
    });
    // 2. verzió: kulcs-érték tábla (pl. az automatikus mentés mappája), a hetek 'kind' mezőt kapnak.
    this.version(2)
      .stores({ kv: 'key' })
      .upgrade(async (tx) => {
        await tx
          .table<PlanWeek, number>('plan')
          .toCollection()
          .modify((w) => {
            w.kind ??= kindOf(w);
          });
        await tx
          .table<SettingsRow, string>('settings')
          .toCollection()
          .modify((s) => {
            s.schemaVersion = 2;
          });
      });
  }
}

const cache = new Map<string, BazisDB>();

export function openDb(name: string): BazisDB {
  let db = cache.get(name);
  if (!db) {
    db = new BazisDB(name);
    cache.set(name, db);
  }
  return db;
}

/** Tesztekhez és a „minden adat törlése” után. */
export async function closeDb(name: string): Promise<void> {
  const db = cache.get(name);
  if (db) {
    db.close();
    cache.delete(name);
  }
}
