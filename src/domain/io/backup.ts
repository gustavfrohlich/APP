// JSON biztonsági mentés: séma, verzió, validáció (zod) és összefésülés.

import { z } from 'zod';
import { isISODate } from '../dates';
import type { PlanWeek } from '../types';

import { BACKUP_APP, CURRENT_SCHEMA_VERSION } from './merge';

export { BACKUP_APP, CURRENT_SCHEMA_VERSION, makeBackup, mergeDays, mergePlan } from './merge';

const isoDate = z.string().refine(isISODate, 'Érvénytelen dátum');
const optNum = z.number().finite().optional();

const dayEntrySchema = z
  .object({
    date: isoDate,
    location: z.enum(['budapest', 'home_sk', 'other']).optional(),
    partnerStayed: z.boolean().optional(),
    sleepQuality: optNum,
    sleepMin: optNum,
    awakeMin: optNum,
    deepMin: optNum,
    remMin: optNum,
    hrvNight: optNum,
    rhrNight: optNum,
    nose: optNum,
    fatigue: optNum,
    postMealFatigue: optNum,
    bloating: optNum,
    bloatingWhen: z.enum(['none', 'breakfast', 'lunch', 'dinner', 'allday']).optional(),
    diet: z.enum(['yes', 'partial', 'no']).optional(),
    dietSlip: z.array(z.string()).optional(),
    dietSlipNote: z.string().optional(),
    caffeine: optNum,
    alcohol: optNum,
    exercise: z.enum(['none', 'light', 'moderate', 'intense']).optional(),
    stress: optNum,
    rhrDay: optNum,
    hrvDay: optNum,
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    morningDoneAt: z.string().optional(),
    eveningDoneAt: z.string().optional(),
    updatedAt: z.string(),
    deviceSource: z.enum(['manual', 'import', 'shortcut']).optional(),
  })
  .strip();

const planWeekSchema = z
  .object({
    week: z.number().int().positive(),
    food: z.string(),
    eat: z.string(),
    tip: z.string(),
    kind: z.enum(['base', 'test', 'reserve', 'washout']).optional(),
    result: z.enum(['pass', 'reaction', 'unsure']).optional(),
    resultNote: z.string().optional(),
    closedAt: z.string().optional(),
  })
  .strip();

const settingsSchema = z
  .object({
    startDate: isoDate,
    subjectiveBaseline: z
      .object({
        sleepQuality: optNum,
        nose: optNum,
        fatigue: optNum,
        postMealFatigue: optNum,
        bloating: optNum,
      })
      .strip(),
    reminders: z.object({ morning: z.string(), evening: z.string() }),
    theme: z.enum(['light', 'dark', 'system']),
    demo: z.boolean(),
    schemaVersion: z.number().int(),
    onboardedAt: z.string().optional(),
    customTags: z.array(z.string()).optional(),
    autosave: z
      .object({
        lastWrittenAt: z.string().optional(),
        lastOfferedAt: z.string().optional(),
        folderName: z.string().optional(),
      })
      .optional(),
  })
  .strip();

const nightSchema = z
  .object({
    date: isoDate,
    sleepMin: optNum,
    awakeMin: optNum,
    remMin: optNum,
    coreMin: optNum,
    deepMin: optNum,
    hrv: optNum,
    rhr: optNum,
    readinessSleepH: optNum,
  })
  .strip();

const daySchema = z.object({ date: isoDate, rhrDay: optNum, hrvDay: optNum }).strip();

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    settings: settingsSchema,
    plan: z.array(planWeekSchema),
    days: z.array(dayEntrySchema),
    baselineNights: z.array(nightSchema),
    baselineDays: z.array(daySchema),
  }),
});

export type Backup = z.infer<typeof backupSchema>;

export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'A fájl nem érvényes JSON.' };
  }
  const migrated = migrateBackup(json);
  const r = backupSchema.safeParse(migrated);
  if (!r.success) {
    const issue = r.error.issues[0];
    return {
      ok: false,
      error: `Ez nem Bázis-mentés, vagy sérült (${issue?.path.join('.') || 'gyökér'}: ${issue?.message ?? 'hiba'}).`,
    };
  }
  if (r.data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Ez a mentés egy újabb Bázis-verzióból származik. Frissítsd az appot.',
    };
  }
  return { ok: true, backup: r.data as Backup };
}

/** Régebbi mentésformátumok felhozása a jelenlegire. */
export function migrateBackup(json: unknown): unknown {
  if (!json || typeof json !== 'object') return json;
  const b = json as { schemaVersion?: number; data?: { plan?: PlanWeek[] } };
  if (b.schemaVersion === 1 && b.data?.plan) {
    // v1 → v2: a hetek 'kind' mezőt kaptak; a hiányzót a domain kitalálja, itt nincs teendő.
    return { ...b, schemaVersion: 2 };
  }
  return json;
}
