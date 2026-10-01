// Középre úszó check-in panel (kb. 720 px), mögötte elhalványítva az aktuális képernyő.
// Esc bezár; minden válasz azonnal mentődik, így bármikor félbehagyható.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, m } from 'framer-motion';
import { Check, Moon, Sun, X } from 'lucide-react';
import { SuccessCheck } from '@/components/SuccessCheck';
import { useAppData } from '@/data/context';
import { formatDateLong } from '@/domain/format';
import type { ISODate } from '@/domain/types';
import { dietWeek } from '@/domain/weeks';
import { cn } from '@/lib/cn';
import { CheckinContext, type CheckinApi, type CheckinKind } from './context';
import { EveningForm } from './EveningForm';
import { MorningForm } from './MorningForm';
import { useDayDraft } from './useDayDraft';

export function CheckinProvider({ children }: { children: ReactNode }) {
  const { today } = useAppData();
  const [current, setCurrent] = useState<
    { kind: CheckinKind; date: ISODate; key: number } | undefined
  >();
  const counter = useRef(0);

  const open = useCallback(
    (kind: CheckinKind, date?: ISODate) =>
      setCurrent({ kind, date: date ?? today, key: ++counter.current }),
    [today],
  );
  const close = useCallback(() => setCurrent(undefined), []);
  const api = useMemo<CheckinApi>(() => ({ open, close, current }), [open, close, current]);

  return (
    <CheckinContext.Provider value={api}>
      {children}
      <Dialog.Root open={!!current} onOpenChange={(o) => !o && close()}>
        <AnimatePresence>
          {current && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <m.div
                  className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                forceMount
                aria-describedby={undefined}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <m.div
                  className="fixed inset-x-0 top-[4vh] z-50 mx-auto flex max-h-[92vh] w-[min(760px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-lg)] ring-1 ring-[var(--card-border)] outline-none"
                  initial={{ opacity: 0, y: 24, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <CheckinPanel
                    key={current.key}
                    kind={current.kind}
                    date={current.date}
                    onClose={close}
                  />
                </m.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </CheckinContext.Provider>
  );
}

function CheckinPanel({
  kind,
  date,
  onClose,
}: {
  kind: CheckinKind;
  date: ISODate;
  onClose: () => void;
}) {
  const { settings, plan, today } = useAppData();
  const { draft, update, saving } = useDayDraft(date);
  const [done, setDone] = useState(false);
  const isMorning = kind === 'morning';
  const week = dietWeek(date, settings.startDate);
  const food = plan.find((w) => w.week === week)?.food;

  const finish = () => {
    const now = new Date().toISOString();
    update(
      isMorning
        ? { morningDoneAt: draft.morningDoneAt ?? now }
        : { eveningDoneAt: draft.eveningDoneAt ?? now },
    );
    setDone(true);
    window.setTimeout(onClose, 1100);
  };

  return (
    <>
      <header
        className={cn(
          'flex items-center gap-4 border-b border-line px-6 py-4',
          isMorning
            ? 'bg-[color-mix(in_oklab,var(--night)_7%,var(--surface))]'
            : 'bg-[color-mix(in_oklab,var(--day)_7%,var(--surface))]',
        )}
      >
        <span
          className={cn(
            'grid size-10 place-items-center rounded-full text-white dark:text-[#121418]',
            isMorning ? 'bg-night' : 'bg-day',
          )}
        >
          {isMorning ? (
            <Sun className="size-5" aria-hidden />
          ) : (
            <Moon className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-serif text-[22px] leading-tight font-semibold tracking-tight">
            {isMorning ? 'Reggel – az éjszakáról' : 'Este – a napról'}
          </Dialog.Title>
          <p className="truncate text-[13px] text-muted">
            {date === today ? 'Ma, ' : ''}
            {formatDateLong(date)}
            {week >= 1 && week <= plan.length && food
              ? ` · ${week}. hét · ${food.replace(/^\+\s*/, 'új: ')}`
              : ''}
          </p>
        </div>
        <Dialog.Close
          className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Bezárás (Esc)"
          title="Bezárás (Esc)"
        >
          <X className="size-5" aria-hidden />
        </Dialog.Close>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {done ? (
          <m.div
            className="flex flex-col items-center gap-3 py-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SuccessCheck color={isMorning ? 'var(--night)' : 'var(--day)'} size={64} />
            <p className="font-serif text-2xl font-semibold">
              {isMorning ? 'Kész – szép napot!' : 'Kész – jó éjszakát!'}
            </p>
            <p className="text-muted">Minden elmentve.</p>
          </m.div>
        ) : isMorning ? (
          <MorningForm draft={draft} update={update} onFinish={finish} />
        ) : (
          <EveningForm draft={draft} update={update} onFinish={finish} />
        )}
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-line px-6 py-3 text-[12px] text-muted">
        <span className="flex items-center gap-1.5" aria-live="polite">
          <Check className="size-3.5" aria-hidden />
          {saving ? 'Mentés…' : 'Minden válasz azonnal mentődik'}
        </span>
        <span className="hidden gap-3 sm:flex">
          <span>
            <kbd className="kbd">Tab</kbd> következő
          </span>
          <span>
            <kbd className="kbd">0–10</kbd> skála
          </span>
          <span>
            <kbd className="kbd">Esc</kbd> bezár
          </span>
        </span>
      </footer>
    </>
  );
}
