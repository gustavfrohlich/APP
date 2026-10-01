// Közös grafikon-eszközök: szélességmérés, tooltip, útvonal-építők, hét-sávok.
// Stílus: kevés rácsvonal (tömör hajszál), lekerekített oszlopvégek, 2 px vonalak.

import type { ReactNode } from 'react';
import type { WeekBand } from './chartUtils';

export interface TooltipRow {
  key: string;
  value: ReactNode;
  label: ReactNode;
  color?: string;
}

/** Tooltip: az érték az erős elem, a név másodlagos; sorkulcs vonallal. */
export function ChartTooltip({
  x,
  y,
  width,
  title,
  rows,
}: {
  x: number;
  y: number;
  width: number;
  title: ReactNode;
  rows: TooltipRow[];
}) {
  const left = Math.min(Math.max(8, x + 14), Math.max(8, width - 220));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[208px] rounded-xl bg-surface px-3 py-2.5 text-[12px] shadow-[var(--shadow-lg)] ring-1 ring-line"
      style={{ left, top: Math.max(0, y) }}
    >
      <div className="mb-1.5 font-medium text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-2 py-0.5">
          {r.color && (
            <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: r.color }} />
          )}
          <span className="num text-[14px] font-semibold text-ink">{r.value}</span>
          <span className="truncate text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BandLayer({
  bands,
  height,
  top = 0,
}: {
  bands: WeekBand[];
  height: number;
  top?: number;
}) {
  return (
    <g aria-hidden>
      {bands.map((b, i) => (
        <g key={`${b.week}-${b.from}`}>
          {i % 2 === 0 && b.week >= 1 && (
            <rect
              x={b.from}
              y={top}
              width={b.to - b.from}
              height={height}
              fill="var(--surface-2)"
              opacity={0.75}
            />
          )}
          {b.week >= 1 && b.to - b.from > 30 && (
            <text
              x={b.from + 6}
              y={top + 14}
              fontSize={11}
              fill="var(--muted)"
              className="font-medium"
            >
              {truncate(b.label, Math.floor((b.to - b.from - 10) / 6))}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, Math.max(1, n - 1))}…`;
}
