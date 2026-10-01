import { describe, expect, it } from 'vitest';
import { computeBaseline } from '@/domain/baseline';
import { mean, movingAverage, sampleSd } from '@/domain/stats';

describe('statisztika', () => {
  it('a hiányzó érték kimarad, nem nulla', () => {
    expect(mean([2, undefined, 4, NaN, null])).toBe(3);
    expect(mean([])).toBeUndefined();
    expect(mean([undefined])).toBeUndefined();
  });
  it('minta-szórás (n − 1)', () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleSd([5])).toBeUndefined();
  });
  it('mozgóátlag', () => {
    expect(movingAverage([1, 2, 3, undefined, 5], 3, 2)).toEqual([undefined, 1.5, 2, 2.5, 4]);
  });
});

describe('baseline', () => {
  it('mutatónként átlag, szórás, n, első és utolsó dátum', () => {
    const b = computeBaseline(
      [
        { date: '2026-09-02', sleepMin: 480, awakeMin: 20, deepMin: 40, remMin: 120, hrv: 70 },
        { date: '2026-09-01', sleepMin: 440, awakeMin: 10, deepMin: 50, remMin: 100, rhr: 55 },
        { date: '2026-09-03', sleepMin: 460, awakeMin: 30 },
      ],
      [
        { date: '2026-08-01', rhrDay: 60, hrvDay: 70 },
        { date: '2026-08-02', rhrDay: 64 },
      ],
    );
    expect(b.sleepMin).toEqual({ mean: 460, sd: 20, n: 3, from: '2026-09-01', to: '2026-09-03' });
    expect(b.awakeMin?.mean).toBe(20);
    expect(b.hrvNight).toEqual({
      mean: 70,
      sd: undefined,
      n: 1,
      from: '2026-09-02',
      to: '2026-09-02',
    });
    expect(b.rhrNight?.n).toBe(1);
    expect(b.rhrDay?.mean).toBe(62);
    expect(b.hrvDay?.n).toBe(1);
  });
});
