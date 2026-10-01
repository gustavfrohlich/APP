import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import type { DayEntry, SubjectiveBaseline } from '@/domain/types';
import { suggestVerdict } from '@/domain/verdict';
import { compareKeyValues, weeklySummaries, worseningText } from '@/domain/weekly';
import { BASELINE, entry } from './helpers';

const START = '2026-10-05';
const SUBJ: SubjectiveBaseline = {
  sleepQuality: 6,
  nose: 4,
  fatigue: 4,
  postMealFatigue: 4,
  bloating: 4,
};

/** Napló-építő: a nappali mezők a diéta-hét napjaira, az éjszakaiak az alvás-hét reggeleire. */
class Log {
  private map = new Map<string, DayEntry>();
  private put(date: string, fields: Partial<DayEntry>) {
    this.map.set(date, { ...(this.map.get(date) ?? entry(date)), ...fields });
  }
  day(w: number, fields: Partial<DayEntry>, days = 7) {
    for (let i = 0; i < days; i++) this.put(addDays(START, (w - 1) * 7 + i), fields);
    return this;
  }
  night(w: number, fields: Partial<DayEntry>, nights = 7) {
    for (let i = 0; i < nights; i++) this.put(addDays(START, (w - 1) * 7 + i + 1), fields);
    return this;
  }
  get entries() {
    return this.map as ReadonlyMap<string, DayEntry>;
  }
}

const AVG_NIGHT = {
  sleepMin: 460,
  awakeMin: 20,
  deepMin: 40,
  remMin: 120,
  hrvNight: 70,
  rhrNight: 55,
};

function summaries(log: Log, subjective = SUBJ, weeks = 4) {
  return weeklySummaries({
    entries: log.entries,
    start: START,
    weeks,
    baseline: BASELINE,
    subjective,
  });
}

describe('heti összesítő', () => {
  it('az óraadat és az alvásminőség alvás-hét, a tünetek diéta-hét szerint átlagolódnak', () => {
    const log = new Log()
      .day(1, { nose: 2, fatigue: 3, postMealFatigue: 2, bloating: 1 })
      .night(1, { ...AVG_NIGHT, hrvNight: 80, sleepQuality: 7 });
    // Az első hétfő reggele (0. alvás-hét) nem számít bele.
    log.night(0, { hrvNight: 10, sleepQuality: 1 }, 1);
    const [w1] = summaries(log);
    expect(w1!.filledDays).toBe(7);
    expect(w1!.nights).toBe(7);
    expect(w1!.watch.hrvNight).toBe(80);
    expect(w1!.sleepQuality).toBe(7);
    expect(w1!.symptoms.nose).toBe(2);
    // összkép: csak a HRV tér el (+1 szórás) → 1/6
    expect(w1!.nightScore).toBeCloseTo(1 / 6, 10);
  });

  it('a hiányzó mezők kimaradnak, nem nullák', () => {
    const log = new Log().day(1, { nose: 4 }, 3);
    log.day(1, { fatigue: 2 }, 1);
    const [w1] = summaries(log);
    expect(w1!.filledDays).toBe(3);
    expect(w1!.symptoms.nose).toBe(4);
    expect(w1!.symptoms.fatigue).toBe(2);
    expect(w1!.symptoms.bloating).toBeUndefined();
  });

  it('színezés: óraadat ±0,25 szórás, szubjektív ±1 pont a becsléshez; becslés nélkül nincs', () => {
    const log = new Log()
      .day(1, { nose: 3, fatigue: 5.5, bloating: 4 })
      .night(1, { ...AVG_NIGHT, hrvNight: 72.5, rhrNight: 55.4, sleepQuality: 7 });
    const [w1] = summaries(log);
    expect(w1!.tones.hrvNight).toBe('good'); // +0,25 szórás
    expect(w1!.tones.rhrNight).toBe('neutral'); // −0,2
    expect(w1!.tones.nose).toBe('good'); // 3 vs 4 → −1 pont
    expect(w1!.tones.fatigue).toBe('bad'); // +1,5
    expect(w1!.tones.bloating).toBe('neutral');
    expect(w1!.tones.sleepQuality).toBe('good');
    const [noEstimate] = summaries(log, {});
    expect(noEstimate!.tones.nose).toBeUndefined();
    expect(noEstimate!.tones.hrvNight).toBe('good');
  });
});

describe('romlás az előző héthez', () => {
  it('az 1. hét a baseline-hoz (összkép = 0, szubjektívek = becslés)', () => {
    const log = new Log()
      .day(1, { nose: 5, fatigue: 4, postMealFatigue: 4, bloating: 4 })
      .night(1, { ...AVG_NIGHT, hrvNight: 50, rhrNight: 57, sleepQuality: 5 });
    const [w1] = summaries(log);
    expect(w1!.comparison.against).toBe('baseline');
    // összkép: (−2 −1)/6 = −0,5 → romlott; alvásminőség −1 → romlott; orr +1 → romlott
    expect(worseningText(w1!.comparison)).toBe('alvásminőség, óraadatok, orr');
  });

  it('a w. hetet a (w−1).-hez hasonlítja, az Excel sorrendjében', () => {
    const log = new Log()
      .day(1, { nose: 2, fatigue: 3, postMealFatigue: 2, bloating: 1 })
      .night(1, { ...AVG_NIGHT, sleepQuality: 7 })
      .day(2, { nose: 2, fatigue: 3, postMealFatigue: 2, bloating: 1 })
      .night(2, { ...AVG_NIGHT, sleepQuality: 7 })
      .day(3, { nose: 4.5, fatigue: 3.5, postMealFatigue: 2, bloating: 2.5 })
      .night(3, { ...AVG_NIGHT, awakeMin: 35, hrvNight: 58, rhrNight: 58, sleepQuality: 5.5 });
    const s = summaries(log);
    expect(worseningText(s[1]!.comparison)).toBe('nincs');
    expect(s[2]!.comparison.against).toBe(2);
    expect(worseningText(s[2]!.comparison)).toBe('alvásminőség, óraadatok, orr, puffadás');
    // A 4. hét hétfő reggele (a 3. alvás-hét vége) már kitöltött nap, de összevethető átlag nincs:
    // az Excel ilyenkor „✓ nincs”-et mutat.
    expect(worseningText(s[3]!.comparison)).toBe('nincs');
  });

  it('üres a cella, ha a hétnek nincs kitöltött napja', () => {
    const log = new Log().day(1, { nose: 3 });
    const s = summaries(log);
    expect(s[1]!.comparison.status).toBe('empty');
    expect(worseningText(s[1]!.comparison)).toBe('');
  });

  it('„–”, ha az előző hétnek nincs kitöltött napja', () => {
    const log = new Log().day(2, { nose: 3 });
    const s = summaries(log);
    expect(worseningText(s[1]!.comparison)).toBe('–');
  });

  it('az 1. hét „–”, ha sem óra-baseline, sem becslés nincs', () => {
    const log = new Log().day(1, { nose: 3 });
    const [w1] = weeklySummaries({
      entries: log.entries,
      start: START,
      weeks: 1,
      baseline: {},
      subjective: {},
    });
    expect(worseningText(w1!.comparison)).toBe('–');
  });

  it('a küszöbök pontosan a határon is romlást jeleznek (lebegőpontos tűréssel)', () => {
    const c = compareKeyValues(
      { sleepQuality: 6.428571428571429, nightScore: -0.1, fatigue: 5.1 },
      { sleepQuality: 7.428571428571429, nightScore: 0.2, fatigue: 4.1 },
      1,
    );
    expect(c.worsened).toEqual(['sleepQuality', 'nightScore', 'fatigue']);
    const notYet = compareKeyValues(
      { sleepQuality: 6.01, nightScore: -0.09 },
      { sleepQuality: 7, nightScore: 0.2 },
      1,
    );
    expect(notYet.worsened).toEqual([]);
  });
});

describe('javaslat a hét lezárásához', () => {
  it('Reakció: legalább 2 mutató romlott', () => {
    const v = suggestVerdict(
      compareKeyValues({ nose: 5.2, bloating: 5.1 }, { nose: 4, bloating: 4 }, 2),
    );
    expect(v.result).toBe('reaction');
    expect(v.reasons.length).toBeGreaterThanOrEqual(2);
  });
  it('Reakció: egy tünet legalább 2 ponttal nőtt', () => {
    const v = suggestVerdict(compareKeyValues({ bloating: 6 }, { bloating: 4 }, 2));
    expect(v.result).toBe('reaction');
    expect(v.bigJumps).toEqual(['bloating']);
  });
  it('Reakció: az alvásminőség 2-vel csökkent', () => {
    const v = suggestVerdict(compareKeyValues({ sleepQuality: 5 }, { sleepQuality: 7 }, 2));
    expect(v.result).toBe('reaction');
  });
  it('Bizonytalan: pontosan 1 mutató romlott, 2 pontnál kevesebbel', () => {
    expect(
      suggestVerdict(compareKeyValues({ nose: 5.5, fatigue: 4 }, { nose: 4, fatigue: 4 }, 2))
        .result,
    ).toBe('unsure');
    expect(
      suggestVerdict(compareKeyValues({ nightScore: -0.4 }, { nightScore: 0 }, 'baseline')).result,
    ).toBe('unsure');
  });
  it('Átment: semmi nem romlott', () => {
    const v = suggestVerdict(
      compareKeyValues({ nose: 3, sleepQuality: 7 }, { nose: 4, sleepQuality: 6.5 }, 2),
    );
    expect(v.result).toBe('pass');
    expect(v.summary).toMatch(/Átment/);
  });
  it('nincs adat → bizonytalan, indoklással', () => {
    const v = suggestVerdict(compareKeyValues({}, { nose: 4 }, 2));
    expect(v.result).toBe('unsure');
    expect(v.summary).toMatch(/nincs elég adat/i);
  });
});

describe('javaslat szövege', () => {
  it('nagy ugrásnál természetes mondat', () => {
    const v = suggestVerdict(compareKeyValues({ bloating: 6 }, { bloating: 4 }, 8));
    expect(v.summary).toBe('Reakció valószínű: a puffadás legalább 2 ponttal nőtt.');
    const w = suggestVerdict(compareKeyValues({ sleepQuality: 5 }, { sleepQuality: 7 }, 8));
    expect(w.summary).toBe('Reakció valószínű: az alvásminőség legalább 2 ponttal csökkent.');
  });
});
