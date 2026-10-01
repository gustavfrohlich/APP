// Egyezési teszt az Excel-trackerrel.
// A DEMO munkafüzet Napló lapjának adataiból (kezdés 2026-08-03), a Baseline lap értékeivel
// számolt heti eredményeknek egyezniük kell az Áttekintés lap mentett értékeivel.
// Ha a fájl nincs jelen, a teszt kimarad (a fájl személyes adat, nincs a repóban).

import { existsSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { baselineFromValues, computeBaseline } from '@/domain/baseline';
import { toEntryMap } from '@/domain/entries';
import { formatDuration } from '@/domain/format';
import { parseTrackerWorkbook, parseWorseningCell } from '@/domain/io/tracker';
import { WORSEN_LABELS, weeklySummaries } from '@/domain/weekly';
import { workbookToMatrices } from '@/lib/sheets';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DEMO = process.env.BAZIS_DEMO_XLSX ?? path.join(ROOT, 'Eliminacios_dieta_tracker_DEMO.xlsx');
const REAL = process.env.BAZIS_TRACKER_XLSX ?? path.join(ROOT, 'Eliminacios_dieta_tracker.xlsx');

function load(file: string) {
  const wb = XLSX.readFile(file, { cellDates: false });
  return parseTrackerWorkbook(workbookToMatrices(XLSX, wb));
}

describe.skipIf(!existsSync(DEMO))('DEMO Excel-egyezés', () => {
  const t = existsSync(DEMO) ? load(DEMO) : undefined!;

  it('beolvassa a Naplót, a Baseline-t és a Tervet', () => {
    expect(t.startDate).toBe('2026-08-03');
    expect(t.days.length).toBe(60);
    expect(t.overview).toHaveLength(9);
    expect(t.plan).toHaveLength(9);
    expect(t.plan[2]).toMatchObject({ week: 3, food: '+ tej', result: 'reaction' });
    expect(t.subjective).toEqual({
      sleepQuality: 5,
      nose: 7,
      fatigue: 6,
      postMealFatigue: 7,
      bloating: 5,
    });
    expect(t.baselineStats.hrvNight?.n).toBe(30);
  });

  it('a heti összesítő minden cellája egyezik az Áttekintés lappal', () => {
    const baseline = baselineFromValues(t.baselineStats, '2026-06-01', '2026-08-02');
    const summaries = weeklySummaries({
      entries: toEntryMap(t.days),
      start: t.startDate!,
      weeks: 9,
      baseline,
      subjective: t.subjective,
    });
    for (const row of t.overview) {
      const s = summaries[row.week - 1]!;
      const ctx = `${row.week}. hét`;
      expect(s.filledDays, ctx).toBe(row.filledDays);
      for (const m of [
        'sleepMin',
        'awakeMin',
        'deepMin',
        'remMin',
        'hrvNight',
        'rhrNight',
      ] as const) {
        expect(s.watch[m], `${ctx} ${m}`).toBeCloseTo(row[m]!, 6);
      }
      expect(s.nightScore, `${ctx} összkép`).toBeCloseTo(row.nightScore!, 9);
      expect(s.sleepQuality, `${ctx} alvásminőség`).toBeCloseTo(row.sleepQuality!, 9);
      expect(s.symptoms.nose, `${ctx} orr`).toBeCloseTo(row.nose!, 9);
      expect(s.symptoms.fatigue, `${ctx} fáradtság`).toBeCloseTo(row.fatigue!, 9);
      expect(s.symptoms.postMealFatigue, `${ctx} evés utáni`).toBeCloseTo(row.postMealFatigue!, 9);
      expect(s.symptoms.bloating, `${ctx} puffadás`).toBeCloseTo(row.bloating!, 9);
      const expected = parseWorseningCell(row.worsening);
      const actual =
        s.comparison.status === 'ok' ? s.comparison.worsened.map((k) => WORSEN_LABELS[k]) : null;
      expect(actual, `${ctx} romlás`).toEqual(expected);
    }
  });

  it('a specifikáció példái: 3. és 5. hét romlása', () => {
    const w3 = t.overview.find((r) => r.week === 3)!;
    const w5 = t.overview.find((r) => r.week === 5)!;
    expect(parseWorseningCell(w3.worsening)).toEqual([
      'alvásminőség',
      'óraadatok',
      'orr',
      'puffadás',
    ]);
    expect(parseWorseningCell(w5.worsening)).toEqual([
      'fáradtság',
      'evés utáni fáradtság',
      'puffadás',
    ]);
  });
});

describe.skipIf(!existsSync(REAL))('Baseline a valódi trackerből', () => {
  const t = existsSync(REAL) ? load(REAL) : undefined!;

  it('a nyers adatokból számolt baseline egyezik a Baseline lappal és a specifikációval', () => {
    const b = computeBaseline(t.baselineNights, t.baselineDays);
    for (const [metric, stat] of Object.entries(t.baselineStats)) {
      const mine = b[metric as keyof typeof b]!;
      expect(mine.mean, metric).toBeCloseTo(stat.mean, 6);
      expect(mine.sd!, metric).toBeCloseTo(stat.sd!, 6);
      expect(mine.n, metric).toBe(stat.n);
    }
    expect(formatDuration(b.sleepMin!.mean)).toBe('7:40');
    expect(formatDuration(b.awakeMin!.mean)).toBe('0:21');
    expect(formatDuration(b.deepMin!.mean)).toBe('0:42');
    expect(formatDuration(b.remMin!.mean)).toBe('1:59');
    expect(b.hrvNight).toMatchObject({ n: 30 });
    expect(b.hrvNight!.mean).toBeCloseTo(72.1, 1);
    expect(b.rhrNight).toMatchObject({ n: 30 });
    expect(b.rhrNight!.mean).toBeCloseTo(54.6, 1);
    expect(b.rhrDay).toMatchObject({ n: 80 });
    expect(b.rhrDay!.mean).toBeCloseTo(63.1, 1);
    expect(b.hrvDay).toMatchObject({ n: 80 });
    expect(b.hrvDay!.mean).toBeCloseTo(67.8, 1);
  });
});
