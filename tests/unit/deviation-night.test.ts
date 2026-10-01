import { describe, expect, it } from 'vitest';
import { signedPoints, signedZ, toneOf } from '@/domain/deviation';
import { nightComponents, nightLabel, nightScore } from '@/domain/nightScore';
import { BASELINE, entry } from './helpers';

describe('eltérés', () => {
  it('z = (x − átlag)/szórás, „alacsonyabb a jobb” mutatóknál előjelváltással', () => {
    expect(signedZ('hrvNight', 80, BASELINE.hrvNight)).toBe(1);
    expect(signedZ('awakeMin', 30, BASELINE.awakeMin)).toBe(-1);
    expect(signedZ('rhrNight', 54, BASELINE.rhrNight)).toBe(0.5);
    expect(signedZ('hrvNight', undefined, BASELINE.hrvNight)).toBeUndefined();
    expect(signedZ('hrvNight', 80, { mean: 70, sd: 0 })).toBeUndefined();
  });
  it('napi küszöb ±0,5, heti ±0,25', () => {
    expect(toneOf(0.5, 0.5)).toBe('good');
    expect(toneOf(0.49, 0.5)).toBe('neutral');
    expect(toneOf(-0.5, 0.5)).toBe('bad');
    expect(toneOf(0.25, 0.25)).toBe('good');
    expect(toneOf(-0.3, 0.25)).toBe('bad');
    expect(toneOf(undefined, 0.5)).toBeUndefined();
  });
  it('szubjektív pontok a becsléshez képest, előjelezve', () => {
    expect(signedPoints('nose', 5, 3)).toBe(-2);
    expect(signedPoints('sleepQuality', 8, 6)).toBe(2);
  });
});

describe('éjszaka-összkép', () => {
  it('a meglévő mutatók előjelezett z-értékeinek átlaga', () => {
    // HRV +1, ébren +1 (kevesebb), a többi hiányzik
    const e = entry('2026-10-06', { hrvNight: 80, awakeMin: 10 });
    expect(nightScore(e, BASELINE)).toBe(1);
    const e2 = entry('2026-10-06', {
      sleepMin: 490, // +1
      awakeMin: 30, // −1
      deepMin: 40, // 0
      remMin: 100, // −1
      hrvNight: 75, // +0,5
      rhrNight: 56, // −0,5
    });
    expect(nightScore(e2, BASELINE)).toBeCloseTo(-1 / 6, 10);
    expect(nightComponents(e2, BASELINE)).toHaveLength(6);
  });
  it('nincs érték, ha egyik mutató sincs', () => {
    expect(nightScore(entry('2026-10-06', { sleepQuality: 7 }), BASELINE)).toBeUndefined();
    expect(nightScore(entry('2026-10-06', { hrvNight: 80 }), {})).toBeUndefined();
  });
  it('címke: napi ±0,5, heti ±0,25', () => {
    expect(nightLabel(0.5, 'day')).toMatchObject({ symbol: '▲', text: 'jobb' });
    expect(nightLabel(0.3, 'day')).toMatchObject({ symbol: '●', text: 'átlagos' });
    expect(nightLabel(0.3, 'week')).toMatchObject({ symbol: '▲' });
    expect(nightLabel(-0.6, 'day')).toMatchObject({ symbol: '▼', text: 'rosszabb' });
  });
});
