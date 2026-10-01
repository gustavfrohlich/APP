// Hét csík: hét pont a hét napjaira, mindegyik két félkörrel (reggel, este), a mai kiemelve.

import { useNavigate } from 'react-router';
import { addDays, mondayOf } from '@/domain/dates';
import { checkinState, type EntryMap } from '@/domain/entries';
import { formatDateLong, WEEKDAY_SHORT } from '@/domain/format';
import type { ISODate } from '@/domain/types';
import { cn } from '@/lib/cn';
import { HalfDot } from '@/components/HalfDot';

const STATE_TEXT = { todo: 'nincs kitöltve', partial: 'félbehagyva', done: 'kész' };

export function WeekStrip({
  today,
  entries,
  start,
}: {
  today: ISODate;
  entries: EntryMap;
  start: ISODate;
}) {
  const navigate = useNavigate();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="A hét napjai">
      {days.map((d, i) => {
        const e = entries.get(d);
        const ms = checkinState(e, 'morning');
        const es = checkinState(e, 'evening');
        const isToday = d === today;
        const future = d > today;
        const missed = !future && !isToday && d >= start && !e;
        return (
          <li key={d}>
            <button
              type="button"
              disabled={future}
              onClick={() => navigate(`/naplo?nap=${d}`)}
              aria-label={`${formatDateLong(d)}: reggel ${STATE_TEXT[ms]}, este ${STATE_TEXT[es]}`}
              className={cn(
                'flex w-full flex-col items-center gap-1.5 rounded-xl py-2 transition-colors',
                isToday ? 'bg-today' : 'hover:bg-surface-2',
                future && 'cursor-default opacity-45 hover:bg-transparent',
              )}
            >
              <span
                className={cn('text-[12px] font-semibold', isToday ? 'text-ink' : 'text-muted')}
              >
                {WEEKDAY_SHORT[i]}
              </span>
              <HalfDot morning={ms} evening={es} missed={missed} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
