// Időrendi lista (legújabb felül): napkártyák dátummal, hét/étel chippel, kulcsmutatókkal és címkékkel.

import type { Baseline } from '@/domain/baseline';
import { DAY_Z, signedZ, toneOf } from '@/domain/deviation';
import { hasAnyData, type EntryMap } from '@/domain/entries';
import { capitalize, formatDateLong, formatDuration, formatNumber } from '@/domain/format';
import { nightLabel, nightScore } from '@/domain/nightScore';
import type { DayEntry, ISODate, PlanWeek } from '@/domain/types';
import { dietWeek } from '@/domain/weeks';
import { cn } from '@/lib/cn';
import { scaleFill, valueFill } from '@/components/scaleColor';
import { TONE_FILL } from '@/components/toneClasses';

function Chip({
  children,
  fill,
  className,
}: {
  children: React.ReactNode;
  fill?: string;
  className?: string;
}) {
  return (
    <span
      style={fill ? { background: fill } : undefined}
      className={cn(
        'num rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap',
        !fill && 'bg-surface-2',
        fill && 'text-scale-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}

function DayChips({ e, baseline }: { e: DayEntry; baseline: Baseline }) {
  const label = nightLabel(nightScore(e, baseline), 'day');
  const hrvTone = toneOf(signedZ('hrvNight', e.hrvNight, baseline.hrvNight), DAY_Z);
  return (
    <div className="flex flex-wrap gap-1">
      {label && (
        <Chip className={TONE_FILL[label.tone]}>
          {label.symbol} {label.text}
        </Chip>
      )}
      {e.sleepMin !== undefined && <Chip>{formatDuration(e.sleepMin)}</Chip>}
      {e.hrvNight !== undefined && (
        <Chip className={hrvTone && hrvTone !== 'neutral' ? TONE_FILL[hrvTone] : undefined}>
          HRV {formatNumber(e.hrvNight, 0)}
        </Chip>
      )}
      {e.sleepQuality !== undefined && (
        <Chip fill={valueFill(e.sleepQuality, 1, 10, true)}>alvás {e.sleepQuality}</Chip>
      )}
      {e.nose !== undefined && <Chip fill={scaleFill(e.nose)}>orr {e.nose}</Chip>}
      {e.bloating !== undefined && <Chip fill={scaleFill(e.bloating)}>puff. {e.bloating}</Chip>}
      {e.tags?.map((t) => (
        <Chip key={t} className="bg-transparent text-muted ring-1 ring-line">
          #{t}
        </Chip>
      ))}
    </div>
  );
}

export function DayList({
  dates,
  entries,
  baseline,
  start,
  plan,
  selected,
  onSelect,
}: {
  dates: ISODate[];
  entries: EntryMap;
  baseline: Baseline;
  start: ISODate;
  plan: readonly PlanWeek[];
  selected: ISODate;
  onSelect: (d: ISODate) => void;
}) {
  return (
    <ol className="flex flex-col gap-2" aria-label="Napok időrendben">
      {dates.map((d) => {
        const e = entries.get(d);
        const filled = hasAnyData(e);
        const w = dietWeek(d, start);
        const pw = plan.find((p) => p.week === w);
        return (
          <li key={d}>
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-current={d === selected ? 'true' : undefined}
              className={cn(
                'flex w-full flex-col gap-2 rounded-2xl px-4 py-3 text-left transition-colors',
                filled
                  ? 'bg-surface ring-1 ring-[var(--card-border)] hover:bg-surface-2'
                  : 'border border-dashed border-line hover:bg-surface-2',
                d === selected && 'ring-2 ring-ink',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{capitalize(formatDateLong(d))}</span>
                {pw && (
                  <span className="truncate rounded-full bg-[color-mix(in_oklab,var(--plan)_14%,var(--surface))] px-2 py-0.5 text-[11px] font-semibold text-plan-ink">
                    {w}. hét · {pw.food.replace(/^\+\s*/, '')}
                  </span>
                )}
              </div>
              {filled && e ? (
                <DayChips e={e} baseline={baseline} />
              ) : (
                <span className="text-[13px] text-muted">Kimaradt – kattints a pótláshoz</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
