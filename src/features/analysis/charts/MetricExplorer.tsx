// Mutató-böngésző: bármely mutató napi értékei, 7 napos mozgóátlag, baseline ±0,5 szórás sáv,
// jelölők a kilengésekre, az alkoholra és a megjegyzésekre. Szálkereszt + tooltip, billentyűzettel is.

import { useMemo, useState, type KeyboardEvent } from 'react';
import { scaleLinear, scalePoint } from '@visx/scale';
import type { Baseline } from '@/domain/baseline';
import { eachDay, minDate } from '@/domain/dates';
import type { EntryMap } from '@/domain/entries';
import { capitalize, formatDateLong, formatMetric, formatMetricWithUnit } from '@/domain/format';
import {
  BASELINE_METRICS,
  METRICS,
  metricValue,
  WATCH_METRICS,
  type NumericMetric,
  type BaselineMetric,
} from '@/domain/metrics';
import { signedZ } from '@/domain/deviation';
import { movingAverage } from '@/domain/stats';
import type { ISODate, PlanWeek, SubjectiveBaseline } from '@/domain/types';
import { dietWeek, sleepWeek } from '@/domain/weeks';
import { BandLayer, ChartTooltip } from './chartKit';
import { linePath, useWidth, weekBands } from './chartUtils';

const OPTIONS: NumericMetric[] = [
  'sleepMin',
  'awakeMin',
  'deepMin',
  'remMin',
  'hrvNight',
  'rhrNight',
  'sleepQuality',
  'nose',
  'fatigue',
  'postMealFatigue',
  'bloating',
  'stress',
  'rhrDay',
  'hrvDay',
];

const H = 300;
const M = { top: 26, right: 14, bottom: 26, left: 46 };
const DAILY = 'color-mix(in oklab, var(--night) 45%, var(--surface))';
const AVG = 'var(--night)';

export function MetricExplorer({
  entries,
  baseline,
  subjective,
  start,
  today,
  plan,
  firstDate,
}: {
  entries: EntryMap;
  baseline: Baseline;
  subjective: SubjectiveBaseline;
  start: ISODate;
  today: ISODate;
  plan: readonly PlanWeek[];
  firstDate?: ISODate;
}) {
  const [metric, setMetric] = useState<NumericMetric>('hrvNight');
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const def = METRICS[metric];
  const isNight =
    (WATCH_METRICS as readonly string[]).includes(metric) || metric === 'sleepQuality';

  const dates = useMemo(() => {
    const from = firstDate ? minDate(firstDate, start) : start;
    return from <= today ? eachDay(from, today) : [];
  }, [firstDate, start, today]);
  const values = useMemo(
    () => dates.map((d) => metricValue(entries.get(d), metric)),
    [dates, entries, metric],
  );
  const avg = useMemo(() => movingAverage(values, 7, 3), [values]);

  const stat = (BASELINE_METRICS as readonly string[]).includes(metric)
    ? baseline[metric as BaselineMetric]
    : undefined;
  const estimate = subjective[metric as keyof SubjectiveBaseline];
  const ref0 = stat?.mean ?? estimate;
  const half = stat?.sd !== undefined ? stat.sd * 0.5 : estimate !== undefined ? 1 : undefined;

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const x = scalePoint<string>({ domain: dates, range: [0, innerW], padding: 0.5 });
  const step = x.step();
  const present = values.filter((v): v is number => v !== undefined);
  const lo = Math.min(
    ...present,
    ...(ref0 !== undefined && half !== undefined ? [ref0 - half] : []),
    def.min ?? Infinity,
  );
  const hi = Math.max(
    ...present,
    ...(ref0 !== undefined && half !== undefined ? [ref0 + half] : []),
    def.max ?? -Infinity,
  );
  const y = scaleLinear<number>({
    domain: Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : [0, 10],
    range: [innerH, 0],
    nice: true,
  });
  const ticks = y.ticks(5);
  const bands = weekBands(
    dates,
    (d) => (isNight ? sleepWeek(d, start) : dietWeek(d, start)),
    plan,
    (i) => (x(dates[i]!) ?? 0) - step / 2,
    step,
  );

  const isOutlier = (v: number | undefined) => {
    if (v === undefined) return false;
    const z = signedZ(metric, v, stat);
    if (z !== undefined) return Math.abs(z) >= 1.5;
    return estimate !== undefined && Math.abs(v - estimate) >= 3;
  };

  const onKey = (e: KeyboardEvent) => {
    if (!dates.length) return;
    const cur = hover ?? dates.length - 1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHover(Math.max(0, cur - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHover(Math.min(dates.length - 1, cur + 1));
    } else if (e.key === 'Escape') setHover(null);
  };

  const hd = hover !== null ? dates[hover] : undefined;
  const he = hd ? entries.get(hd) : undefined;
  const fmtY = (v: number) =>
    def.kind === 'duration' ? formatMetric(metric, v) : formatMetric(metric, v);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-[14px]">
          <span className="text-muted">Mutató</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as NumericMetric)}
            className="input h-9 w-auto py-0 pr-8"
          >
            {OPTIONS.map((m) => (
              <option key={m} value={m}>
                {METRICS[m].label}
              </option>
            ))}
          </select>
        </label>
        <ul
          className="flex flex-wrap items-center gap-4 text-[12px] text-muted"
          aria-label="Jelmagyarázat"
        >
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: DAILY }} /> napi érték
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded" style={{ background: AVG }} /> 7 napos átlag
          </li>
          {half !== undefined && (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-[color-mix(in_oklab,var(--plan)_22%,transparent)]" />
              {stat ? 'baseline ±0,5 szórás' : 'becslés ±1'}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-bad" /> kilengés
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-amber">◆</span> alkohol
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted" /> megjegyzés
          </li>
        </ul>
      </div>
      <div ref={ref} className="relative">
        {width > 0 && dates.length > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`${def.label} napi értékei, 7 napos mozgóátlaggal. Nyilakkal léptethető.`}
            tabIndex={0}
            onKeyDown={onKey}
            onFocus={() => hover === null && setHover(dates.length - 1)}
            onBlur={() => setHover(null)}
            onPointerLeave={() => setHover(null)}
            onPointerMove={(e) => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = e.clientX - rect.left - M.left;
              const i = Math.round((px - (x(dates[0]!) ?? 0)) / step);
              setHover(Math.max(0, Math.min(dates.length - 1, i)));
            }}
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-night"
          >
            <g transform={`translate(${M.left},${M.top})`}>
              <BandLayer bands={bands} height={innerH + M.top} top={-M.top} />
              {ref0 !== undefined && half !== undefined && (
                <rect
                  x={0}
                  width={innerW}
                  y={y(ref0 + half)}
                  height={Math.max(0, y(ref0 - half) - y(ref0 + half))}
                  fill="color-mix(in oklab, var(--plan) 18%, transparent)"
                />
              )}
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text
                    x={-8}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={11}
                    fill="var(--muted)"
                    className="num"
                  >
                    {fmtY(t)}
                  </text>
                </g>
              ))}
              {ref0 !== undefined && (
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(ref0)}
                  y2={y(ref0)}
                  stroke="var(--plan)"
                  strokeWidth={1}
                  opacity={0.8}
                />
              )}
              <path
                d={linePath(
                  values.map((v, i) =>
                    v === undefined ? undefined : { x: x(dates[i]!) ?? 0, y: y(v) },
                  ),
                )}
                fill="none"
                stroke={DAILY}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              <path
                d={linePath(
                  avg.map((v, i) =>
                    v === undefined ? undefined : { x: x(dates[i]!) ?? 0, y: y(v) },
                  ),
                )}
                fill="none"
                stroke={AVG}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {values.map((v, i) => {
                if (v === undefined || !isOutlier(v)) return null;
                const z =
                  signedZ(metric, v, stat) ??
                  (estimate !== undefined ? (v - estimate) * (def.higherIsBetter ? 1 : -1) : 0);
                return (
                  <circle
                    key={`o-${dates[i]}`}
                    cx={x(dates[i]!) ?? 0}
                    cy={y(v)}
                    r={5}
                    fill="var(--surface)"
                    stroke={z > 0 ? 'var(--good)' : 'var(--bad)'}
                    strokeWidth={2.5}
                  />
                );
              })}
              {dates.map((d, i) => {
                const e = entries.get(d);
                const cx = x(d) ?? 0;
                return (
                  <g key={`m-${d}`}>
                    {(e?.alcohol ?? 0) > 0 && (
                      <path
                        d={`M${cx},${innerH - 13} L${cx + 5},${innerH - 7} L${cx},${innerH - 1} L${cx - 5},${innerH - 7} Z`}
                        fill="var(--amber)"
                      />
                    )}
                    {e?.note && <circle cx={cx} cy={-8} r={3} fill="var(--muted)" />}
                    {hover === i && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={0}
                        y2={innerH}
                        stroke="var(--ink)"
                        strokeOpacity={0.35}
                      />
                    )}
                  </g>
                );
              })}
              {hover !== null && values[hover] !== undefined && (
                <circle
                  cx={x(dates[hover]!) ?? 0}
                  cy={y(values[hover]!)}
                  r={4.5}
                  fill={AVG}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
              {[0, Math.floor(dates.length / 2), dates.length - 1].map((i) => (
                <text
                  key={i}
                  x={x(dates[i]!) ?? 0}
                  y={innerH + 18}
                  textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'}
                  fontSize={11}
                  fill="var(--muted)"
                >
                  {dates[i]!.slice(5).replace('-', '.')}.
                </text>
              ))}
            </g>
          </svg>
        )}
        {hd && (
          <ChartTooltip
            x={M.left + (x(hd) ?? 0)}
            y={6}
            width={width}
            title={capitalize(formatDateLong(hd))}
            rows={[
              {
                key: 'v',
                value: formatMetricWithUnit(metric, values[hover!]),
                label: 'napi érték',
                color: DAILY,
              },
              {
                key: 'a',
                value: formatMetricWithUnit(metric, avg[hover!]),
                label: '7 napos átlag',
                color: AVG,
              },
              ...(ref0 !== undefined
                ? [
                    {
                      key: 'b',
                      value: formatMetricWithUnit(metric, ref0),
                      label: stat ? 'baseline' : 'becslés',
                    },
                  ]
                : []),
              ...((he?.alcohol ?? 0) > 0
                ? [{ key: 'al', value: `${he!.alcohol} ital`, label: 'alkohol' }]
                : []),
              ...(he?.note ? [{ key: 'n', value: '✎', label: he.note }] : []),
            ]}
          />
        )}
        {dates.length === 0 && (
          <p className="py-10 text-center text-muted">
            A kísérlet még nem indult – itt jelennek majd meg a napi értékek.
          </p>
        )}
      </div>
    </div>
  );
}
