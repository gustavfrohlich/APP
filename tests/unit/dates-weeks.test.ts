import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  eachDay,
  fromExcelSerial,
  isISODate,
  mondayOf,
  nextMondayFrom,
  parseFlexibleDate,
  weekdayIndex,
} from '@/domain/dates';
import {
  dayInWeek,
  dietWeek,
  dietWeekRange,
  sleepWeek,
  sleepWeekRange,
  weekInfo,
} from '@/domain/weeks';

const START = '2026-10-05'; // hétfő

describe('dátumok', () => {
  it('napokat ad hozzá és számol különbséget DST-től függetlenül', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // óraátállítás hétvégéje
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(diffDays('2026-10-05', '2026-12-07')).toBe(63);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('hét napja: hétfő = 0, vasárnap = 6', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0);
    expect(weekdayIndex('2026-10-11')).toBe(6);
    expect(mondayOf('2026-10-08')).toBe('2026-10-05');
    expect(nextMondayFrom('2026-10-01')).toBe('2026-10-05');
    expect(nextMondayFrom('2026-10-05')).toBe('2026-10-05');
  });
  it('eachDay zárt intervallumot ad', () => {
    expect(eachDay('2026-10-05', '2026-10-07')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });
  it('rugalmas dátumfelismerés', () => {
    expect(parseFlexibleDate('2026-08-03')).toBe('2026-08-03');
    expect(parseFlexibleDate('2026-08-03 07:12:00')).toBe('2026-08-03');
    expect(parseFlexibleDate('2026.08.03.')).toBe('2026-08-03');
    expect(parseFlexibleDate('03.08.2026')).toBe('2026-08-03');
    expect(parseFlexibleDate('8/3/2026')).toBe('2026-08-03');
    expect(parseFlexibleDate(46237)).toBe('2026-08-03');
    expect(parseFlexibleDate(46237.75)).toBe('2026-08-03');
    expect(parseFlexibleDate('valami')).toBeUndefined();
    expect(parseFlexibleDate('2026-02-30')).toBeUndefined();
    expect(fromExcelSerial(45658)).toBe('2025-01-01');
    expect(isISODate('2026-13-01')).toBe(false);
  });
});

describe('hetek', () => {
  it('diéta-hét: floor((d − kezdés)/7) + 1', () => {
    expect(dietWeek('2026-10-05', START)).toBe(1);
    expect(dietWeek('2026-10-11', START)).toBe(1);
    expect(dietWeek('2026-10-12', START)).toBe(2);
    expect(dietWeek('2026-12-06', START)).toBe(9);
    expect(dietWeek('2026-10-04', START)).toBe(0);
  });
  it('alvás-hét = hét(d − 1): keddtől a következő hétfő reggelig', () => {
    expect(sleepWeek('2026-10-05', START)).toBe(0); // az első hétfő reggele a 0. alvás-hét
    expect(sleepWeek('2026-10-06', START)).toBe(1);
    expect(sleepWeek('2026-10-12', START)).toBe(1); // a következő hétfő reggel még az 1.
    expect(sleepWeek('2026-10-13', START)).toBe(2);
    expect(sleepWeekRange(1, START)).toEqual({ from: '2026-10-06', to: '2026-10-12' });
    expect(dietWeekRange(3, START)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });
  it('a hét napja és a fázis', () => {
    expect(dayInWeek('2026-10-22', START)).toBe(4);
    expect(weekInfo('2026-10-01', START, 9)).toMatchObject({ phase: 'before', daysUntilStart: 4 });
    expect(weekInfo('2026-10-22', START, 9)).toMatchObject({
      phase: 'running',
      week: 3,
      dayInWeek: 4,
    });
    expect(weekInfo('2026-12-07', START, 9)).toMatchObject({ phase: 'after', week: 10 });
  });
});
