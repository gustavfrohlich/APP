// „Mi hat az alvásodra?” – csoportátlagok, különbség és darabszám; 5 éjszaka alatt „még kevés adat”.

import {
  COMPARISON_METRICS,
  MIN_NIGHTS,
  type Comparison,
  type ComparisonMetric,
} from '@/domain/comparisons';
import { formatDuration, formatMetricDelta, formatNumber, formatSigned } from '@/domain/format';
import { direction } from '@/domain/metrics';
import { cn } from '@/lib/cn';

const LABELS: Record<ComparisonMetric, string> = {
  sleepQuality: 'Alvásminőség',
  sleepMin: 'Alvásidő',
  awakeMin: 'Ébren éjjel',
  hrvNight: 'HRV',
  rhrNight: 'Pulzus',
  nightScore: 'Éjszaka-összkép',
};

function fmt(m: ComparisonMetric, v: number | undefined): string {
  if (v === undefined) return '–';
  if (m === 'sleepMin' || m === 'awakeMin') return formatDuration(v);
  if (m === 'nightScore') return formatSigned(v, 2);
  return formatNumber(v, 1, false);
}

function diffText(m: ComparisonMetric, d: number): string {
  if (m === 'nightScore') return formatSigned(d, 2);
  if (m === 'sleepQuality') return formatSigned(d, 1);
  return formatMetricDelta(m, d);
}

export function ComparisonCard({ c }: { c: Comparison }) {
  return (
    <article className="rounded-2xl bg-surface-2/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{c.title}</h3>
        {!c.enough && (
          <span className="rounded-full bg-amber-fill px-2.5 py-0.5 text-[12px] font-semibold text-amber">
            még kevés adat
          </span>
        )}
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] text-muted">
            <th className="py-1 text-left font-medium" />
            <th className="py-1 text-right font-medium">
              {c.a.label}
              <div className="num font-normal">{c.a.n} éjszaka</div>
            </th>
            <th className="py-1 text-right font-medium">
              {c.b.label}
              <div className="num font-normal">{c.b.n} éjszaka</div>
            </th>
            <th className="py-1 text-right font-medium">Különbség</th>
          </tr>
        </thead>
        <tbody className={cn(!c.enough && 'text-muted')}>
          {COMPARISON_METRICS.map((m) => {
            const d = c.diffs[m];
            const better =
              d === undefined ? undefined : d * (m === 'nightScore' ? 1 : direction(m)) > 0;
            const meaningful = c.enough && d !== undefined && Math.abs(d) > 1e-9;
            return (
              <tr key={m} className="border-t border-line">
                <th scope="row" className="py-1.5 text-left font-normal">
                  {LABELS[m]}
                </th>
                <td className="num py-1.5 text-right">{fmt(m, c.a.means[m])}</td>
                <td className="num py-1.5 text-right">{fmt(m, c.b.means[m])}</td>
                <td
                  className={cn(
                    'num py-1.5 text-right font-medium',
                    meaningful && (better ? 'text-good' : 'text-bad'),
                  )}
                >
                  {d === undefined
                    ? '–'
                    : `${meaningful ? (better ? '▲ ' : '▼ ') : ''}${diffText(m, d)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-muted">
        Különbség = „{c.a.label}” mínusz „{c.b.label}”; ▲ = az első csoportban jobb.
        {!c.enough && ` Csoportonként legalább ${MIN_NIGHTS} éjszaka kell.`}
      </p>
    </article>
  );
}
