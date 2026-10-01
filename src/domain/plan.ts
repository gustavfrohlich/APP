// A 9 hetes alapterv, a szabályok, az engedélyezett ételek és a terv szerkesztése.

import type { PlanWeek, PlanWeekKind, WeekResult } from './types';

export const DEFAULT_PLAN: PlanWeek[] = [
  {
    week: 1,
    food: 'marha + rizs + áfonya',
    eat: 'Darált marha (csak hús, fűszer és adalék nélkül), fehér rizs, áfonya, só, víz.',
    tip: 'Főzz előre, porciózd és fagyaszd le – ne álljon napokig a hűtőben. Egyél eleget!',
    kind: 'base',
  },
  {
    week: 2,
    food: '+ édesburgonya, cukkini, körte, csirke',
    eat: 'Bázis + édesburgonya, cukkini, körte, csirke. Ez még bázisépítés, nem teszt.',
    tip: 'Ha valamelyiktől egyértelműen rosszabbul vagy, vedd ki.',
    kind: 'base',
  },
  { week: 3, food: '+ tej', eat: 'Bázis + tej.', tip: 'Sima tej, napi 2–3 dl.', kind: 'test' },
  {
    week: 4,
    food: '+ tojás',
    eat: 'Bázis + ami átment + tojás.',
    tip: 'Napi 2–3 tojás.',
    kind: 'test',
  },
  {
    week: 5,
    food: '+ búza',
    eat: 'Bázis + ami átment + búza.',
    tip: 'Sima tészta vagy egyszerű fehér kenyér, minél kevesebb összetevővel.',
    kind: 'test',
  },
  {
    week: 6,
    food: '+ fűszerek',
    eat: 'Bázis + ami átment + fűszerek.',
    tip: 'Pirospaprika, bors, hagyma, fokhagyma – amit tényleg használsz.',
    kind: 'test',
  },
  {
    week: 7,
    food: '+ cukor',
    eat: 'Bázis + ami átment + cukor.',
    tip: 'Sima cukor, nagyjából annyi, amennyit normálisan megeszel.',
    kind: 'test',
  },
  {
    week: 8,
    food: '+ majonézes szószok',
    eat: 'Bázis + ami átment + majonézes szószok.',
    tip: 'A szokásos márkád. A tojás ekkor már tesztelt, így ez a többi összetevőt méri.',
    kind: 'test',
  },
  {
    week: 9,
    food: 'tartalék hét',
    eat: 'Csak ha egy reakció miatt csúszik a terv, vagy valamit külön akarsz tesztelni (pl. hagyma külön).',
    tip: '–',
    kind: 'reserve',
  },
];

export const PLAN_RULES: string[] = [
  'Ami átment, marad az étrendben – így a 8. hétre már szinte normálisan eszel.',
  'Ha reakció van: vedd ki, és csak akkor jöhet a következő, ha visszaálltál az alapra. Erre van a 9. (tartalék) hét.',
  'Ha a fűszerhéten van reakció, a fűszereket később egyesével bontsd szét.',
  'Mindvégig: só és víz rendben · kávé vagy minden nap ugyanannyi, vagy semmi · alkohol semmi · egyél eleget, ez nem fogyókúra.',
  'Ha a 2. hét végére semmi nem javult a baseline-hoz képest, az étel valószínűleg nem a fő ok – ilyenkor az orvosi irány a fontosabb.',
  'Vasárnap este zárd le a hetet: nézd meg a „Romlás az előző héthez” sort, és rögzítsd az eredményt.',
];

/** Mindig engedélyezett alapok. */
export const ALWAYS_ALLOWED = ['só', 'víz'];

export function kindOf(w: PlanWeek): PlanWeekKind {
  if (w.kind) return w.kind;
  if (w.week <= 2) return 'base';
  return /tartalék/i.test(w.food) ? 'reserve' : 'test';
}

/** Az étel-szövegből chipek: „+ édesburgonya, cukkini” → [édesburgonya, cukkini]. */
export function planItems(food: string): string[] {
  const cleaned = food
    .replace(/\(.*?\)/g, '')
    .replace(/^\s*\+\s*/, '')
    .trim();
  if (!cleaned || /^tartalék( hét)?$/i.test(cleaned) || cleaned === '–') return [];
  return cleaned
    .split(/\s*[+,]\s*|\s+és\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface AllowedFood {
  name: string;
  week: number;
  isNew: boolean;
}

/**
 * A most engedélyezett ételek: a bázis (1–2. hét, hacsak nem okozott reakciót),
 * a korábbi hetek közül ami átment, és az aktuális hét új étele.
 */
export function allowedFoods(plan: readonly PlanWeek[], currentWeek: number): AllowedFood[] {
  const out: AllowedFood[] = ALWAYS_ALLOWED.map((name) => ({ name, week: 0, isNew: false }));
  const seen = new Set(out.map((f) => f.name));
  for (const w of [...plan].sort((a, b) => a.week - b.week)) {
    if (w.week > currentWeek) break;
    const kind = kindOf(w);
    const isCurrent = w.week === currentWeek;
    const keep =
      isCurrent ||
      (kind === 'base' && w.result !== 'reaction') ||
      ((kind === 'test' || kind === 'reserve') && w.result === 'pass');
    if (!keep || kind === 'washout') continue;
    for (const name of planItems(w.food)) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, week: w.week, isNew: isCurrent });
    }
  }
  return out;
}

/** „Ami eddig átment”: a lezárt, átment hetek ételei. */
export function passedFoods(
  plan: readonly PlanWeek[],
): { week: number; food: string; items: string[] }[] {
  return plan
    .filter((w) => w.result === 'pass')
    .sort((a, b) => a.week - b.week)
    .map((w) => ({ week: w.week, food: w.food, items: planItems(w.food) }));
}

export function resultCounts(plan: readonly PlanWeek[]): Record<WeekResult, number> {
  const out: Record<WeekResult, number> = { pass: 0, reaction: 0, unsure: 0 };
  for (const w of plan) if (w.result) out[w.result]++;
  return out;
}

function renumber(weeks: PlanWeek[]): PlanWeek[] {
  return weeks.map((w, i) => ({ ...w, week: i + 1 }));
}

export const WASHOUT_WEEK: Omit<PlanWeek, 'week'> = {
  food: 'visszaállás az alapra',
  eat: 'Csak a bázis és ami eddig átment',
  tip: 'Várd meg, amíg a tünetek visszaállnak, és csak utána jöjjön a következő étel',
  kind: 'washout',
};

/**
 * Csúsztatás egy héttel (reakció után): a `afterWeek` utáni hétre visszaállás kerül,
 * a későbbi ételek egy héttel később jönnek. Ha az utolsó hét még fel nem használt
 * tartalék, az elfogy; különben a terv egy héttel hosszabb lesz.
 */
export function shiftAfter(plan: readonly PlanWeek[], afterWeek: number): PlanWeek[] {
  const sorted = [...plan].sort((a, b) => a.week - b.week);
  const before = sorted.filter((w) => w.week <= afterWeek);
  let after = sorted.filter((w) => w.week > afterWeek);
  const last = after[after.length - 1];
  if (last && kindOf(last) === 'reserve' && !last.result) after = after.slice(0, -1);
  return renumber([...before, { ...WASHOUT_WEEK, week: 0 }, ...after]);
}

/** Jövőbeli hét áthelyezése (csak az aktuális utáni hetek között). */
export function moveWeek(
  plan: readonly PlanWeek[],
  from: number,
  to: number,
  currentWeek: number,
): PlanWeek[] {
  const sorted = [...plan].sort((a, b) => a.week - b.week);
  if (from <= currentWeek || to <= currentWeek) return sorted;
  if (from < 1 || to < 1 || from > sorted.length || to > sorted.length) return sorted;
  const items = [...sorted];
  const [moved] = items.splice(from - 1, 1);
  items.splice(to - 1, 0, moved!);
  return renumber(items);
}

export type WeekStatus = 'future' | 'current' | 'closed' | 'open';

export function weekStatus(w: PlanWeek, currentWeek: number): WeekStatus {
  if (w.result) return 'closed';
  if (w.week === currentWeek) return 'current';
  return w.week > currentWeek ? 'future' : 'open';
}
