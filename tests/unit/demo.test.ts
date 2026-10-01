import { describe, expect, it } from 'vitest';
import { computeBaseline } from '@/domain/baseline';
import { generateDemo } from '@/domain/demo/generate';
import { toEntryMap, eveningDone } from '@/domain/entries';
import { weeklySummaries, worseningText } from '@/domain/weekly';

describe('demó adatok', () => {
  const d = generateDemo('2026-10-01');

  it('determinisztikus (seedelt)', () => {
    expect(generateDemo('2026-10-01')).toEqual(d);
  });
  it('kezdés 2026-08-03, 60 kitöltött nap, a mai este még hátravan', () => {
    expect(d.settings.startDate).toBe('2026-08-03');
    expect(d.days).toHaveLength(60);
    expect(eveningDone(d.days.at(-1))).toBe(false);
    expect(d.baselineNights).toHaveLength(30);
    expect(d.baselineDays).toHaveLength(80);
  });
  it('a történet: a DEMO Excel romlás-mintázata hétről hétre', () => {
    const s = weeklySummaries({
      entries: toEntryMap(d.days),
      start: d.settings.startDate,
      weeks: 9,
      baseline: computeBaseline(d.baselineNights, d.baselineDays),
      subjective: d.settings.subjectiveBaseline,
    });
    expect(s.map((w) => worseningText(w.comparison))).toEqual([
      'nincs',
      'nincs',
      'alvásminőség, óraadatok, orr, puffadás',
      'nincs',
      'fáradtság, evés utáni fáradtság, puffadás',
      'nincs',
      'nincs',
      'nincs',
      'puffadás',
    ]);
    expect(d.plan.map((w) => w.result ?? null)).toEqual([
      'pass',
      'pass',
      'reaction',
      'pass',
      'reaction',
      'unsure',
      'pass',
      'pass',
      null,
    ]);
  });
  it('más napon is a hét hétfőjéhez igazodik', () => {
    const m = generateDemo('2026-12-02');
    expect(m.settings.startDate).toBe('2026-10-05');
    expect(m.days).toHaveLength(59);
  });
});
