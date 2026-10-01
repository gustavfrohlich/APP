// Összegzés: lezárható hetek, főbb megfigyelések az orvosi összefoglalóhoz és az Elemzéshez.

import type { Baseline } from './baseline';
import type { Comparison } from './comparisons';
import { formatMetricDelta, formatNumber, formatSigned, joinHu } from './format';
import { kindOf } from './plan';
import { mean } from './stats';
import type { PlanWeek, SubjectiveBaseline } from './types';
import { RESULT_LABELS } from './verdict';
import type { WeekInfo } from './weeks';
import { WORSEN_LABELS, type WeekSummary } from './weekly';

/**
 * Lezárható hetek: amelyik már véget ért, vagy ma van a vasárnapja, és még nincs eredménye.
 * A legkorábbi van elöl.
 */
export function closableWeeks(plan: readonly PlanWeek[], info: WeekInfo): number[] {
  if (info.phase === 'before') return [];
  const last =
    info.phase === 'after' ? plan.length : info.dayInWeek === 7 ? info.week : info.week - 1;
  return plan.filter((w) => w.week <= last && !w.result).map((w) => w.week);
}

/** A hét lezárható-e már (vasárnaptól). */
export function canCloseWeek(week: number, info: WeekInfo): boolean {
  if (info.phase === 'before') return false;
  if (info.phase === 'after') return true;
  return week < info.week || (week === info.week && info.dayInWeek === 7);
}

/** Az utolsó „átment” hét a megadott előtt (reakció utáni összevetéshez). */
export function lastPassedWeekBefore(plan: readonly PlanWeek[], week: number): number | undefined {
  return [...plan]
    .filter((w) => w.week < week && w.result === 'pass')
    .sort((a, b) => b.week - a.week)[0]?.week;
}

export interface Observation {
  tone: 'good' | 'bad' | 'neutral';
  text: string;
}

export function observations(input: {
  summaries: readonly WeekSummary[];
  plan: readonly PlanWeek[];
  comparisons: readonly Comparison[];
  subjective: SubjectiveBaseline;
  baseline: Baseline;
}): Observation[] {
  const { summaries, plan, comparisons, subjective, baseline } = input;
  const out: Observation[] = [];

  for (const w of plan) {
    if (w.result !== 'reaction' && w.result !== 'unsure') continue;
    const s = summaries.find((x) => x.week === w.week);
    const worse = s?.comparison.worsened.map((k) => WORSEN_LABELS[k]) ?? [];
    const food = w.food.replace(/^\+\s*/, '');
    out.push({
      tone: w.result === 'reaction' ? 'bad' : 'neutral',
      text:
        `${w.week}. hét (${food}): ${RESULT_LABELS[w.result].toLowerCase()}` +
        (worse.length ? ` – romlott: ${joinHu(worse)}.` : '.') +
        (w.resultNote ? ` ${w.resultNote}` : ''),
    });
  }

  const passed = plan.filter((w) => w.result === 'pass' && kindOf(w) !== 'washout');
  if (passed.length) {
    out.push({
      tone: 'good',
      text: `Átment: ${joinHu(passed.map((w) => w.food.replace(/^\+\s*/, '')))}.`,
    });
  }

  const withData = summaries.filter((s) => s.filledDays > 0);
  const sq = mean(withData.map((s) => s.sleepQuality));
  if (sq !== undefined && subjective.sleepQuality !== undefined) {
    const d = sq - subjective.sleepQuality;
    out.push({
      tone: d >= 1 ? 'good' : d <= -1 ? 'bad' : 'neutral',
      text: `Alvásminőség a kísérlet alatt átlagosan ${formatNumber(sq, 1)} (a kiinduló becslés ${formatNumber(subjective.sleepQuality, 0)}, ${formatSigned(d, 1)}).`,
    });
  }
  const hrv = mean(withData.map((s) => s.watch.hrvNight));
  if (hrv !== undefined && baseline.hrvNight) {
    const d = hrv - baseline.hrvNight.mean;
    out.push({
      tone: d > 0 ? 'good' : 'neutral',
      text: `Éjszakai HRV átlagosan ${formatNumber(hrv, 1)} ms (baseline ${formatNumber(baseline.hrvNight.mean, 1)} ms, ${formatMetricDelta('hrvNight', d)}).`,
    });
  }

  const scored = withData.filter((s) => s.nightScore !== undefined);
  if (scored.length >= 2) {
    const best = scored.reduce((a, b) => (b.nightScore! > a.nightScore! ? b : a));
    const worst = scored.reduce((a, b) => (b.nightScore! < a.nightScore! ? b : a));
    out.push({
      tone: 'neutral',
      text: `Legjobb éjszakák: ${best.week}. hét (összkép ${formatSigned(best.nightScore, 2)}); legrosszabbak: ${worst.week}. hét (${formatSigned(worst.nightScore, 2)}).`,
    });
  }

  for (const c of comparisons) {
    if (!c.enough) continue;
    const d = c.diffs.nightScore;
    if (d === undefined || Math.abs(d) < 0.25) continue;
    out.push({
      tone: 'neutral',
      text: `${c.title}: ${d > 0 ? c.a.label.toLowerCase() : c.b.label.toLowerCase()} jobbak az éjszakák (összkép-különbség ${formatSigned(Math.abs(d), 2)}; ${c.a.n} vs. ${c.b.n} éjszaka).`,
    });
  }
  return out;
}
