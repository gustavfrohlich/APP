// Elemzés: aktuális hét (lezárással), heti összesítő, grafikonok (lusta), „Mi hat az alvásodra?”,
// összegzés és orvosi összefoglaló.

import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarCheck, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAppData } from '@/data/context';
import { useComparisons, useWeekly } from '@/data/useDerived';
import { canCloseWeek, closableWeeks, observations } from '@/domain/summary';
import { resultText, suggestVerdict, RESULT_LABELS } from '@/domain/verdict';
import { baselineCount } from '@/domain/weekly';
import { cn } from '@/lib/cn';
import { CloseWeekDialog } from './CloseWeekDialog';
import { ComparisonCard } from './Comparisons';
import { ResultBadge, WeeklyTable, WorseningCell } from './WeeklyTable';

const Charts = lazy(() => import('./charts/Charts'));

export default function AnalysisPage() {
  const { info, plan, baseline, settings, days } = useAppData();
  const summaries = useWeekly();
  const comparisons = useComparisons();
  const [params, setParams] = useSearchParams();
  const [closing, setClosing] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const closable = closableWeeks(plan, info);
  const current = info.phase === 'running' ? info.week : info.phase === 'after' ? plan.length : 0;
  const cur = current >= 1 ? summaries[current - 1] : undefined;

  // ?lezaras=1 (Ma képernyő, parancspaletta): a legkorábbi lezárható hét párbeszédablaka nyílik meg.
  const wantClose = params.get('lezaras') === '1';
  const [handledClose, setHandledClose] = useState(false);
  if (wantClose && !handledClose) {
    setHandledClose(true);
    const target =
      closable[0] ?? (current >= 1 && canCloseWeek(current, info) ? current : undefined);
    if (target) setClosing(target);
  }
  if (!wantClose && handledClose) setHandledClose(false);
  useEffect(() => {
    if (!wantClose) return;
    const next = new URLSearchParams(params);
    next.delete('lezaras');
    setParams(next, { replace: true });
  }, [wantClose, params, setParams]);

  const summaryVisible = showSummary || current >= 8 || info.phase === 'after';
  const obs = summaryVisible
    ? observations({
        summaries,
        plan,
        comparisons,
        subjective: settings.subjectiveBaseline,
        baseline,
      })
    : [];

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[40px] leading-tight font-semibold tracking-[-0.02em]">
            Elemzés
          </h1>
          <p className="text-[15px] text-muted">
            Hétről hétre: átment az étel, vagy reakciót okozott?
          </p>
        </div>
        <Link
          to="/osszefoglalo"
          className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[15px] font-medium ring-1 ring-line ring-inset hover:bg-surface-2"
        >
          <Printer className="size-4" aria-hidden /> Összefoglaló orvosnak
        </Link>
      </div>

      {/* Aktuális hét */}
      <Card className="bg-[color-mix(in_oklab,var(--plan)_7%,var(--surface))]">
        {cur && cur.plan ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="label-caps mb-1 text-plan-ink">Aktuális hét · {current}. hét</div>
                <h2 className="font-serif text-[28px] leading-tight font-semibold tracking-tight">
                  {cur.plan.food}
                </h2>
                <p className="mt-1 text-[14px] text-muted">
                  {cur.filledDays}/7 kitöltött nap · {cur.nights} éjszaka az alvás-hétben
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {cur.plan.result ? (
                  <ResultBadge w={cur.plan} />
                ) : canCloseWeek(current, info) ? (
                  <Button
                    variant="plan"
                    icon={<CalendarCheck className="size-4" aria-hidden />}
                    onClick={() => setClosing(current)}
                  >
                    Hét lezárása
                  </Button>
                ) : (
                  <span className="text-[13px] text-muted">Vasárnaptól zárható le</span>
                )}
                {cur.plan.result && (
                  <Button size="sm" variant="ghost" onClick={() => setClosing(current)}>
                    Eredmény módosítása
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3">
              <div className="label-caps mb-1">Romlás az előző héthez</div>
              <p className="text-[15px]">
                <WorseningCell s={cur} />
                {cur.comparison.status === 'empty' && (
                  <span className="text-muted">Még nincs kitöltött nap ezen a héten.</span>
                )}
              </p>
              {cur.comparison.status === 'ok' && !cur.plan.result && (
                <p className="mt-1 text-[13px] text-muted">
                  Mostani állás szerint:{' '}
                  {RESULT_LABELS[suggestVerdict(cur.comparison).result].toLowerCase()}.
                </p>
              )}
            </div>
            {closable.filter((w) => w !== current).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className="text-muted">Lezáratlan:</span>
                {closable
                  .filter((w) => w !== current)
                  .map((w) => (
                    <Button key={w} size="sm" variant="secondary" onClick={() => setClosing(w)}>
                      {w}. hét lezárása
                    </Button>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState art="chart" title="Hétfőn indul az 1. hét">
            A heti elemzés az első héttől működik. Addig érdemes kitölteni a check-ineket – ezek az
            alapidőszak napjai.
          </EmptyState>
        )}
      </Card>

      {/* Heti összesítő */}
      <Card>
        <h2 className="mb-1 font-serif text-xl font-semibold">Heti összesítő</h2>
        <p className="mb-4 text-[14px] text-muted">
          Zöld ▲ = jobb a baseline-nál, piros ▼ = rosszabb (óraadatok ±0,25 szórás, tünetek ±1 pont
          a becslésedhez). Az alvás heti átlaga keddtől a következő hétfő reggelig számol.
        </p>
        <WeeklyTable
          summaries={summaries}
          baseline={baseline}
          subjective={settings.subjectiveBaseline}
          currentWeek={current}
          baseN={baselineCount(baseline, settings.subjectiveBaseline)}
        />
      </Card>

      {/* Grafikonok – lustán töltve */}
      <Suspense
        fallback={
          <Card className="h-80 animate-pulse" aria-busy="true">
            {null}
          </Card>
        }
      >
        {days.length > 0 ? (
          <Charts />
        ) : (
          <Card>
            <EmptyState art="chart" title="Még nincs mit ábrázolni">
              Az első napok után itt jelennek meg az éjszakák, a heti tünetek és a mutató-böngésző.
            </EmptyState>
          </Card>
        )}
      </Suspense>

      {/* Mi hat az alvásodra? */}
      <Card>
        <h2 className="mb-1 font-serif text-xl font-semibold">Mi hat az alvásodra?</h2>
        <p className="mb-4 text-[14px] text-muted">
          Nyers összehasonlítás a Napló éjszakáiból – az alkohol és a hétvége is belekeverhet, ezért
          csak néhány hét adat után érdemes következtetni.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {comparisons.map((c) => (
            <ComparisonCard key={c.key} c={c} />
          ))}
        </div>
      </Card>

      {/* Összegzés */}
      <Card id="osszegzes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">Összegzés</h2>
          {!summaryVisible && (
            <Button
              size="sm"
              variant="secondary"
              icon={<FileText className="size-4" aria-hidden />}
              onClick={() => setShowSummary(true)}
            >
              Összegzés most
            </Button>
          )}
        </div>
        {summaryVisible ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="label-caps mb-2">Ételek és eredmények</h3>
              <ul className="flex flex-col gap-1.5">
                {plan.map((w) => (
                  <li
                    key={w.week}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-surface-2"
                  >
                    <span>
                      <span className="text-muted">{w.week}.</span> {w.food}
                    </span>
                    {w.result ? (
                      <ResultBadge w={w} />
                    ) : (
                      <span className="text-[12px] text-muted">nyitott</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="label-caps mb-2">Főbb megfigyelések</h3>
              {obs.length ? (
                <ul className="flex flex-col gap-2">
                  {obs.map((o) => (
                    <li
                      key={o.text}
                      className={cn(
                        'rounded-lg px-3 py-2 text-[14px]',
                        o.tone === 'bad'
                          ? 'bg-bad-fill'
                          : o.tone === 'good'
                            ? 'bg-good-fill'
                            : 'bg-surface-2',
                      )}
                    >
                      <span aria-hidden className="mr-1.5">
                        {o.tone === 'bad' ? '▼' : o.tone === 'good' ? '▲' : '●'}
                      </span>
                      {o.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-muted">Még kevés az adat a megfigyelésekhez.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-muted">
            A 8. héttől automatikusan megjelenik; addig is kérheted. Eddigi eredmények:{' '}
            {plan
              .filter((w) => w.result)
              .map((w) => `${w.week}. ${resultText(w.result!)}`)
              .join(', ') || 'még nincs lezárt hét'}
            .
          </p>
        )}
      </Card>

      {closing !== null && (
        <CloseWeekDialog
          key={closing}
          week={closing}
          open
          onOpenChange={(o) => !o && setClosing(null)}
        />
      )}
    </div>
  );
}
