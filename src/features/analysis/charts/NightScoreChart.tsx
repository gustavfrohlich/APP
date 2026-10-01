// Napi éjszaka-összkép oszlopok a nullvonal körül (zöld felfelé, piros lefelé), az alvás-hetek
// sávozva és az étellel feliratozva. Kattintásra (vagy Enterre) a nap részletei.

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { scaleBand, scaleLinear } from '@visx/scale';
import type { Baseline } from '@/domain/baseline';
import { addDays, eachDay } from '@/domain/dates';
import type { EntryMap } from '@/domain/entries';
import { capitalize, formatDateLong, formatSigned } from '@/domain/format';
import { nightLabel, nightScore } from '@/domain/nightScore';
import type { ISODate, PlanWeek } from '@/domain/types';
import { sleepWeek } from '@/domain/weeks';
import { BandLayer, ChartTooltip } from './chartKit';
import { barPath, useWidth, weekBands } from './chartUtils';

const H = 260;
const M = { top: 26, right: 12, bottom: 26, left: 36 };

export function NightScoreChart({
  entries,
  baseline,
  start,
  today,
  plan,
}: {
  entries: EntryMap;
  baseline: Baseline;
  start: ISODate;
  today: ISODate;
  plan: readonly PlanWeek[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const navigate = useNavigate();
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    const first = addDays(start, 1);
    if (first > today) return [];
    return eachDay(first, today).map((d) => ({ date: d, v: nightScore(entries.get(d), baseline) }));
  }, [entries, baseline, start, today]);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const x = scaleBand<string>({
    domain: data.map((d) => d.date),
    range: [0, innerW],
    paddingInner: 0.28,
    paddingOuter: 0.1,
  });
  const maxAbs = Math.max(1.5, ...data.map((d) => Math.abs(d.v ?? 0)));
  const y = scaleLinear<number>({ domain: [-maxAbs, maxAbs], range: [innerH, 0], nice: true });
  const bw = Math.min(24, x.bandwidth());
  const step = x.step();
  const bands = weekBands(
    data.map((d) => d.date),
    (d) => sleepWeek(d, start),
    plan,
    (i) => (x(data[i]!.date) ?? 0) - (step - x.bandwidth()) / 2,
    step,
  );
  const ticks = y.ticks(5);

  const onKey = (e: KeyboardEvent) => {
    if (!data.length) return;
    const cur = hover ?? data.length - 1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHover(Math.max(0, cur - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHover(Math.min(data.length - 1, cur + 1));
    } else if (e.key === 'Enter' && hover !== null) {
      navigate(`/naplo?nap=${data[hover]!.date}`);
    } else if (e.key === 'Escape') setHover(null);
  };

  const h = hover !== null ? data[hover] : undefined;
  const hl = h ? nightLabel(h.v, 'day') : undefined;

  return (
    <div ref={ref} className="relative">
      {width > 0 && data.length > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label="Napi éjszaka-összkép oszlopdiagram. Nyilakkal léptethető, Enter: a nap megnyitása."
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => hover === null && setHover(data.length - 1)}
          onBlur={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
          className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-night"
        >
          <g transform={`translate(${M.left},${M.top})`}>
            <BandLayer bands={bands} height={innerH + M.top} top={-M.top} />
            <rect
              x={0}
              y={y(0.5)}
              width={innerW}
              height={y(-0.5) - y(0.5)}
              fill="var(--line)"
              opacity={0.35}
            />
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--line)"
                  strokeWidth={t === 0 ? 1.5 : 1}
                />
                <text
                  x={-8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--muted)"
                  className="num"
                >
                  {formatSigned(t, 1)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              if (d.v === undefined) return null;
              const bx = (x(d.date) ?? 0) + (x.bandwidth() - bw) / 2;
              const strong = Math.abs(d.v) >= 0.5;
              const color = d.v >= 0 ? 'var(--good)' : 'var(--bad)';
              return (
                <path
                  key={d.date}
                  d={barPath(bx, bw, y(0), y(d.v))}
                  fill={color}
                  opacity={
                    hover === null || hover === i ? (strong ? 1 : 0.45) : strong ? 0.55 : 0.25
                  }
                />
              );
            })}
            {/* Találati sávok: a teljes oszlopszélesség, nem csak a festett pixel. */}
            {data.map((d, i) => (
              <rect
                key={`hit-${d.date}`}
                x={(x(d.date) ?? 0) - (step - x.bandwidth()) / 2}
                y={0}
                width={step}
                height={innerH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onClick={() => navigate(`/naplo?nap=${d.date}`)}
                style={{ cursor: 'pointer' }}
              />
            ))}
            {data.length > 0 &&
              [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
                <text
                  key={i}
                  x={(x(data[i]!.date) ?? 0) + x.bandwidth() / 2}
                  y={innerH + 18}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                  fontSize={11}
                  fill="var(--muted)"
                >
                  {data[i]!.date.slice(5).replace('-', '.')}.
                </text>
              ))}
          </g>
        </svg>
      )}
      {h && (
        <ChartTooltip
          x={M.left + (x(h.date) ?? 0)}
          y={8}
          width={width}
          title={capitalize(formatDateLong(h.date))}
          rows={
            h.v === undefined
              ? [{ key: 'none', value: '–', label: 'nincs óraadat' }]
              : [
                  {
                    key: 'v',
                    value: formatSigned(h.v, 2),
                    label: hl ? `${hl.symbol} ${hl.text}` : '',
                  },
                  { key: 'w', value: `${sleepWeek(h.date, start)}. hét`, label: 'alvás-hét' },
                ]
          }
        />
      )}
      <p className="mt-2 text-[12px] text-muted">
        Az oszlop az éjszaka 6 óraadatának átlagos eltérése a baseline-tól (szórásban). A szürke sáv
        a ±0,5-ös „átlagos” tartomány; a halványabb oszlop azon belül van. A hetek keddtől hétfő
        reggelig tartanak (az előző napi ételt tükrözik).
      </p>
    </div>
  );
}
