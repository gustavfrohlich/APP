// Azonnali, értelmes visszajelzés: következtetés nyers számok helyett.
// Pl. „Az éjszakád jobb volt az átlagnál, főleg a magasabb HRV (+12 ms) és a kevesebb ébrenlét miatt.”

import type { Baseline } from './baseline';
import { DAY_Z, type Tone } from './deviation';
import { article, formatMetricDelta, formatNumber, joinHu } from './format';
import { METRICS, SYMPTOM_METRICS, type SymptomMetric, type WatchMetric } from './metrics';
import { nightComponents, nightScore, nightTone, type NightComponent } from './nightScore';
import { mean } from './stats';
import type { DayEntry, SubjectiveBaseline } from './types';

const PHRASES: Record<WatchMetric, { up: string; down: string }> = {
  sleepMin: { up: 'hosszabb alvás', down: 'rövidebb alvás' },
  awakeMin: { up: 'több ébrenlét', down: 'kevesebb ébrenlét' },
  deepMin: { up: 'több mélyalvás', down: 'kevesebb mélyalvás' },
  remMin: { up: 'több REM', down: 'kevesebb REM' },
  hrvNight: { up: 'magasabb HRV', down: 'alacsonyabb HRV' },
  rhrNight: { up: 'magasabb pulzus', down: 'alacsonyabb pulzus' },
};

const CLAUSES: Record<WatchMetric, { up: string; down: string }> = {
  sleepMin: { up: 'tovább aludtál', down: 'rövidebben aludtál' },
  awakeMin: { up: 'többet voltál ébren', down: 'kevesebbet voltál ébren' },
  deepMin: { up: 'több volt a mélyalvás', down: 'kevesebb volt a mélyalvás' },
  remMin: { up: 'több volt a REM', down: 'kevesebb volt a REM' },
  hrvNight: { up: 'magasabb volt a HRV', down: 'alacsonyabb volt a HRV' },
  rhrNight: { up: 'magasabb volt a pulzus', down: 'alacsonyabb volt a pulzus' },
};

function clauseFor(c: Pick<NightComponent, 'metric' | 'delta'>): string {
  const p = c.delta >= 0 ? CLAUSES[c.metric].up : CLAUSES[c.metric].down;
  return `${p} (${formatMetricDelta(c.metric, c.delta)})`;
}

export function phraseFor(c: Pick<NightComponent, 'metric' | 'delta'>, withArticle = true): string {
  const p = c.delta >= 0 ? PHRASES[c.metric].up : PHRASES[c.metric].down;
  const text = `${p} (${formatMetricDelta(c.metric, c.delta)})`;
  return withArticle ? `${article(p)} ${text}` : text;
}

export interface NightExplanation {
  score?: number;
  tone?: Tone;
  headline: string;
  sentence: string;
  /** A két legnagyobb hatású mutató. */
  drivers: NightComponent[];
}

export function explainNight(entry: DayEntry | undefined, baseline: Baseline): NightExplanation {
  const comps = nightComponents(entry, baseline);
  const score = nightScore(entry, baseline);
  const tone = nightTone(score, 'day');
  if (score === undefined || !tone) {
    const hasBaseline = Object.keys(baseline).length > 0;
    return {
      headline: 'Még nincs összkép',
      sentence: hasBaseline
        ? 'Add meg az óra adatait, és megmutatom, milyen volt az éjszakád az átlagodhoz képest.'
        : 'Az összképhez baseline kell: importáld az óra korábbi exportját a Beállításokban.',
      drivers: [],
    };
  }
  const byImpact = [...comps].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  if (tone === 'good' || tone === 'bad') {
    const drivers = byImpact
      .filter((c) => (tone === 'good' ? c.z > 0 : c.z < 0) && Math.abs(c.z) >= 0.25)
      .slice(0, 2);
    const reason = drivers.length
      ? `, főleg ${joinHu(drivers.map((d) => phraseFor(d)))} miatt`
      : '';
    return {
      score,
      tone,
      headline: tone === 'good' ? 'Szép éjszaka volt!' : 'Nehezebb éjszaka volt',
      sentence: `Az éjszakád ${tone === 'good' ? 'jobb' : 'rosszabb'} volt az átlagnál${reason}.`,
      drivers,
    };
  }
  const pos = byImpact.find((c) => c.z >= DAY_Z);
  const neg = byImpact.find((c) => c.z <= -DAY_Z);
  let sentence = 'Átlagos éjszaka – minden mutató a szokásos sávban volt.';
  if (pos && neg) {
    sentence = `Átlagos éjszaka: ${clauseFor(pos)}, de ${clauseFor(neg)}.`;
  } else if (pos ?? neg) {
    sentence = `Átlagos éjszaka – ${clauseFor((pos ?? neg)!)}, a többi a szokásos.`;
  }
  return {
    score,
    tone,
    headline: 'Átlagos éjszaka',
    sentence,
    drivers: [pos, neg].filter((c): c is NightComponent => !!c),
  };
}

export interface DayExplanation {
  tone: Tone;
  headline: string;
  sentence: string;
  changes: { metric: SymptomMetric; value: number; reference: number; delta: number }[];
}

/**
 * Esti visszajelzés: a tünetek a saját becsléshez (ha nincs, az elmúlt 7 nap átlagához) mérve.
 * `recent` a megelőző napok bejegyzései.
 */
export function explainDay(
  entry: DayEntry,
  subjective: SubjectiveBaseline,
  recent: readonly DayEntry[],
  context?: { food?: string; dayInWeek?: number; isTestWeek?: boolean },
): DayExplanation {
  const changes: DayExplanation['changes'] = [];
  for (const m of SYMPTOM_METRICS) {
    const v = entry[m];
    if (v === undefined) continue;
    const ref = subjective[m] ?? mean(recent.map((e) => e[m]));
    if (ref === undefined) continue;
    changes.push({ metric: m, value: v, reference: ref, delta: v - ref });
  }
  const worse = changes.filter((c) => c.delta >= 2).sort((a, b) => b.delta - a.delta);
  const better = changes.filter((c) => c.delta <= -2).sort((a, b) => a.delta - b.delta);
  const name = (m: SymptomMetric) => METRICS[m].label.toLowerCase();
  const foodNote =
    context?.isTestWeek && context.food && context.dayInWeek
      ? ` Új étel: ${context.food.replace(/^\+\s*/, '')}, ${context.dayInWeek}. nap – figyeld, tart-e.`
      : '';

  if (worse.length) {
    const list = worse
      .slice(0, 2)
      .map(
        (c) =>
          `${name(c.metric)} (${formatNumber(c.value, 0)}, szokásosan ${formatNumber(c.reference, 1)})`,
      );
    return {
      tone: 'bad',
      headline: 'Ma több volt a tünet',
      sentence: `Magasabb volt: ${joinHu(list)}.${foodNote}`,
      changes,
    };
  }
  if (better.length) {
    const list = better.slice(0, 2).map((c) => name(c.metric));
    return {
      tone: 'good',
      headline: 'Jó nap volt!',
      sentence: `A szokásosnál jobb: ${joinHu(list)}.${changes.length > better.length ? ' A többi a megszokott szinten.' : ''}`,
      changes,
    };
  }
  return {
    tone: 'neutral',
    headline: 'Nyugodt nap',
    sentence: changes.length
      ? 'Minden tünet a megszokott szinten volt.'
      : 'Elmentve. Ha holnap is kitöltöd, már lesz mihez mérni.',
    changes,
  };
}
