import { describe, expect, it } from 'vitest';
import { maskDurationInput, parseDuration } from '@/domain/parse/duration';
import { parseDecimal } from '@/domain/parse/number';
import { parseSmartPaste } from '@/domain/parse/smartPaste';

describe('időtartam', () => {
  it.each([
    ['7:56', 476],
    ['0:11', 11],
    ['756', 476],
    ['11', 11],
    ['7h56', 476],
    ['7h 56m', 476],
    ['7 ó 56 p', 476],
    ['11m', 11],
    ['11 perc', 11],
    ['45 min', 45],
    ['1h', 60],
    ['7.9', 474],
    ['7,9', 474],
    ['8:04', 484],
    ['1:07', 67],
    ['1205', 725],
  ])('%s → %d perc', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
  it('érvénytelen bemenet', () => {
    expect(parseDuration('7:75')).toBeUndefined();
    expect(parseDuration('abc')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('799')).toBeUndefined();
  });
  it('élő maszk', () => {
    expect(maskDurationInput('7')).toBe('7');
    expect(maskDurationInput('75')).toBe('75');
    expect(maskDurationInput('756')).toBe('7:56');
    expect(maskDurationInput('7:561')).toBe('75:61');
    expect(maskDurationInput('7:')).toBe('7');
    expect(maskDurationInput('7h56')).toBe('7h56');
    expect(maskDurationInput('7.9')).toBe('7.9');
  });
});

describe('szám', () => {
  it('vesszőt és pontot is elfogad', () => {
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal('72.5')).toBe(72.5);
    expect(parseDecimal('84 ms')).toBe(84);
    expect(parseDecimal('51,5 bpm')).toBe(51.5);
    expect(parseDecimal('x')).toBeUndefined();
    expect(parseDecimal('')).toBeUndefined();
  });
});

describe('okos beillesztés', () => {
  it('magyar kulcs-érték szöveg', () => {
    expect(
      parseSmartPaste('Alvás 7:56, Ébren 11 perc, Mély 0:42, REM 2:05, HRV 84, Pulzus 51,5'),
    ).toEqual({
      sleepMin: 476,
      awakeMin: 11,
      deepMin: 42,
      remMin: 125,
      hrvNight: 84,
      rhrNight: 51.5,
    });
  });
  it('angol, elválasztókkal és mértékegységgel', () => {
    expect(
      parseSmartPaste(
        'Sleep: 7h56 | Awake: 11m | Deep: 0:42 | REM: 2:05 | HRV: 84 ms | RHR: 51.5 bpm',
      ),
    ).toEqual({
      sleepMin: 476,
      awakeMin: 11,
      deepMin: 42,
      remMin: 125,
      hrvNight: 84,
      rhrNight: 51.5,
    });
  });
  it('mértékegység nélküli számok egymás után', () => {
    expect(parseSmartPaste('HRV 84 Pulzus 52')).toEqual({ hrvNight: 84, rhrNight: 52 });
  });
  it('fejléc + adatsor (az export formátumában, tabulátorral)', () => {
    const text =
      'Date\tSleep\tAwake\tREM\tCore\tDeep\tSleep (h)\tAwake (h)\tHRV (ms)\tRHR (bpm)\n2026-10-08\t8:04\t11m\t1:59\t4:12\t0:42\t8.07\t0.18\t72\t54.2';
    expect(parseSmartPaste(text)).toEqual({
      sleepMin: 484,
      awakeMin: 11,
      remMin: 119,
      deepMin: 42,
      hrvNight: 72,
      rhrNight: 54.2,
    });
  });
  it('értelmetlen szövegből semmi', () => {
    expect(parseSmartPaste('szia, hogy vagy?')).toEqual({});
  });
});
