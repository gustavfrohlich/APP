// A check-in végi összegzés: következtetés, nem nyers számok.

import { forwardRef } from 'react';
import { m } from 'framer-motion';
import { Button } from '@/components/Button';
import { CountUp } from '@/components/CountUp';
import { ToneBadge } from '@/components/Tone';
import { TONE_TEXT } from '@/components/toneClasses';
import type { NightExplanation, DayExplanation } from '@/domain/explain';
import { formatMetricDelta, formatNumber } from '@/domain/format';
import { METRICS } from '@/domain/metrics';
import { cn } from '@/lib/cn';

export function NightSummaryView({ x }: { x: NightExplanation }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {x.tone ? <ToneBadge tone={x.tone} size="lg" /> : null}
        <h3 className="font-serif text-[22px] font-semibold tracking-tight">{x.headline}</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{x.sentence}</p>
      {x.drivers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {x.drivers.map((d) => (
            <span
              key={d.metric}
              className={cn(
                'rounded-full bg-surface px-3 py-1 text-[13px] ring-1 ring-line',
                TONE_TEXT[d.z > 0 ? 'good' : 'bad'],
              )}
            >
              {d.z > 0 ? '▲' : '▼'} {METRICS[d.metric].short}{' '}
              <CountUp value={d.delta} format={(v) => formatMetricDelta(d.metric, v)} />
            </span>
          ))}
          {x.score !== undefined && (
            <span className="rounded-full bg-surface px-3 py-1 text-[13px] text-muted ring-1 ring-line">
              összkép <CountUp value={x.score} format={(v) => formatNumber(v, 2, false)} />
            </span>
          )}
        </div>
      )}
    </m.div>
  );
}

export function DaySummaryView({ x }: { x: DayExplanation }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToneBadge tone={x.tone}>
          {x.tone === 'good' ? 'jobb' : x.tone === 'bad' ? 'figyelj' : 'szokásos'}
        </ToneBadge>
        <h3 className="font-serif text-[22px] font-semibold tracking-tight">{x.headline}</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{x.sentence}</p>
    </m.div>
  );
}

export const FinishButton = forwardRef<
  HTMLButtonElement,
  { accent: 'night' | 'day'; onClick: () => void }
>(function FinishButton({ accent, onClick }, ref) {
  return (
    <Button ref={ref} variant={accent} size="lg" onClick={onClick} className="mt-5 min-w-40">
      Kész
      <kbd className="ml-1 rounded border border-white/35 px-1.5 text-[12px] font-semibold dark:border-black/30">
        Enter
      </kbd>
    </Button>
  );
});
