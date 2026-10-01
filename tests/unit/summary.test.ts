import { describe, expect, it } from 'vitest';
import { computeBaseline } from '@/domain/baseline';
import { compareNights } from '@/domain/comparisons';
import { generateDemo } from '@/domain/demo/generate';
import { toEntryMap } from '@/domain/entries';
import { DEFAULT_PLAN } from '@/domain/plan';
import { canCloseWeek, closableWeeks, lastPassedWeekBefore, observations } from '@/domain/summary';
import { weekInfo } from '@/domain/weeks';
import { weeklySummaries } from '@/domain/weekly';

describe('hét lezárása', () => {
  const start = '2026-10-05';
  it('vasárnaptól zárható a hét, a korábbi nyitott hetek is', () => {
    expect(closableWeeks(DEFAULT_PLAN, weekInfo('2026-10-10', start, 9))).toEqual([]);
    expect(closableWeeks(DEFAULT_PLAN, weekInfo('2026-10-11', start, 9))).toEqual([1]);
    expect(closableWeeks(DEFAULT_PLAN, weekInfo('2026-10-20', start, 9))).toEqual([1, 2]);
    expect(closableWeeks(DEFAULT_PLAN, weekInfo('2026-10-01', start, 9))).toEqual([]);
    expect(canCloseWeek(3, weekInfo('2026-10-25', start, 9))).toBe(true);
    expect(canCloseWeek(3, weekInfo('2026-10-24', start, 9))).toBe(false);
  });
  it('utolsó átment hét', () => {
    const plan = DEFAULT_PLAN.map((w) => ({
      ...w,
      result: w.week === 3 ? ('reaction' as const) : w.week < 3 ? ('pass' as const) : undefined,
    }));
    expect(lastPassedWeekBefore(plan, 4)).toBe(2);
  });
});

describe('főbb megfigyelések', () => {
  it('a demó történetéből', () => {
    const d = generateDemo('2026-10-01');
    const entries = toEntryMap(d.days);
    const baseline = computeBaseline(d.baselineNights, d.baselineDays);
    const summaries = weeklySummaries({
      entries,
      start: d.settings.startDate,
      weeks: 9,
      baseline,
      subjective: d.settings.subjectiveBaseline,
    });
    const obs = observations({
      summaries,
      plan: d.plan,
      comparisons: compareNights(entries, baseline),
      subjective: d.settings.subjectiveBaseline,
      baseline,
    });
    const text = obs.map((o) => o.text).join('\n');
    expect(text).toMatch(
      /3\. hét \(tej\): reakció – romlott: alvásminőség, óraadatok, orr és puffadás\./,
    );
    expect(text).toMatch(/5\. hét \(búza\): reakció/);
    expect(text).toMatch(/6\. hét .*bizonytalan/);
    expect(text).toMatch(/Átment: .*tojás/);
    expect(obs.find((o) => o.text.startsWith('3. hét'))?.tone).toBe('bad');
  });
});
