// Időtartam- és számmező élő eltérés-jelzéssel a baseline-hoz.
// Időtartam: „756” → 7:56 maszk, „7:56”, „7h56”, „7.9” is jó. Szám: vessző és pont is.

import { forwardRef, useEffect, useId, useState } from 'react';
import type { BaselineStat } from '@/domain/baseline';
import { DAY_Z, signedZ, toneOf, TONE_LABELS } from '@/domain/deviation';
import { formatDuration, formatMetric, formatMetricDelta, formatNumber } from '@/domain/format';
import { METRICS, type NumericMetric } from '@/domain/metrics';
import { maskDurationInput, parseDuration } from '@/domain/parse/duration';
import { parseDecimal } from '@/domain/parse/number';
import { cn } from '@/lib/cn';
import { ToneText } from './Tone';

export interface MetricFieldProps {
  metric: NumericMetric;
  value?: number;
  stat?: BaselineStat;
  imported?: boolean;
  label?: string;
  onCommit: (v: number | undefined) => void;
  /** Enter után: továbblépés a következő mezőre. */
  onEnter?: () => void;
  compact?: boolean;
}

function toText(metric: NumericMetric, v: number | undefined): string {
  if (v === undefined) return '';
  return METRICS[metric].kind === 'duration' ? formatDuration(v) : formatNumber(v, 1);
}

export const MetricField = forwardRef<HTMLInputElement, MetricFieldProps>(function MetricField(
  { metric, value, stat, imported, label, onCommit, onEnter, compact },
  ref,
) {
  const def = METRICS[metric];
  const isDuration = def.kind === 'duration';
  const id = useId();
  const [text, setText] = useState(() => toText(metric, value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toText(metric, value));
  }, [value, focused, metric]);

  const parse = (t: string) => (isDuration ? parseDuration(t) : parseDecimal(t));
  const parsed = text.trim() ? parse(text) : undefined;
  const invalid = text.trim() !== '' && parsed === undefined;
  const live = text.trim() ? parsed : undefined;

  const commit = () => {
    if (invalid) return;
    if (live !== value) onCommit(live);
    if (live !== undefined) setText(toText(metric, live));
  };

  const z = signedZ(metric, live, stat);
  const tone = toneOf(z, DAY_Z);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label-caps">
          {label ?? def.short}
        </label>
        {imported && value !== undefined && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            importálva
          </span>
        )}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          inputMode={isDuration ? 'numeric' : 'decimal'}
          autoComplete="off"
          spellCheck={false}
          placeholder={isDuration ? '0:00' : '–'}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`}
          value={text}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onChange={(e) => setText(isDuration ? maskDurationInput(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              onEnter?.();
            } else if (e.key === 'Escape' && focused && text !== toText(metric, value)) {
              e.stopPropagation();
              setText(toText(metric, value));
            }
          }}
          className={cn(
            'input num font-semibold tracking-tight',
            compact ? 'h-11 text-xl' : 'h-14 text-[28px]',
            invalid && 'border-bad focus:border-bad',
          )}
        />
        {!isDuration && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
            {def.unit}
          </span>
        )}
      </div>
      <div
        id={`${id}-hint`}
        className="flex min-h-5 items-center justify-between gap-2 text-[12px]"
      >
        {invalid ? (
          <span className="text-bad">
            {isDuration ? 'Pl. 7:56, 756 vagy 7h56' : 'Egy szám, pl. 72,5'}
          </span>
        ) : (
          <span className="text-muted">
            {stat ? `átlagod ${formatMetric(metric, stat.mean)}` : 'nincs baseline'}
          </span>
        )}
        {!invalid && live !== undefined && stat && tone && (
          <ToneText tone={tone} symbolOnly={false}>
            {TONE_LABELS[tone].symbol} {formatMetricDelta(metric, live - stat.mean)}
          </ToneText>
        )}
      </div>
    </div>
  );
});
