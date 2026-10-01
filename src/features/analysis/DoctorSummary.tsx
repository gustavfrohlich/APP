// „Összefoglaló orvosnak”: nyomtatható nézet (a böngészőből PDF-be menthető).

import { Link } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAppData } from '@/data/context';
import { useComparisons, useWeekly } from '@/data/useDerived';
import { addDays } from '@/domain/dates';
import {
  formatDateFull,
  formatDuration,
  formatMetric,
  formatNumber,
  formatSigned,
} from '@/domain/format';
import { BASELINE_METRICS, METRICS } from '@/domain/metrics';
import { observations } from '@/domain/summary';
import { resultText } from '@/domain/verdict';
import { dietWeekRange } from '@/domain/weeks';
import { WORSEN_LABELS } from '@/domain/weekly';

const SUBJ_LABELS = {
  sleepQuality: 'Alvásminőség (1–10)',
  nose: 'Orr / légzés (0–10)',
  fatigue: 'Fáradtság (0–10)',
  postMealFatigue: 'Evés utáni fáradtság (0–10)',
  bloating: 'Puffadás (0–10)',
} as const;

export default function DoctorSummary() {
  const { plan, settings, baseline, today, days } = useAppData();
  const summaries = useWeekly();
  const comparisons = useComparisons();
  const obs = observations({
    summaries,
    plan,
    comparisons,
    subjective: settings.subjectiveBaseline,
    baseline,
  });
  const end = addDays(settings.startDate, plan.length * 7 - 1);
  const last = days.length ? days[days.length - 1]!.date : today;

  return (
    <article className="mx-auto max-w-[900px] py-8 text-[14px] leading-relaxed print:max-w-none print:py-0">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          to="/elemzes"
          className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Vissza az Elemzéshez
        </Link>
        <Button
          variant="primary"
          icon={<Printer className="size-4" aria-hidden />}
          onClick={() => window.print()}
        >
          Nyomtatás / mentés PDF-be
        </Button>
      </div>

      <header className="mb-6 border-b border-line pb-4">
        <h1 className="font-serif text-[30px] leading-tight font-semibold">
          Eliminációs diéta – összefoglaló
        </h1>
        <p className="text-muted">
          Időszak: {formatDateFull(settings.startDate)} – {formatDateFull(end < last ? end : last)}{' '}
          · készült: {formatDateFull(today)}
        </p>
      </header>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 text-[17px] font-semibold">Módszer</h2>
        <p>
          Szűk alapdiéta (marha, rizs, áfonya), majd minden hétfőn egy új étel vagy ételcsoport
          visszavezetése; ami átment, marad. Naponta két rövid önkitöltés (reggel az éjszakáról,
          este a napról), és az okosóra éjszakai adatai (alvásidő, ébrenlét, mélyalvás, REM, HRV,
          nyugalmi pulzus). Az éjszakai adatok a felkelés napjához tartoznak, de az előző nap ételét
          tükrözik, ezért a heti alvásátlag keddtől a következő hétfő reggelig számol. Az
          „éjszaka-összkép” a 6 óraadat átlagos eltérése a kísérlet előtti baseline-tól,
          szórásegységben.
        </p>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 text-[17px] font-semibold">Baseline (a kísérlet előtt)</h2>
        <table className="w-full border-collapse [&_td]:pr-3 [&_th]:pr-3">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th className="py-1 font-medium">Mutató</th>
              <th className="py-1 text-right font-medium">Átlag</th>
              <th className="py-1 text-right font-medium">Szórás</th>
              <th className="py-1 text-right font-medium">Napok</th>
              <th className="py-1 text-right font-medium">Időszak</th>
            </tr>
          </thead>
          <tbody>
            {BASELINE_METRICS.map((m) => {
              const s = baseline[m];
              return (
                <tr key={m} className="border-b border-line/70">
                  <td className="py-1">{METRICS[m].label}</td>
                  <td className="num py-1 text-right">
                    {s
                      ? `${formatMetric(m, s.mean)}${METRICS[m].kind === 'decimal' ? ` ${METRICS[m].unit}` : ''}`
                      : '–'}
                  </td>
                  <td className="num py-1 text-right">
                    {s?.sd !== undefined ? formatMetric(m, s.sd) : '–'}
                  </td>
                  <td className="num py-1 text-right">{s?.n ?? '–'}</td>
                  <td className="py-1 text-right text-muted">
                    {s ? `${formatDateFull(s.from)} – ${formatDateFull(s.to)}` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-muted">
          Saját becslés egy átlagos napról:{' '}
          {Object.entries(SUBJ_LABELS)
            .map(([k, l]) => {
              const v = settings.subjectiveBaseline[k as keyof typeof SUBJ_LABELS];
              return v === undefined ? null : `${l}: ${formatNumber(v, 1)}`;
            })
            .filter(Boolean)
            .join(' · ') || 'nincs megadva'}
          .
        </p>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 text-[17px] font-semibold">Ételek és eredmények</h2>
        <table className="w-full border-collapse [&_td]:pr-3 [&_th]:pr-3">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th className="py-1 font-medium">Hét</th>
              <th className="py-1 font-medium">Időszak</th>
              <th className="py-1 font-medium">Új étel</th>
              <th className="py-1 font-medium">Eredmény</th>
              <th className="py-1 font-medium">Megjegyzés</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((w) => {
              const r = dietWeekRange(w.week, settings.startDate);
              return (
                <tr key={w.week} className="border-b border-line/70 align-top">
                  <td className="py-1">{w.week}.</td>
                  <td className="py-1 whitespace-nowrap text-muted">
                    {r.from.slice(5).replace('-', '.')}. – {r.to.slice(5).replace('-', '.')}.
                  </td>
                  <td className="py-1">{w.food}</td>
                  <td className="py-1 font-medium whitespace-nowrap">
                    {w.result ? resultText(w.result) : '–'}
                  </td>
                  <td className="py-1">{w.resultNote ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 text-[17px] font-semibold">Heti átlagok</h2>
        <table className="w-full border-collapse text-[12px] [&_td]:pr-2 [&_th]:pr-2">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-1 font-medium">Hét</th>
              <th className="py-1 text-right font-medium">Napok</th>
              <th className="py-1 text-right font-medium">Alvás</th>
              <th className="py-1 text-right font-medium">HRV</th>
              <th className="py-1 text-right font-medium">Pulzus</th>
              <th className="py-1 text-right font-medium">Összkép</th>
              <th className="py-1 text-right font-medium">Alvásmin.</th>
              <th className="py-1 text-right font-medium">Orr</th>
              <th className="py-1 text-right font-medium">Fáradts.</th>
              <th className="py-1 text-right font-medium">Evés u.</th>
              <th className="py-1 text-right font-medium">Puffadás</th>
              <th className="py-1 pl-3 font-medium">Romlás az előző héthez</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.week} className="border-b border-line/70">
                <td className="py-1">{s.week}.</td>
                <td className="num py-1 text-right">{s.filledDays || '–'}</td>
                <td className="num py-1 text-right">
                  {s.watch.sleepMin !== undefined ? formatDuration(s.watch.sleepMin) : '–'}
                </td>
                <td className="num py-1 text-right">{formatNumber(s.watch.hrvNight, 1, false)}</td>
                <td className="num py-1 text-right">{formatNumber(s.watch.rhrNight, 1, false)}</td>
                <td className="num py-1 text-right">{formatSigned(s.nightScore, 2)}</td>
                <td className="num py-1 text-right">{formatNumber(s.sleepQuality, 1, false)}</td>
                <td className="num py-1 text-right">{formatNumber(s.symptoms.nose, 1, false)}</td>
                <td className="num py-1 text-right">
                  {formatNumber(s.symptoms.fatigue, 1, false)}
                </td>
                <td className="num py-1 text-right">
                  {formatNumber(s.symptoms.postMealFatigue, 1, false)}
                </td>
                <td className="num py-1 text-right">
                  {formatNumber(s.symptoms.bloating, 1, false)}
                </td>
                <td className="py-1 pl-3">
                  {s.comparison.status === 'ok'
                    ? s.comparison.worsened.length
                      ? `▼ ${s.comparison.worsened.map((k) => WORSEN_LABELS[k]).join(', ')}`
                      : 'nincs'
                    : s.comparison.status === 'na'
                      ? '–'
                      : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 text-[17px] font-semibold">Főbb megfigyelések</h2>
        {obs.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {obs.map((o) => (
              <li key={o.text}>{o.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Még kevés az adat.</p>
        )}
      </section>

      <footer className="border-t border-line pt-3 text-[12px] text-muted">
        Önmegfigyelési napló, nem orvosi diagnózis. Készült a Bázis alkalmazással; az adatok a
        felhasználó saját eszközén tárolódnak.
      </footer>
    </article>
  );
}
