// Heti tünetek kis ismétlődő grafikonokként (mutatónként egy), szaggatott becslés-/baseline-vonallal.

import { useState } from 'react';
import { scaleLinear, scalePoint } from '@visx/scale';
import { formatNumber, formatSigned } from '@/domain/format';
import type { SubjectiveBaseline } from '@/domain/types';
import type { WeekSummary } from '@/domain/weekly';
import { ChartTooltip } from './chartKit';
import { linePath, useWidth } from './chartUtils';

type Key = 'sleepQuality' | 'nightScore' | 'nose' | 'fatigue' | 'postMealFatigue' | 'bloating';

const PANELS: {
  key: Key;
  title: string;
  color: string;
  domain: [number, number] | 'sym';
  better: 'up' | 'down';
}[] = [
  {
    key: 'sleepQuality',
    title: 'Alvásminőség',
    color: 'var(--night)',
    domain: [1, 10],
    better: 'up',
  },
  {
    key: 'nightScore',
    title: 'Éjszaka-összkép',
    color: 'var(--night)',
    domain: 'sym',
    better: 'up',
  },
  { key: 'nose', title: 'Orr / légzés', color: 'var(--day)', domain: [0, 10], better: 'down' },
  { key: 'fatigue', title: 'Fáradtság', color: 'var(--day)', domain: [0, 10], better: 'down' },
  {
    key: 'postMealFatigue',
    title: 'Evés utáni fáradtság',
    color: 'var(--day)',
    domain: [0, 10],
    better: 'down',
  },
  { key: 'bloating', title: 'Puffadás', color: 'var(--day)', domain: [0, 10], better: 'down' },
];

function valueOf(s: WeekSummary, k: Key): number | undefined {
  if (k === 'sleepQuality') return s.sleepQuality;
  if (k === 'nightScore') return s.nightScore;
  return s.symptoms[k];
}

const H = 150;
const M = { top: 10, right: 10, bottom: 22, left: 28 };

function Panel({
  panel,
  summaries,
  reference,
}: {
  panel: (typeof PANELS)[number];
  summaries: WeekSummary[];
  reference?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const weeks = summaries.map((s) => s.week);
  const x = scalePoint<number>({ domain: weeks, range: [0, innerW], padding: 0.4 });
  const vals = summaries.map((s) => valueOf(s, panel.key));
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v ?? 0)));
  const y = scaleLinear<number>({
    domain: panel.domain === 'sym' ? [-maxAbs, maxAbs] : panel.domain,
    range: [innerH, 0],
    nice: panel.domain === 'sym',
  });
  const pts = vals.map((v, i) => (v === undefined ? undefined : { x: x(weeks[i]!) ?? 0, y: y(v) }));
  const ticks =
    panel.domain === 'sym'
      ? [y.domain()[0]!, 0, y.domain()[1]!]
      : panel.domain[0] === 1
        ? [1, 5, 10]
        : [0, 5, 10];
  const hv = hover !== null ? vals[hover] : undefined;

  return (
    <figure className="m-0 rounded-2xl bg-surface-2/50 p-3">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[13px] font-semibold">{panel.title}</span>
        {reference !== undefined && (
          <span className="text-[11px] text-muted">
            - -{' '}
            {panel.key === 'nightScore' ? 'baseline 0' : `becslés ${formatNumber(reference, 1)}`}
          </span>
        )}
      </figcaption>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`${panel.title} hetente`}
            onPointerLeave={() => setHover(null)}
          >
            <g transform={`translate(${M.left},${M.top})`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text
                    x={-6}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--muted)"
                    className="num"
                  >
                    {panel.domain === 'sym' ? formatSigned(t, 1) : t}
                  </text>
                </g>
              ))}
              {reference !== undefined && (
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(reference)}
                  y2={y(reference)}
                  stroke="var(--muted)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              )}
              <path
                d={linePath(pts)}
                fill="none"
                stroke={panel.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p, i) =>
                p ? (
                  <circle
                    key={weeks[i]}
                    cx={p.x}
                    cy={p.y}
                    r={hover === i ? 5.5 : 4}
                    fill={panel.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ) : null,
              )}
              {weeks.map((w, i) => (
                <g key={w}>
                  <text
                    x={x(w) ?? 0}
                    y={innerH + 15}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--muted)"
                  >
                    {w}.
                  </text>
                  <rect
                    x={(x(w) ?? 0) - x.step() / 2}
                    y={0}
                    width={x.step()}
                    height={innerH}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                  />
                </g>
              ))}
            </g>
          </svg>
        )}
        {hover !== null && (
          <ChartTooltip
            x={M.left + (x(weeks[hover]!) ?? 0)}
            y={0}
            width={width}
            title={`${weeks[hover]}. hét`}
            rows={[
              {
                key: 'v',
                value:
                  hv === undefined
                    ? '–'
                    : panel.key === 'nightScore'
                      ? formatSigned(hv, 2)
                      : formatNumber(hv, 1),
                label: panel.title.toLowerCase(),
                color: panel.color,
              },
              ...(reference !== undefined && hv !== undefined
                ? [
                    {
                      key: 'd',
                      value: formatSigned(hv - reference, panel.key === 'nightScore' ? 2 : 1),
                      label: panel.key === 'nightScore' ? 'a baseline-hoz' : 'a becsléshez',
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
    </figure>
  );
}

export function WeeklyMultiples({
  summaries,
  subjective,
}: {
  summaries: WeekSummary[];
  subjective: SubjectiveBaseline;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {PANELS.map((p) => (
        <Panel
          key={p.key}
          panel={p}
          summaries={summaries}
          reference={p.key === 'nightScore' ? 0 : subjective[p.key as keyof SubjectiveBaseline]}
        />
      ))}
    </div>
  );
}
