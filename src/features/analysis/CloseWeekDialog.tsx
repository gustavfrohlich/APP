// Hét lezárása: a rendszer javasol egy eredményt indoklással (Átment / Reakció / Bizonytalan),
// a felhasználó dönt és megjegyzést írhat; ez a Tervbe íródik.

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleCheck, CircleHelp, CircleX, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import { useAppData, useRepo } from '@/data/context';
import { writeAutosave } from '@/data/backup';
import { useWeekly } from '@/data/useDerived';
import { formatNumber, formatSigned } from '@/domain/format';
import { shiftAfter } from '@/domain/plan';
import { lastPassedWeekBefore } from '@/domain/summary';
import type { WeekResult } from '@/domain/types';
import { RESULT_LABELS, suggestVerdict } from '@/domain/verdict';
import {
  compareKeyValues,
  isWorse,
  keyValuesOf,
  WORSEN_KEYS,
  WORSEN_LABELS,
  type WeekComparison,
} from '@/domain/weekly';
import { cn } from '@/lib/cn';

const RESULT_ICON: Record<WeekResult, React.ReactNode> = {
  pass: <CircleCheck className="size-5" aria-hidden />,
  reaction: <CircleX className="size-5" aria-hidden />,
  unsure: <CircleHelp className="size-5" aria-hidden />,
};

const RESULT_STYLE: Record<WeekResult, string> = {
  pass: 'bg-good-fill text-good',
  reaction: 'bg-bad-fill text-bad',
  unsure: 'bg-amber-fill text-amber',
};

function fmt(key: (typeof WORSEN_KEYS)[number], v: number | undefined): string {
  return key === 'nightScore' ? formatSigned(v, 2) : formatNumber(v, 1);
}

function CompareTable({ c, caption }: { c: WeekComparison; caption: string }) {
  return (
    <table className="w-full text-[14px]">
      <caption className="label-caps mb-2 text-left">{caption}</caption>
      <thead>
        <tr className="text-left text-[12px] text-muted">
          <th className="py-1 font-medium">Mutató</th>
          <th className="py-1 text-right font-medium">
            {c.against === 'baseline' ? 'Kiinduló' : `${c.against}. hét`}
          </th>
          <th className="py-1 text-right font-medium">Ez a hét</th>
          <th className="py-1 text-right font-medium">Változás</th>
        </tr>
      </thead>
      <tbody>
        {WORSEN_KEYS.map((k) => {
          const d = c.deltas[k];
          const worse = d !== undefined && isWorse(k, d);
          return (
            <tr key={k} className="border-t border-line">
              <td className="py-1.5">{WORSEN_LABELS[k]}</td>
              <td className="num py-1.5 text-right text-muted">{fmt(k, c.previous[k])}</td>
              <td className="num py-1.5 text-right">{fmt(k, c.current[k])}</td>
              <td
                className={cn(
                  'num py-1.5 text-right font-medium',
                  worse ? 'text-bad' : 'text-muted',
                )}
              >
                {d === undefined
                  ? '–'
                  : `${worse ? '▼ ' : ''}${formatSigned(d, k === 'nightScore' ? 2 : 1)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function CloseWeekDialog({
  week,
  open,
  onOpenChange,
}: {
  week: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { plan } = useAppData();
  const { repo, realRepo, mode } = useRepo();
  const summaries = useWeekly();
  const s = summaries[week - 1];
  const pw = plan.find((w) => w.week === week);
  const suggestion = s ? suggestVerdict(s.comparison) : undefined;
  const [result, setResult] = useState<WeekResult | undefined>(pw?.result ?? suggestion?.result);
  const [note, setNote] = useState(pw?.resultNote ?? '');
  const [shift, setShift] = useState(false);

  const prevReaction = plan.find((w) => w.week === week - 1)?.result === 'reaction';
  const cleanWeek = prevReaction ? lastPassedWeekBefore(plan, week) : undefined;
  const cleanCmp =
    s && cleanWeek
      ? compareKeyValues(keyValuesOf(s), keyValuesOf(summaries[cleanWeek - 1]!), cleanWeek, {
          current: s.filledDays,
          previous: summaries[cleanWeek - 1]!.filledDays,
        })
      : undefined;

  const save = async () => {
    if (!result) return;
    await repo.updateWeek(week, {
      result,
      resultNote: note.trim() || undefined,
      closedAt: new Date().toISOString(),
    });
    if (shift && result === 'reaction') await repo.savePlan(shiftAfter(plan, week));
    if (mode === 'real') void writeAutosave(realRepo, true);
    onOpenChange(false);
  };

  if (!s || !pw || !suggestion) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[3px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-[5vh] z-50 mx-auto flex max-h-[90vh] w-[min(680px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-lg)] ring-1 ring-[var(--card-border)]"
        >
          <header className="flex items-start gap-4 border-b border-line px-6 py-4">
            <div className="flex-1">
              <Dialog.Title className="font-serif text-[22px] font-semibold tracking-tight">
                {week}. hét lezárása
              </Dialog.Title>
              <p className="text-[14px] text-muted">
                {pw.food} · {s.filledDays}/7 kitöltött nap
              </p>
            </div>
            <Dialog.Close
              className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Bezárás"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div
              className={cn(
                'flex items-start gap-3 rounded-2xl px-4 py-3.5',
                RESULT_STYLE[suggestion.result],
              )}
            >
              {RESULT_ICON[suggestion.result]}
              <div>
                <p className="font-semibold">Javaslat: {RESULT_LABELS[suggestion.result]}</p>
                <p className="mt-0.5 text-[14px] text-ink/85">{suggestion.summary}</p>
              </div>
            </div>
            {suggestion.reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-ink/85">
                {suggestion.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}

            <div className="mt-5">
              <CompareTable c={s.comparison} caption="Összevetés" />
            </div>

            {cleanCmp && cleanCmp.status === 'ok' && (
              <div className="mt-5 rounded-xl bg-surface-2 p-4">
                <p className="mb-3 text-[14px]">
                  Az előző hét reakciós volt, így a mostani javulás részben a visszaállásból is
                  adódhat. Összevetés az utolsó átment héttel ({cleanWeek}. hét):{' '}
                  <strong>
                    {cleanCmp.worsened.length
                      ? cleanCmp.worsened.map((k) => WORSEN_LABELS[k]).join(', ')
                      : 'nincs romlás'}
                  </strong>
                  .
                </p>
                <CompareTable c={cleanCmp} caption={`A ${cleanWeek}. héthez`} />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <span id="decision" className="label-caps">
                A döntésed
              </span>
              <Segmented<WeekResult>
                options={[
                  { value: 'pass', label: '✓ Átment' },
                  { value: 'reaction', label: '✗ Reakció' },
                  { value: 'unsure', label: '? Bizonytalan' },
                ]}
                value={result}
                onChange={setResult}
                labelledBy="decision"
                accent="plan"
              />
              <textarea
                className="input min-h-20"
                placeholder="Megjegyzés (pl. „2. naptól eldugult orr → tej kivéve”)"
                aria-label="Megjegyzés a hét eredményéhez"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {result === 'reaction' && (
                <label className="flex items-start gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={shift}
                    onChange={(e) => setShift(e.target.checked)}
                    className="mt-1 size-4 accent-[var(--plan)]"
                  />
                  <span>
                    Csúsztatás egy héttel: a következő hét visszaállás az alapra, a további ételek
                    egy héttel később jönnek (a tartalék hét erre van).
                  </span>
                </label>
              )}
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button variant="plan" onClick={() => void save()} disabled={!result}>
              Eredmény rögzítése
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
