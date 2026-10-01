// Adattár-réteg: minden olvasás és írás ezen keresztül megy, hogy a tárolás cserélhető maradjon.

import { nextMondayFrom, todayISO } from '@/domain/dates';
import { compactEntry } from '@/domain/entries';
import { CURRENT_SCHEMA_VERSION, mergeDays, mergePlan } from '@/domain/io/merge';
import { DEFAULT_PLAN } from '@/domain/plan';
import type { WatchMetric } from '@/domain/metrics';
import type {
  AppData,
  BaselineDay,
  BaselineNight,
  DayEntry,
  DeviceSource,
  ISODate,
  PlanWeek,
  Settings,
} from '@/domain/types';
import { openDb, type BazisDB } from './db';

/** A specifikáció szerinti alapértelmezett kezdés; ha már elmúlt, a következő hétfő. */
export const DEFAULT_START = '2026-10-05';

export function defaultSettings(today: ISODate = todayISO()): Settings {
  return {
    startDate: today <= DEFAULT_START ? DEFAULT_START : nextMondayFrom(today),
    subjectiveBaseline: {},
    reminders: { morning: '07:30', evening: '21:00' },
    theme: 'system',
    demo: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export type DayPatch = { [K in keyof DayEntry]?: DayEntry[K] | undefined };

export interface Repository {
  readonly kind: 'real' | 'demo';
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listDays(): Promise<DayEntry[]>;
  getDay(date: ISODate): Promise<DayEntry | undefined>;
  /** Mezők összefésülése; az undefined értékű kulcs törli a mezőt. */
  patchDay(date: ISODate, patch: DayPatch): Promise<DayEntry>;
  deleteDay(date: ISODate): Promise<void>;
  getPlan(): Promise<PlanWeek[]>;
  savePlan(plan: PlanWeek[]): Promise<void>;
  updateWeek(week: number, patch: Partial<PlanWeek>): Promise<void>;
  getBaselineNights(): Promise<BaselineNight[]>;
  getBaselineDays(): Promise<BaselineDay[]>;
  replaceBaselineNights(rows: BaselineNight[]): Promise<void>;
  replaceBaselineDays(rows: BaselineDay[]): Promise<void>;
  /** Óraadatok beolvasztása napokba (import vagy okos beillesztés). */
  applyWatchValues(
    items: { date: ISODate; values: Partial<Record<WatchMetric, number>> }[],
    source: DeviceSource,
  ): Promise<number>;
  exportAll(): Promise<AppData>;
  importAll(data: AppData, mode: 'merge' | 'replace'): Promise<void>;
  clearAll(): Promise<void>;
  kvGet<T>(key: string): Promise<T | undefined>;
  kvSet(key: string, value: unknown): Promise<void>;
}

export class DexieRepository implements Repository {
  readonly kind: 'real' | 'demo';
  private db: BazisDB;

  constructor(dbName: string, kind: 'real' | 'demo') {
    this.db = openDb(dbName);
    this.kind = kind;
  }

  async getSettings(): Promise<Settings> {
    const row = await this.db.settings.get('app');
    if (!row) return defaultSettings();
    const { id: _id, ...rest } = row;
    return { ...defaultSettings(), ...rest };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return this.db.transaction('rw', this.db.settings, async () => {
      const current = await this.getSettings();
      const next: Settings = { ...current, ...patch };
      await this.db.settings.put({ ...next, id: 'app' });
      return next;
    });
  }

  listDays(): Promise<DayEntry[]> {
    return this.db.days.orderBy('date').toArray();
  }

  getDay(date: ISODate): Promise<DayEntry | undefined> {
    return this.db.days.get(date);
  }

  async patchDay(date: ISODate, patch: DayPatch): Promise<DayEntry> {
    return this.db.transaction('rw', this.db.days, async () => {
      const current = (await this.db.days.get(date)) ?? { date, updatedAt: '' };
      const merged: Record<string, unknown> = { ...current };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete merged[k];
        else merged[k] = v;
      }
      const next = compactEntry({
        ...(merged as unknown as DayEntry),
        date,
        updatedAt: new Date().toISOString(),
      });
      await this.db.days.put(next);
      return next;
    });
  }

  async deleteDay(date: ISODate): Promise<void> {
    await this.db.days.delete(date);
  }

  async getPlan(): Promise<PlanWeek[]> {
    const rows = await this.db.plan.orderBy('week').toArray();
    return rows.length ? rows : DEFAULT_PLAN.map((w) => ({ ...w }));
  }

  async savePlan(plan: PlanWeek[]): Promise<void> {
    await this.db.transaction('rw', this.db.plan, async () => {
      await this.db.plan.clear();
      await this.db.plan.bulkPut(plan);
    });
  }

  async updateWeek(week: number, patch: Partial<PlanWeek>): Promise<void> {
    await this.db.transaction('rw', this.db.plan, async () => {
      const plan = await this.getPlan();
      const next = plan.map((w) => {
        if (w.week !== week) return w;
        const merged: Record<string, unknown> = { ...w };
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) delete merged[k];
          else merged[k] = v;
        }
        return merged as unknown as PlanWeek;
      });
      await this.db.plan.clear();
      await this.db.plan.bulkPut(next);
    });
  }

  getBaselineNights(): Promise<BaselineNight[]> {
    return this.db.baselineNights.orderBy('date').toArray();
  }

  getBaselineDays(): Promise<BaselineDay[]> {
    return this.db.baselineDays.orderBy('date').toArray();
  }

  async replaceBaselineNights(rows: BaselineNight[]): Promise<void> {
    await this.db.transaction('rw', this.db.baselineNights, async () => {
      await this.db.baselineNights.clear();
      await this.db.baselineNights.bulkPut(rows);
    });
  }

  async replaceBaselineDays(rows: BaselineDay[]): Promise<void> {
    await this.db.transaction('rw', this.db.baselineDays, async () => {
      await this.db.baselineDays.clear();
      await this.db.baselineDays.bulkPut(rows);
    });
  }

  async applyWatchValues(
    items: { date: ISODate; values: Partial<Record<WatchMetric, number>> }[],
    source: DeviceSource,
  ): Promise<number> {
    let n = 0;
    await this.db.transaction('rw', this.db.days, async () => {
      for (const it of items) {
        if (!Object.keys(it.values).length) continue;
        await this.patchDay(it.date, { ...it.values, deviceSource: source });
        n++;
      }
    });
    return n;
  }

  async exportAll(): Promise<AppData> {
    const [settings, plan, days, baselineNights, baselineDays] = await Promise.all([
      this.getSettings(),
      this.getPlan(),
      this.listDays(),
      this.getBaselineNights(),
      this.getBaselineDays(),
    ]);
    return { settings, plan, days, baselineNights, baselineDays };
  }

  async importAll(data: AppData, mode: 'merge' | 'replace'): Promise<void> {
    const { db } = this;
    await db.transaction(
      'rw',
      [db.days, db.plan, db.settings, db.baselineNights, db.baselineDays],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.days.clear(),
            db.plan.clear(),
            db.baselineNights.clear(),
            db.baselineDays.clear(),
          ]);
          await db.days.bulkPut(data.days);
          await db.plan.bulkPut(data.plan);
          await db.baselineNights.bulkPut(data.baselineNights);
          await db.baselineDays.bulkPut(data.baselineDays);
          await db.settings.put({ ...data.settings, demo: this.kind === 'demo', id: 'app' });
          return;
        }
        const [days, plan, settings] = await Promise.all([
          this.listDays(),
          this.getPlan(),
          this.getSettings(),
        ]);
        await db.days.bulkPut(mergeDays(days, data.days));
        await db.plan.clear();
        await db.plan.bulkPut(mergePlan(plan, data.plan));
        // A baseline-nál a frissebb dátumú sorok nyernek; a régiek maradnak.
        await db.baselineNights.bulkPut(data.baselineNights);
        await db.baselineDays.bulkPut(data.baselineDays);
        await db.settings.put({
          ...settings,
          subjectiveBaseline: {
            ...data.settings.subjectiveBaseline,
            ...settings.subjectiveBaseline,
          },
          customTags: [
            ...new Set([...(settings.customTags ?? []), ...(data.settings.customTags ?? [])]),
          ],
          id: 'app',
        });
      },
    );
  }

  async clearAll(): Promise<void> {
    const { db } = this;
    await db.transaction(
      'rw',
      [db.days, db.plan, db.settings, db.baselineNights, db.baselineDays, db.kv],
      async () => {
        await Promise.all([
          db.days.clear(),
          db.plan.clear(),
          db.settings.clear(),
          db.baselineNights.clear(),
          db.baselineDays.clear(),
          db.kv.clear(),
        ]);
      },
    );
  }

  async kvGet<T>(key: string): Promise<T | undefined> {
    return (await this.db.kv.get(key))?.value as T | undefined;
  }

  async kvSet(key: string, value: unknown): Promise<void> {
    await this.db.kv.put({ key, value });
  }
}
