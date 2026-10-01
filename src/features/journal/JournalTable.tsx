// Excel-szerű táblázat: soronként egy nap, ugyanazokkal az oszlopokkal és színekkel, mint az
// Excel Napló lapja. Cellánként szerkeszthető; nyilakkal és Tabbal bejárható; a fejléc és a
// dátumoszlop rögzített. Enter/F2 vagy gépelés: szerkesztés; Enter: mentés és le; Esc: mégse;
// Delete: a cella törlése.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRepo } from '@/data/context';
import type { DayPatch } from '@/data/repository';
import type { Baseline } from '@/domain/baseline';
import { hasAnyData, type EntryMap } from '@/domain/entries';
import { nightLabel } from '@/domain/nightScore';
import { displayCell, JOURNAL_COLUMNS, type JournalColumn } from '@/domain/io/journalColumns';
import { METRICS, WATCH_METRICS, type NumericMetric } from '@/domain/metrics';
import type { DayEntry, ISODate } from '@/domain/types';
import { cn } from '@/lib/cn';
import { cellFill, zFill } from './heat';

const STICKY = ['week', 'date', 'weekday'];
const STICKY_W: Record<string, number> = { week: 48, date: 104, weekday: 48 };
const stickyLeft = (id: string) => {
  let left = 0;
  for (const s of STICKY) {
    if (s === id) return left;
    left += STICKY_W[s]!;
  }
  return 0;
};

function isNumericMetric(field: keyof DayEntry | undefined): field is NumericMetric {
  return !!field && field in METRICS;
}

function editText(col: JournalColumn, e: DayEntry | undefined): string {
  if (!e || !col.field) return '';
  const v = col.value(e, { start: '', baseline: {} });
  return displayCell(col, v);
}

export function JournalTable({
  dates,
  entries,
  baseline,
  start,
  today,
  onOpenDay,
}: {
  dates: ISODate[];
  entries: EntryMap;
  baseline: Baseline;
  start: ISODate;
  today: ISODate;
  onOpenDay: (d: ISODate) => void;
}) {
  const { repo } = useRepo();
  const cols = JOURNAL_COLUMNS;
  const ctx = { start, baseline };
  const [active, setActive] = useState<{ r: number; c: number }>(() => ({
    r: Math.max(0, dates.indexOf(today)),
    c: cols.findIndex((c) => c.id === 'sleepQuality'),
  }));
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const cells = useRef(new Map<string, HTMLTableCellElement>());
  const scroller = useRef<HTMLDivElement>(null);

  const keyOf = (r: number, c: number) => `${r}:${c}`;

  useEffect(() => {
    if (editing !== null) return;
    cells.current.get(keyOf(active.r, active.c))?.focus({ preventScroll: true });
    cells.current
      .get(keyOf(active.r, active.c))
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, editing]);

  useEffect(() => {
    // Nyitáskor a mai sorhoz görget – csak a táblázat saját görgetőjében.
    const i = dates.indexOf(today);
    const cell = i >= 0 ? cells.current.get(keyOf(i, 1)) : undefined;
    const box = scroller.current;
    if (cell && box) box.scrollTop = Math.max(0, cell.offsetTop - box.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (dr: number, dc: number) => {
    setActive(({ r, c }) => {
      let nr = r + dr;
      let nc = c + dc;
      if (nc >= cols.length) {
        nc = 0;
        nr++;
      } else if (nc < 0) {
        nc = cols.length - 1;
        nr--;
      }
      return {
        r: Math.max(0, Math.min(dates.length - 1, nr)),
        c: Math.max(0, Math.min(cols.length - 1, nc)),
      };
    });
  };

  const write = (date: ISODate, col: JournalColumn, patch: DayPatch) => {
    const isWatch = WATCH_METRICS.includes(col.field as (typeof WATCH_METRICS)[number]);
    void repo.patchDay(date, isWatch ? { ...patch, deviceSource: 'manual' } : patch);
  };

  const commit = (text: string): boolean => {
    const col = cols[active.c]!;
    const date = dates[active.r]!;
    if (!col.field || !col.parse) return true;
    if (text.trim() === '') {
      write(date, col, {
        [col.field]: undefined,
        ...(col.field === 'dietSlip' ? { dietSlipNote: undefined } : {}),
      });
      return true;
    }
    const parsed = col.parse(text);
    if (!Object.keys(parsed).length) return false;
    write(date, col, parsed as DayPatch);
    return true;
  };

  const startEdit = (initial?: string) => {
    const col = cols[active.c]!;
    const date = dates[active.r]!;
    if (!col.field || date > today) return;
    setError(false);
    setEditing(initial ?? editText(col, entries.get(date)));
  };

  const onGridKey = (e: KeyboardEvent) => {
    if (editing !== null) return;
    const col = cols[active.c]!;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        return move(1, 0);
      case 'ArrowUp':
        e.preventDefault();
        return move(-1, 0);
      case 'ArrowRight':
        e.preventDefault();
        return move(0, 1);
      case 'ArrowLeft':
        e.preventDefault();
        return move(0, -1);
      case 'Tab':
        e.preventDefault();
        return move(0, e.shiftKey ? -1 : 1);
      case 'Home':
        e.preventDefault();
        return setActive((a) => ({ r: e.ctrlKey || e.metaKey ? 0 : a.r, c: 0 }));
      case 'End':
        e.preventDefault();
        return setActive((a) => ({
          r: e.ctrlKey || e.metaKey ? dates.length - 1 : a.r,
          c: cols.length - 1,
        }));
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (col.id === 'date' || col.id === 'weekday') return onOpenDay(dates[active.r]!);
        return startEdit();
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (col.field && dates[active.r]! <= today) commit('');
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && col.field) {
          e.preventDefault();
          startEdit(e.key);
        }
    }
  };

  return (
    <div
      ref={scroller}
      className="card relative max-h-[calc(100dvh-210px)] overflow-auto p-0"
      role="region"
      aria-label="Napló táblázat"
    >
      <table
        role="grid"
        aria-rowcount={dates.length + 1}
        className="border-separate border-spacing-0 text-[13px]"
        onKeyDown={onGridKey}
      >
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.id}
                scope="col"
                style={{
                  minWidth: STICKY_W[c.id] ?? c.width * 8,
                  left: STICKY.includes(c.id) ? stickyLeft(c.id) : undefined,
                }}
                className={cn(
                  'sticky top-0 z-20 border-b border-line bg-surface-2 px-2 py-2 text-left align-bottom text-[11px] leading-tight font-semibold whitespace-pre-line text-muted',
                  STICKY.includes(c.id) && 'z-30',
                  c.id === 'weekday' && 'border-r',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d, r) => {
            const e = entries.get(d);
            const isToday = d === today;
            const future = d > today;
            const missed = !future && d < today && d >= start && !hasAnyData(e);
            return (
              <tr
                key={d}
                aria-rowindex={r + 2}
                className={cn(
                  isToday && '[&>td]:bg-[color-mix(in_oklab,var(--today)_55%,var(--surface))]',
                )}
              >
                {cols.map((col, c) => {
                  const k = keyOf(r, c);
                  const isActive = active.r === r && active.c === c;
                  const raw = e
                    ? col.value(e, ctx)
                    : col.id === 'date'
                      ? d
                      : col.id === 'week' || col.id === 'weekday'
                        ? col.value({ date: d, updatedAt: '' }, ctx)
                        : undefined;
                  let text = displayCell(col, raw);
                  let fill: string | undefined;
                  if (col.type === 'score' && typeof raw === 'number') {
                    const l = nightLabel(raw, 'day');
                    text = l ? `${l.symbol} ${l.text}` : text;
                    fill = zFill(raw);
                  } else if (isNumericMetric(col.field) && typeof raw === 'number') {
                    fill = cellFill(col.field, raw, baseline);
                  }
                  const sticky = STICKY.includes(col.id);
                  return (
                    <td
                      key={col.id}
                      ref={(el) => {
                        if (el) cells.current.set(k, el);
                        else cells.current.delete(k);
                      }}
                      role="gridcell"
                      tabIndex={isActive ? 0 : -1}
                      aria-selected={isActive}
                      aria-readonly={!col.field || future || undefined}
                      onClick={() => setActive({ r, c })}
                      onDoubleClick={() => (col.field ? startEdit() : onOpenDay(d))}
                      style={{
                        background: fill,
                        left: sticky ? stickyLeft(col.id) : undefined,
                        minWidth: STICKY_W[col.id] ?? col.width * 8,
                        maxWidth: col.width * 8 + 40,
                      }}
                      className={cn(
                        'relative h-9 border-b border-line px-2 whitespace-nowrap outline-none',
                        col.type === 'number' || col.type === 'duration' || col.type === 'score'
                          ? 'num text-right'
                          : 'truncate',
                        sticky && 'sticky z-10 bg-surface font-medium',
                        col.id === 'weekday' && 'border-r',
                        !fill && !sticky && 'bg-surface',
                        fill && 'text-scale-ink',
                        missed && sticky && 'text-muted italic',
                        future && 'text-muted',
                        isActive && 'z-[15] shadow-[inset_0_0_0_2px_var(--night)]',
                      )}
                    >
                      {isActive && editing !== null ? (
                        <input
                          autoFocus
                          value={editing}
                          aria-label={`${col.header.replace(/\n/g, ' ')} – ${d}`}
                          aria-invalid={error || undefined}
                          onChange={(ev) => {
                            setEditing(ev.target.value);
                            setError(false);
                          }}
                          onBlur={() => {
                            if (commit(editing)) setEditing(null);
                            else setEditing(null);
                          }}
                          onKeyDown={(ev) => {
                            ev.stopPropagation();
                            if (ev.key === 'Escape') {
                              ev.preventDefault();
                              setEditing(null);
                            } else if (ev.key === 'Enter' || ev.key === 'Tab') {
                              ev.preventDefault();
                              if (!commit(editing)) {
                                setError(true);
                                return;
                              }
                              setEditing(null);
                              if (ev.key === 'Enter') move(1, 0);
                              else move(0, ev.shiftKey ? -1 : 1);
                            }
                          }}
                          className={cn(
                            'absolute inset-0 w-full bg-surface px-2 text-[13px] outline-none',
                            error
                              ? 'shadow-[inset_0_0_0_2px_var(--bad)]'
                              : 'shadow-[inset_0_0_0_2px_var(--night)]',
                          )}
                        />
                      ) : col.id === 'date' ? (
                        <span title={d}>
                          {`${d.slice(5, 7)}.${d.slice(8)}.`}
                          {missed && (
                            <span className="ml-1.5 text-[11px] text-muted">kimaradt</span>
                          )}
                        </span>
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
