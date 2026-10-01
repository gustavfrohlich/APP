import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { compareNights, MIN_NIGHTS } from '@/domain/comparisons';
import { eveningDone, hasAnyData, morningDone, toEntryMap } from '@/domain/entries';
import { catchUpForYesterday, missedDays, streak } from '@/domain/streak';
import type { DayEntry } from '@/domain/types';
import { BASELINE, entry } from './helpers';

describe('Mi hat az alvásodra?', () => {
  const days: DayEntry[] = [];
  for (let i = 0; i < 12; i++) {
    const date = addDays('2026-10-05', i);
    days.push(
      entry(date, {
        partnerStayed: i % 2 === 0,
        location: i < 6 ? 'budapest' : 'home_sk',
        sleepQuality: i % 2 === 0 ? 6 : 8,
        sleepMin: i % 2 === 0 ? 450 : 480,
        awakeMin: 20,
        hrvNight: 70,
        alcohol: i === 3 ? 2 : 0,
        exercise: i % 3 === 0 ? 'none' : 'light',
      }),
    );
  }
  const result = compareNights(toEntryMap(days), BASELINE);
  const byKey = Object.fromEntries(result.map((c) => [c.key, c]));

  it('különbség = első csoport − második (időknél percben)', () => {
    expect(byKey.partner!.a.n).toBe(6);
    expect(byKey.partner!.diffs.sleepQuality).toBe(-2);
    expect(byKey.partner!.diffs.sleepMin).toBe(-30);
    expect(byKey.partner!.enough).toBe(true);
  });
  it('az előző napi alkohol és mozgás szerint csoportosít', () => {
    expect(byKey.alcohol!.a.n).toBe(1); // a 4. nap után
    expect(byKey.alcohol!.b.n).toBe(10); // az első éjszakának nincs előző napja
    expect(byKey.alcohol!.enough).toBe(false);
    expect(byKey.exercise!.a.n + byKey.exercise!.b.n).toBe(11);
  });
  it(`${MIN_NIGHTS} éjszaka alatt „kevés adat”`, () => {
    expect(byKey.location!.a.n).toBe(6);
    expect(byKey.location!.enough).toBe(true);
  });
});

describe('kitöltöttség, kimaradás és streak', () => {
  it('check-in állapot', () => {
    expect(hasAnyData(entry('2026-10-05'))).toBe(false);
    expect(hasAnyData(entry('2026-10-05', { tags: [], note: '  ' }))).toBe(false);
    expect(hasAnyData(entry('2026-10-05', { caffeine: 0 }))).toBe(true);
    expect(morningDone(entry('2026-10-05', { sleepMin: 400, deviceSource: 'import' }))).toBe(false);
    expect(morningDone(entry('2026-10-05', { sleepMin: 400, deviceSource: 'manual' }))).toBe(true);
    expect(morningDone(entry('2026-10-05', { sleepQuality: 6 }))).toBe(true);
    expect(eveningDone(entry('2026-10-05', { nose: 0 }))).toBe(true);
  });

  const map = toEntryMap([
    entry('2026-10-05', { sleepQuality: 6 }),
    entry('2026-10-06', { nose: 2 }),
    entry('2026-10-08', { sleepQuality: 7, nose: 1 }),
    entry('2026-10-09', { sleepQuality: 7 }),
  ]);

  it('kimaradt nap: elmúlt nap a kezdéstől, ahol egy mező sincs', () => {
    expect(missedDays(map, '2026-10-05', '2026-10-10')).toEqual(['2026-10-07']);
    expect(missedDays(map, '2026-10-05', '2026-10-05')).toEqual([]);
    expect(missedDays(map, '2026-10-12', '2026-10-10')).toEqual([]);
  });
  it('streak a ma vagy tegnap óta, megszakítás nélkül', () => {
    expect(streak(map, '2026-10-09')).toBe(2); // ma kész → 9, 8
    expect(streak(map, '2026-10-10')).toBe(2); // ma még semmi → tegnaptól
    expect(streak(map, '2026-10-11')).toBe(0);
    expect(streak(map, '2026-10-06')).toBe(2);
  });
  it('pótolható tegnapi check-in', () => {
    expect(catchUpForYesterday(map, '2026-10-05', '2026-10-10')).toEqual({
      date: '2026-10-09',
      morning: false,
      evening: true,
    });
    expect(catchUpForYesterday(map, '2026-10-05', '2026-10-05')).toBeUndefined();
  });
});
