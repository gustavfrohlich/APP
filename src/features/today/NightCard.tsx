// Éjszaka eredménye: ▲ jobb / ● átlagos / ▼ rosszabb az átlaghoz képest, és a két legnagyobb hatású mutató.

import { MoonStar } from 'lucide-react';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { ToneBadge } from '@/components/Tone';
import type { Baseline } from '@/domain/baseline';
import { explainNight } from '@/domain/explain';
import { formatMetricDelta } from '@/domain/format';
import { METRICS } from '@/domain/metrics';
import type { DayEntry } from '@/domain/types';

export function NightCard({ entry, baseline }: { entry?: DayEntry; baseline: Baseline }) {
  const x = explainNight(entry, baseline);
  return (
    <Card>
      <div className="label-caps mb-3 flex items-center gap-2">
        <MoonStar className="size-3.5" aria-hidden /> Az éjszakád
      </div>
      {x.tone ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ToneBadge tone={x.tone} size="lg" />
            <span className="font-serif text-xl font-semibold">{x.headline}</span>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{x.sentence}</p>
          {x.drivers.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {x.drivers.map((d) => (
                <div key={d.metric} className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <dt className="label-caps">{METRICS[d.metric].short}</dt>
                  <dd
                    className={`mt-1 text-2xl font-semibold tracking-tight ${d.z > 0 ? 'text-good' : 'text-bad'}`}
                  >
                    <span aria-hidden>{d.z > 0 ? '▲ ' : '▼ '}</span>
                    <CountUp value={d.delta} format={(v) => formatMetricDelta(d.metric, v)} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        <p className="text-[15px] text-muted">
          {entry
            ? x.sentence
            : 'A reggeli check-in után itt látod, milyen volt az éjszakád az átlagodhoz képest.'}
        </p>
      )}
    </Card>
  );
}
