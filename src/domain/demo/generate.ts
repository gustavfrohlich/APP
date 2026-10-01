// Demó adatok – kitalált, kódban generált, seedelt véletlennel (mindig ugyanaz az eredmény).
// A demó baseline is kitalált, hogy személyes adat ne kerüljön a kódba.
//
// Történet (kezdés: a mai hét hétfője − 8 hét; 2026-10-01-jén ez 2026-08-03, 60 kitöltött nap):
//  1. marha + rizs + áfonya      átállás: az első 3 nap fáradtabb, a puffadás gyorsan csökken   → Átment
//  2. + édesburgonya, …, csirke  stabil javulás: alvásminőség ~7, HRV ~+15 ms                   → Átment
//  3. + tej                      a 2. naptól eldugult orr, rosszabb alvás, magasabb pulzus      → Reakció
//  4. + tojás, tej nélkül         az első 2 napon még a tej utóhatása, utána rendben             → Átment
//  5. + búza                     erős puffadás, evés utáni fáradtság                            → Reakció
//  6. + fűszerek, búza nélkül     csak a hagymás napokon puffadás                                → Bizonytalan
//  7. + cukor                    enyhe délutáni energiaesés                                     → Átment
//  8. + majonézes szószok        rendben                                                        → Átment
//  9. hagyma + fokhagyma külön   visszatér a puffadás                                           → folyamatban

import { addDays, diffDays, isWeekend, mondayOf, weekdayIndex } from '../dates';
import { DEFAULT_PLAN } from '../plan';
import type {
  AppData,
  BaselineDay,
  BaselineNight,
  BloatingWhen,
  DayEntry,
  Exercise,
  ISODate,
  PlanWeek,
  Settings,
} from '../types';
import { clamp, gaussian, mulberry32, type Rng } from './rng';

export const DEMO_SEED = 20260803;

/** A demó baseline paraméterei (kitalált, a valódihoz hasonló nagyságrend). */
const BASE = {
  sleepMin: { mean: 462, sd: 50 },
  awakeMin: { mean: 21, sd: 17 },
  deepMin: { mean: 42, sd: 12 },
  remMin: { mean: 118, sd: 28 },
  hrv: { mean: 71, sd: 20 },
  rhr: { mean: 54.8, sd: 5.6 },
  rhrDay: { mean: 63, sd: 4.4 },
  hrvDay: { mean: 68, sd: 13 },
};

export function demoStartFor(today: ISODate): ISODate {
  return addDays(mondayOf(today), -56);
}

interface DayState {
  nose: number;
  fatigue: number;
  pmf: number;
  bloating: number;
  bloatingWhen?: BloatingWhen;
  alcohol: number;
  note?: string;
  tags: string[];
  /** Az ezt követő éjszaka eltérései. */
  night: {
    quality: number;
    sleep: number;
    awake: number;
    deep: number;
    rem: number;
    hrv: number;
    rhr: number;
  };
}

const ONION_DAYS = new Set([0, 2, 4, 5]);

/** Jó állapot (a bázis után): tünetek és az éjszaka eltérései a baseline-hoz. */
const GOOD: Omit<DayState, 'alcohol' | 'tags'> = {
  nose: 4.4,
  fatigue: 3.1,
  pmf: 2.8,
  bloating: 1.3,
  night: { quality: 7.1, sleep: 20, awake: -5, deep: 5, rem: 8, hrv: 13, rhr: -2.6 },
};

/** A nap (étel) hatása: tünetek aznap este, éjszakai eltérések a következő reggel. */
function dayState(i: number): DayState {
  const w = Math.floor(i / 7) + 1;
  const k = i % 7; // 0 = hétfő
  const s: DayState = { ...GOOD, night: { ...GOOD.night }, alcohol: 0, tags: [] };
  const milk = (f: number) => {
    s.nose += 2.7 * f;
    s.bloating += 1.7 * f;
    s.fatigue += 0.3 * f;
    s.pmf += 0.5 * f;
    s.night.quality -= 2 * f;
    s.night.awake += 12 * f;
    s.night.hrv -= 14 * f;
    s.night.rhr += 3 * f;
    s.night.deep -= 7 * f;
    s.night.rem -= 10 * f;
  };

  switch (w) {
    case 1: {
      const t = Math.min(1, k / 5); // átállás
      s.fatigue = [8.5, 7, 6, 4.5, 4, 3.6, 3.4][k]!;
      s.bloating = [5, 3.6, 3, 2.4, 2, 1.8, 1.3][k]!;
      s.nose = 6.8 - t * 2.2;
      s.pmf = 7 - t * 3.6;
      s.night = {
        quality: 4.6 + t * 2.4,
        sleep: 10 * t,
        awake: 1 - 4 * t,
        deep: 2 * t,
        rem: 8 * t,
        hrv: 1 + 8 * t,
        rhr: -0.4 - 1.4 * t,
      };
      if (k === 0) s.note = 'Első nap – fura, de megy.';
      if (k === 2) s.note = 'Délután fejfájás.';
      if (k === 4) s.note = 'Már kevésbé vagyok fáradt.';
      break;
    }
    case 2:
      if (k === 3) s.note = 'Jól vagyok, az édesburgonya bejött.';
      break;
    case 3:
      if (k >= 1) milk(1);
      if (k === 2) {
        s.note = 'Reggel óta eldugult orr.';
        s.tags.push('orrspray');
      }
      if (k === 4) s.tags.push('orrspray');
      break;
    case 4:
      if (k <= 1) milk(k === 0 ? 0.6 : 0.3);
      if (k === 5) {
        s.alcohol = 2;
        s.note = 'Szombati családi ebéd, 2 sör.';
        s.tags.push('családi ebéd');
        s.night.quality -= 2.4;
        s.night.awake += 22;
        s.night.hrv -= 24;
        s.night.rhr += 5;
        s.night.deep -= 10;
      }
      break;
    case 5: {
      const f = k === 0 ? 0.7 : 1;
      s.bloating += 4.9 * f;
      s.pmf += 2.9 * f;
      s.fatigue += 1.7 * f;
      s.night.quality -= 0.4 * f;
      s.night.hrv -= 7 * f;
      s.night.rhr += 1.4 * f;
      s.night.awake += 6 * f;
      s.bloatingWhen = k % 3 === 0 ? 'allday' : 'lunch';
      if (k === 1) s.note = 'Ebéd után nagyon puffadt, le kellett dőlnöm.';
      break;
    }
    case 6:
      s.fatigue += 0.6;
      s.pmf += 0.5;
      if (ONION_DAYS.has(k)) {
        s.bloating += 3.2;
        s.bloatingWhen = 'dinner';
        if (k === 2) s.note = 'Hagymás vacsora – utána puffadás.';
      }
      break;
    case 7:
      s.pmf += 1.1;
      if (k === 1) s.note = 'Délután enyhe energiaesés.';
      break;
    case 8:
      s.night.quality += 0.7;
      s.night.hrv += 6;
      s.night.awake -= 3;
      if (k === 3) s.note = 'Semmi gond.';
      break;
    default:
      s.bloating += 3;
      s.pmf += 1;
      s.night.quality += 0.7;
      s.night.hrv += 5;
      s.bloatingWhen = 'dinner';
      if (k === 1) s.note = 'Hagyma újra – vacsora után puffadás.';
      break;
  }
  return s;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

function scale(x: number, rng: Rng, sd: number, lo: number, hi: number): number {
  return Math.round(clamp(x + gaussian(rng) * sd, lo, hi));
}

const EXERCISE_BY_WEEKDAY: Exercise[] = [
  'moderate',
  'light',
  'moderate',
  'light',
  'moderate',
  'intense',
  'none',
];

function makeDay(i: number, date: ISODate, today: ISODate): DayEntry {
  const rng = mulberry32(DEMO_SEED + i * 7919);
  const prev = dayState(i - 1); // az előző nap étele → ez az éjszaka
  const cur = dayState(i);
  const wd = weekdayIndex(date);
  const weekend = isWeekend(date);
  const partner = rng() < 0.35;
  const n = prev.night;
  const home = weekend ? 1 : 0;
  const isFirst = i === 0;
  // Az első reggel még a diéta előtti éjszaka (0. alvás-hét).
  const night = isFirst ? { quality: 5, sleep: 0, awake: 0, deep: 0, rem: 0, hrv: 0, rhr: 0 } : n;

  const entry: DayEntry = {
    date,
    location: weekend ? 'home_sk' : i === 31 ? 'other' : 'budapest',
    partnerStayed: partner,
    sleepQuality: scale(night.quality - (partner ? 0.3 : 0) - home * 0.2, rng, 0.6, 1, 10),
    sleepMin: Math.round(BASE.sleepMin.mean + night.sleep - home * 6 + gaussian(rng) * 24),
    awakeMin: Math.max(
      2,
      Math.round(
        BASE.awakeMin.mean + night.awake + home * 6 + (partner ? 3 : 0) + gaussian(rng) * 5,
      ),
    ),
    deepMin: Math.max(10, Math.round(BASE.deepMin.mean + night.deep + gaussian(rng) * 6)),
    remMin: Math.max(30, Math.round(BASE.remMin.mean + night.rem + gaussian(rng) * 11)),
    hrvNight: r1(BASE.hrv.mean + night.hrv - home * 6 + gaussian(rng) * 7),
    rhrNight: r1(
      BASE.rhr.mean + night.rhr + home * 1.5 + (partner ? 0.5 : 0) + gaussian(rng) * 1.2,
    ),
    morningDoneAt: `${date}T07:${String(10 + Math.floor(rng() * 40)).padStart(2, '0')}:00`,
    deviceSource: rng() < 0.3 ? 'shortcut' : 'manual',
    updatedAt: `${date}T07:30:00`,
  };

  if (date === today) return entry; // a mai esti check-in még hátravan

  const bloating = scale(cur.bloating, rng, 0.6, 0, 10);
  const stress = scale(3 + (wd === 0 ? 1 : 0) - (weekend ? 1 : 0), rng, 1.1, 0, 10);
  const exercise = rng() < 0.15 ? 'none' : EXERCISE_BY_WEEKDAY[wd]!;
  const slip = rng() < 0.05 && cur.alcohol === 0;
  const tags = [...cur.tags];
  if (exercise === 'intense') tags.push('edzés');
  if (stress >= 6) tags.push('stresszes nap');
  Object.assign(entry, {
    nose: scale(cur.nose, rng, 0.6, 0, 10),
    fatigue: scale(cur.fatigue, rng, 0.6, 0, 10),
    postMealFatigue: scale(cur.pmf, rng, 0.6, 0, 10),
    bloating,
    ...(bloating >= 3 ? { bloatingWhen: cur.bloatingWhen ?? 'dinner' } : {}),
    diet: slip ? 'partial' : 'yes',
    ...(slip ? { dietSlip: ['étterem'], dietSlipNote: 'Ebéd munkahelyi menzán' } : {}),
    caffeine: rng() < 0.15 ? 2 : 1,
    alcohol: cur.alcohol,
    exercise,
    stress,
    ...(rng() < 0.7
      ? {
          rhrDay: r1(BASE.rhrDay.mean + n.rhr * 0.8 + gaussian(rng) * 2),
          hrvDay: r1(BASE.hrvDay.mean + n.hrv * 0.7 + gaussian(rng) * 5),
        }
      : {}),
    ...(tags.length ? { tags } : {}),
    ...(cur.note ? { note: cur.note } : {}),
    eveningDoneAt: `${date}T21:${String(5 + Math.floor(rng() * 50)).padStart(2, '0')}:00`,
    updatedAt: `${date}T21:30:00`,
  });
  return entry;
}

function demoBaseline(start: ISODate): { nights: BaselineNight[]; days: BaselineDay[] } {
  const rng = mulberry32(DEMO_SEED - 1);
  const nights: BaselineNight[] = [];
  for (let i = 30; i >= 1; i--) {
    const date = addDays(start, -i);
    const home = isWeekend(date) ? 1 : 0;
    const awake = Math.max(4, Math.round(BASE.awakeMin.mean + home * 5 + gaussian(rng) * 7));
    const deep = Math.max(12, Math.round(BASE.deepMin.mean + gaussian(rng) * BASE.deepMin.sd));
    const rem = Math.max(40, Math.round(BASE.remMin.mean + gaussian(rng) * BASE.remMin.sd));
    const sleep = Math.round(BASE.sleepMin.mean + gaussian(rng) * BASE.sleepMin.sd);
    nights.push({
      date,
      sleepMin: sleep,
      awakeMin: awake,
      remMin: rem,
      deepMin: deep,
      coreMin: Math.max(0, sleep - awake - rem - deep),
      hrv: r1(BASE.hrv.mean - home * 4 + gaussian(rng) * BASE.hrv.sd),
      rhr: r1(BASE.rhr.mean + home * 1.5 + gaussian(rng) * BASE.rhr.sd),
      readinessSleepH: r1((sleep - awake) / 60),
    });
  }
  const days: BaselineDay[] = [];
  for (let i = 80; i >= 1; i--) {
    days.push({
      date: addDays(start, -i),
      rhrDay: r1(BASE.rhrDay.mean + gaussian(rng) * BASE.rhrDay.sd),
      hrvDay: r1(BASE.hrvDay.mean + gaussian(rng) * BASE.hrvDay.sd),
    });
  }
  return { nights, days };
}

const DEMO_RESULTS: Record<number, Pick<PlanWeek, 'result' | 'resultNote'> & Partial<PlanWeek>> = {
  1: {
    result: 'pass',
    resultNote: 'Az első napok nehezek voltak, utána egyre jobb. A puffadás gyorsan elmúlt.',
  },
  2: { result: 'pass', resultNote: 'Stabil javulás – ez lett a bázis.' },
  3: { result: 'reaction', resultNote: 'A 2. naptól eldugult orr, rosszabb alvás. A tej kikerül.' },
  4: {
    food: '+ tojás (tej nélkül)',
    eat: 'Bázis + tojás, tej nélkül',
    result: 'pass',
    resultNote:
      'Az első két nap még a tej utóhatása, utána rendben. A szombati sör miatti rossz éjszaka nem a tojás.',
  },
  5: { result: 'reaction', resultNote: 'Erős puffadás és evés utáni fáradtság. A búza kikerül.' },
  6: {
    food: '+ fűszerek (búza nélkül)',
    result: 'unsure',
    resultNote: 'Csak a hagymás napokon puffadtam – a hagymát külön kell tesztelni.',
  },
  7: { result: 'pass', resultNote: 'Délutánonként enyhe energiaesés, de belefér.' },
  8: { result: 'pass', resultNote: 'Rendben.' },
  9: {
    food: 'hagyma + fokhagyma külön',
    eat: 'Bázis + ami átment + hagyma és fokhagyma (más fűszer nélkül)',
    tip: 'Ha visszajön a puffadás, a kettőt külön is érdemes megnézni',
    kind: 'test',
  },
};

export function generateDemo(today: ISODate): AppData {
  const start = demoStartFor(today);
  const total = diffDays(start, today);
  const days: DayEntry[] = [];
  for (let i = 0; i <= total; i++) days.push(makeDay(i, addDays(start, i), today));

  const plan: PlanWeek[] = DEFAULT_PLAN.map((w) => {
    const extra = DEMO_RESULTS[w.week] ?? {};
    const closed = extra.result ? `${addDays(start, w.week * 7 - 1)}T21:40:00` : undefined;
    return { ...w, ...extra, ...(closed ? { closedAt: closed } : {}) };
  });

  const settings: Settings = {
    startDate: start,
    subjectiveBaseline: { sleepQuality: 5, nose: 7, fatigue: 6, postMealFatigue: 7, bloating: 5 },
    reminders: { morning: '07:30', evening: '21:30' },
    theme: 'system',
    demo: true,
    schemaVersion: 2,
    onboardedAt: `${addDays(start, -3)}T20:00:00`,
    customTags: ['családi ebéd'],
  };
  const { nights, days: baselineDays } = demoBaseline(start);
  return { settings, plan, days, baselineNights: nights, baselineDays };
}
