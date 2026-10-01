// Havi naptár-hőtérkép: minden napon két félpont (reggel/este), a cella színe a választott mutató
// szerint. A hetek sora mellett a hét száma és az étel chipje.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Baseline } from '@/domain/baseline';
import { addDays, mondayOf } from '@/domain/dates';
import { checkinState, hasAnyData, type EntryMap } from '@/domain/entries';
import { formatDateLong, formatMonth, formatNumber, WEEKDAY_SHORT } from '@/domain/format';
import type { ISODate, PlanWeek } from '@/domain/types';
import { dietWeek } from '@/domain/weeks';
import { cn } from '@/lib/cn';
import { HalfDot } from '@/components/HalfDot';
import { heatFill, heatValue, HEAT_METRICS, type HeatMetric } from './heat';

function monthStart(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

function shiftMonth(iso: ISODate, delta: number): ISODate {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function CalendarHeatmap({
  month,
  onMonth,
  selected,
  onSelect,
  metric,
  onMetric,
  entries,
  baseline,
  start,
  plan,
  today,
}: {
  month: ISODate;
  onMonth: (m: ISODate) => void;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
  metric: HeatMetric;
  onMetric: (m: HeatMetric) => void;
  entries: EntryMap;
  baseline: Baseline;
  start: ISODate;
  plan: readonly PlanWeek[];
  today: ISODate;
}) {
  const first = monthStart(month);
  const gridStart = mondayOf(first);
  const nextMonth = shiftMonth(first, 1);
  const weeks: ISODate[][] = [];
  for (let d = gridStart; d < nextMonth; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonth(shiftMonth(first, -1))}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Előző hónap"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 className="min-w-40 text-center font-serif text-xl font-semibold">
            {formatMonth(first)}
          </h2>
          <button
            type="button"
            onClick={() => onMonth(shiftMonth(first, 1))}
            disabled={nextMonth > today}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            aria-label="Következő hónap"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Szín:
          <select
            value={metric}
            onChange={(e) => onMetric(e.target.value as HeatMetric)}
            className="input h-9 w-auto py-0 pr-8 text-[14px]"
          >
            {HEAT_METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table
        className="w-full table-fixed border-separate border-spacing-1"
        role="grid"
        aria-label="Havi naptár"
      >
        <thead>
          <tr>
            <th className="w-[84px] text-left text-[11px] font-semibold tracking-wider text-muted uppercase">
              Hét
            </th>
            {WEEKDAY_SHORT.map((d) => (
              <th key={d} className="text-[12px] font-semibold text-muted">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((days) => {
            const w = dietWeek(days[0]!, start);
            const pw = plan.find((p) => p.week === w);
            return (
              <tr key={days[0]}>
                <th scope="row" className="pr-1 text-left align-middle">
                  {pw ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-semibold">{w}. hét</span>
                      <span
                        className="truncate rounded-full bg-[color-mix(in_oklab,var(--plan)_14%,var(--surface))] px-1.5 py-0.5 text-[11px] font-medium text-plan-ink"
                        title={pw.food}
                      >
                        {pw.food.replace(/^\+\s*/, '')}
                      </span>
                    </div>
                  ) : null}
                </th>
                {days.map((d) => {
                  const e = entries.get(d);
                  const inMonth = d >= first && d < nextMonth;
                  const future = d > today;
                  const missed = !future && d < today && d >= start && !hasAnyData(e);
                  const v = heatValue(e, metric, baseline);
                  const fill = heatFill(metric, v);
                  const isSel = d === selected;
                  return (
                    <td key={d} className="p-0">
                      <button
                        type="button"
                        disabled={future}
                        onClick={() => onSelect(d)}
                        aria-pressed={isSel}
                        aria-label={`${formatDateLong(d)}${v !== undefined ? `, ${formatNumber(v, metric === 'nightScore' ? 2 : 1)}` : ''}${missed ? ', kimaradt' : ''}`}
                        style={{ background: fill }}
                        className={cn(
                          'relative flex aspect-square w-full flex-col justify-between rounded-xl p-1.5 text-left transition-[box-shadow,transform]',
                          !fill && 'bg-surface-2/60',
                          !inMonth && 'opacity-40',
                          future && 'cursor-default opacity-30',
                          missed && 'border-[1.5px] border-dashed border-muted/60 bg-transparent',
                          d === today &&
                            'ring-2 ring-[color-mix(in_oklab,var(--amber)_70%,var(--today))]',
                          isSel && 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]',
                          !future && 'hover:scale-[1.04]',
                        )}
                      >
                        <span className="num text-[12px] font-semibold text-scale-ink">
                          {Number(d.slice(8))}
                        </span>
                        {!future && (
                          <span className="self-end">
                            <HalfDot
                              morning={checkinState(e, 'morning')}
                              evening={checkinState(e, 'evening')}
                              size={14}
                            />
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <HeatLegend metric={metric} />
    </div>
  );
}

function HeatLegend({ metric }: { metric: HeatMetric }) {
  if (metric === 'nightScore') {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-good-fill" /> ▲ jobb
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-surface-2" /> ● átlagos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-bad-fill" /> ▼ rosszabb
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-dashed border-muted" /> kimaradt
        </span>
      </div>
    );
  }
  const reversed = metric === 'sleepQuality';
  return (
    <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
      <span>{reversed ? '1' : '0'}</span>
      <span
        className="h-2.5 w-40 rounded-full"
        style={{
          background: reversed
            ? 'linear-gradient(90deg, var(--scale-10), var(--scale-5), var(--scale-0))'
            : 'linear-gradient(90deg, var(--scale-0), var(--scale-5), var(--scale-10))',
        }}
      />
      <span>10</span>
      <span className="ml-2">{reversed ? 'magasabb = jobb' : 'magasabb = rosszabb'}</span>
    </div>
  );
}
