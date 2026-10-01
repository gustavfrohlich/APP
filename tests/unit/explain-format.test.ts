import { describe, expect, it } from 'vitest';
import { explainDay, explainNight } from '@/domain/explain';
import {
  article,
  formatDateLong,
  formatDuration,
  formatDurationDelta,
  formatMetricDelta,
  formatNumber,
  formatSigned,
  joinHu,
  weekdayShort,
} from '@/domain/format';
import { suggestEvening, suggestLocation } from '@/domain/suggest';
import { toEntryMap } from '@/domain/entries';
import { BASELINE, entry } from './helpers';

describe('magyar formázás', () => {
  it('idő, szám, előjel', () => {
    expect(formatDuration(476)).toBe('7:56');
    expect(formatDuration(11)).toBe('0:11');
    expect(formatDuration(-16)).toBe('−0:16');
    expect(formatNumber(72.5)).toBe('72,5');
    expect(formatNumber(72)).toBe('72');
    expect(formatSigned(12)).toBe('+12');
    expect(formatSigned(-0.44, 1)).toBe('−0,4');
    expect(formatSigned(0.01, 1)).toBe('0');
    expect(formatDurationDelta(-9)).toBe('−9 perc');
    expect(formatDurationDelta(65)).toBe('+1:05');
    expect(formatMetricDelta('hrvNight', 12.3)).toBe('+12 ms');
    expect(formatMetricDelta('rhrNight', -2.14)).toBe('−2,1 bpm');
  });
  it('dátum és nap', () => {
    expect(formatDateLong('2026-10-08')).toBe('csütörtök, okt. 8.');
    expect(weekdayShort('2026-10-10')).toBe('Szo');
  });
  it('névelő és felsorolás', () => {
    expect(article('alacsonyabb pulzus')).toBe('az');
    expect(article('magasabb HRV')).toBe('a');
    expect(article('5')).toBe('az');
    expect(article('3')).toBe('a');
    expect(joinHu(['a', 'b', 'c'])).toBe('a, b és c');
  });
});

describe('azonnali visszajelzés', () => {
  it('jobb éjszaka a két legnagyobb hatású mutatóval', () => {
    const e = entry('2026-10-08', {
      sleepMin: 465,
      awakeMin: 11,
      deepMin: 42,
      remMin: 125,
      hrvNight: 82,
      rhrNight: 54,
    });
    const x = explainNight(e, BASELINE);
    expect(x.tone).toBe('good');
    expect(x.headline).toBe('Szép éjszaka volt!');
    expect(x.sentence).toBe(
      'Az éjszakád jobb volt az átlagnál, főleg a magasabb HRV (+12 ms) és a kevesebb ébrenlét (−9 perc) miatt.',
    );
  });
  it('rosszabb és átlagos éjszaka', () => {
    const bad = explainNight(entry('2026-10-08', { hrvNight: 55, rhrNight: 59 }), BASELINE);
    expect(bad.tone).toBe('bad');
    expect(bad.sentence).toMatch(
      /^Az éjszakád rosszabb volt az átlagnál, főleg a magasabb pulzus \(\+4 bpm\) és az alacsonyabb HRV \(−15 ms\) miatt\.$/,
    );
    const avg = explainNight(entry('2026-10-08', { hrvNight: 80, awakeMin: 30 }), BASELINE);
    expect(avg.tone).toBe('neutral');
    expect(avg.sentence).toBe(
      'Átlagos éjszaka: magasabb volt a HRV (+10 ms), de többet voltál ébren (+10 perc).',
    );
  });
  it('baseline nélkül teendőt mond', () => {
    expect(explainNight(entry('2026-10-08', { hrvNight: 80 }), {}).sentence).toMatch(/baseline/);
  });
  it('esti összegzés a becsléshez képest', () => {
    const d = explainDay(
      entry('2026-10-08', { nose: 7, bloating: 2 }),
      { nose: 3, bloating: 2 },
      [],
      {
        food: '+ tej',
        dayInWeek: 3,
        isTestWeek: true,
      },
    );
    expect(d.tone).toBe('bad');
    expect(d.sentence).toBe(
      'Magasabb volt: orr / légzés (7, szokásosan 3). Új étel: tej, 3. nap – figyeld, tart-e.',
    );
    const ok = explainDay(entry('2026-10-08', { nose: 3 }), {}, [entry('2026-10-07', { nose: 3 })]);
    expect(ok.tone).toBe('neutral');
  });
});

describe('okos alapértékek', () => {
  it('hétvégén Otthon (SK), hétköznap a legutóbbi hétköznapi hely', () => {
    const m = toEntryMap([entry('2026-10-07', { location: 'other' })]);
    expect(suggestLocation('2026-10-10', m)).toBe('home_sk');
    expect(suggestLocation('2026-10-08', m)).toBe('other');
    expect(suggestLocation('2026-10-08', new Map())).toBe('budapest');
  });
  it('a nap röviden: tegnapi koffein, mozgás, stressz; diéta „Igen”, alkohol 0', () => {
    const m = toEntryMap([
      entry('2026-10-07', { caffeine: 2, exercise: 'light', stress: 4, alcohol: 3, diet: 'no' }),
    ]);
    expect(suggestEvening('2026-10-08', m)).toEqual({
      diet: 'yes',
      caffeine: 2,
      alcohol: 0,
      exercise: 'light',
      stress: 4,
    });
  });
});
