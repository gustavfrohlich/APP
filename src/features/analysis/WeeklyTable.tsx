// Heti összesítő – mint az Excel Áttekintés lapja. Keskeny ablakban hetenkénti kártyák.
// A színezett cella mindig szimbólumot is kap (▲ / ▼), a szín sosem egyedül.

import type { Baseline } from '@/domain/baseline';
import type { Tone } from '@/domain/deviation';
import type { PlanWeek, SubjectiveBaseline } from '@/domain/types';
import { WEEK_COLS } from './weekCols';
import { resultText } from '@/domain/verdict';
import { WORSEN_LABELS, type WeekSummary } from '@/domain/weekly';
import { cn } from '@/lib/cn';
import { TONE_FILL } from '@/components/toneClasses';

const SYMBOL: Record<Tone, string> = { good: '▲', bad: '▼', neutral: '' };

function Cell({ text, tone }: { text: string; tone?: Tone }) {
  const colored = tone && tone !== 'neutral' && text;
  return (
    <td className={cn('num px-2 py-2 text-right whitespace-nowrap', colored && TONE_FILL[tone])}>
      {colored && (
        <span aria-hidden className="mr-1 text-[10px]">
          {SYMBOL[tone]}
        </span>
      )}
      {text}
      {colored && <span className="sr-only"> ({tone === 'good' ? 'jobb' : 'rosszabb'})</span>}
    </td>
  );
}

export function WorseningCell({ s }: { s: WeekSummary }) {
  const c = s.comparison;
  if (c.status === 'empty') return null;
  if (c.status === 'na') return <span className="text-muted">–</span>;
  if (!c.worsened.length) return <span className="font-medium text-good">✓ nincs</span>;
  return (
    <span className="font-medium text-bad">
      ▼ {c.worsened.map((k) => WORSEN_LABELS[k]).join(', ')}
    </span>
  );
}

export function ResultBadge({ w }: { w?: PlanWeek }) {
  if (!w?.result) return null;
  const cls =
    w.result === 'pass'
      ? 'bg-good-fill text-good'
      : w.result === 'reaction'
        ? 'bg-bad-fill text-bad'
        : 'bg-amber-fill text-amber';
  return (
    <span
      className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap', cls)}
    >
      {resultText(w.result)}
    </span>
  );
}

export function WeeklyTable({
  summaries,
  baseline,
  subjective,
  currentWeek,
  baseN,
}: {
  summaries: WeekSummary[];
  baseline: Baseline;
  subjective: SubjectiveBaseline;
  currentWeek: number;
  baseN: number;
}) {
  return (
    <div className="@container">
      <div className="hidden overflow-x-auto @4xl:block">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
              <th className="sticky left-0 bg-surface px-2.5 py-2">Hét</th>
              <th className="px-2.5 py-2">Étel</th>
              <th className="px-2.5 py-2 text-right">Napok</th>
              {WEEK_COLS.map((c) => (
                <th key={c.key} className="px-2.5 py-2 text-right leading-tight">
                  {c.label}
                </th>
              ))}
              <th className="sticky right-[112px] z-[1] w-[200px] min-w-[200px] border-l border-line bg-surface px-2.5 py-2">
                Romlás az előző héthez
              </th>
              <th className="sticky right-0 z-[1] w-[112px] min-w-[112px] bg-surface px-2.5 py-2">
                Eredmény
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-surface-2/70 text-muted">
              <th
                scope="row"
                className="sticky left-0 bg-surface-2 px-2.5 py-2 text-left font-semibold"
              >
                Baseline
              </th>
              <td className="px-2.5 py-2 italic">mostani étrend</td>
              <td className="num px-2.5 py-2 text-right">{baseN || '–'}</td>
              {WEEK_COLS.map((c) => (
                <td key={c.key} className="num px-2.5 py-2 text-right">
                  {c.base(baseline, subjective, baseN)}
                </td>
              ))}
              <td className="sticky right-[112px] z-[1] w-[200px] min-w-[200px] border-l border-line bg-surface-2 px-2.5 py-2" />
              <td className="sticky right-0 z-[1] w-[112px] min-w-[112px] bg-surface-2 px-2.5 py-2" />
            </tr>
            {summaries.map((s) => (
              <tr
                key={s.week}
                className={cn(
                  'border-t border-line [&>*]:border-t [&>*]:border-line',
                  s.week === currentWeek &&
                    '[&>*]:bg-[color-mix(in_oklab,var(--today)_45%,var(--surface))]',
                )}
              >
                <th
                  scope="row"
                  className="sticky left-0 bg-surface px-2.5 py-2 text-left font-semibold whitespace-nowrap"
                >
                  {s.week}. hét
                </th>
                <td className="max-w-[180px] truncate px-2.5 py-2" title={s.plan?.food}>
                  {s.plan?.food}
                </td>
                <td className="num px-2.5 py-2 text-right">{s.filledDays || '–'}</td>
                {WEEK_COLS.map((c) => (
                  <Cell key={c.key} text={c.value(s)} tone={c.tone ? s.tones[c.tone] : undefined} />
                ))}
                <td className="sticky right-[112px] z-[1] w-[200px] min-w-[200px] border-l border-line bg-surface px-2.5 py-2 text-[12.5px] leading-snug">
                  <WorseningCell s={s} />
                </td>
                <td className="sticky right-0 z-[1] w-[112px] min-w-[112px] bg-surface px-2.5 py-2">
                  <ResultBadge w={s.plan} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 @xl:grid-cols-2 @4xl:hidden">
        {summaries.map((s) => (
          <article
            key={s.week}
            className={cn(
              'rounded-2xl bg-surface-2/60 p-4',
              s.week === currentWeek && 'ring-2 ring-[var(--today)]',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">
                {s.week}. hét <span className="font-normal text-muted">· {s.plan?.food}</span>
              </h3>
              <ResultBadge w={s.plan} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
              {WEEK_COLS.filter((c) =>
                ['nightScore', 'sleepQuality', 'hrvNight', 'nose', 'fatigue', 'bloating'].includes(
                  c.key,
                ),
              ).map((c) => {
                const tone = c.tone ? s.tones[c.tone] : undefined;
                const text = c.value(s);
                return (
                  <div
                    key={c.key}
                    className={cn(
                      'rounded-lg px-2 py-1.5',
                      tone && tone !== 'neutral' && text ? TONE_FILL[tone] : 'bg-surface',
                    )}
                  >
                    <dt className="text-[11px] text-muted">{c.label}</dt>
                    <dd className="num font-semibold">
                      {tone && tone !== 'neutral' && text ? `${SYMBOL[tone]} ` : ''}
                      {text || '–'}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 text-[13px]">
              <WorseningCell s={s} />
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
