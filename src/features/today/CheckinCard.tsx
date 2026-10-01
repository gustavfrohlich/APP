// A két nagy check-in kártya: kitöltendő (hangsúlyos), félbehagyott, kész (összefoglaló chipekkel).

import { Moon, Pencil, Sun } from 'lucide-react';
import { m } from 'framer-motion';
import { Button } from '@/components/Button';
import { ToneBadge } from '@/components/Tone';
import type { Baseline } from '@/domain/baseline';
import { DAY_Z, signedZ, toneOf, TONE_LABELS } from '@/domain/deviation';
import { checkinState } from '@/domain/entries';
import { formatDuration, formatNumber } from '@/domain/format';
import { DIET_LABELS } from '@/domain/io/journalColumns';
import { nightScore, nightTone } from '@/domain/nightScore';
import type { DayEntry } from '@/domain/types';
import { cn } from '@/lib/cn';

interface Props {
  kind: 'morning' | 'evening';
  entry?: DayEntry;
  baseline: Baseline;
  onOpen: () => void;
  /** Este 17:00 előtt halványabb, de kitölthető. */
  muted?: boolean;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="num inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[13px] font-medium ring-1 ring-line">
      {children}
    </span>
  );
}

function MorningChips({ e, baseline }: { e: DayEntry; baseline: Baseline }) {
  const hrvTone = toneOf(signedZ('hrvNight', e.hrvNight, baseline.hrvNight), DAY_Z);
  const score = nightScore(e, baseline);
  const tone = nightTone(score, 'day');
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
      {e.sleepMin !== undefined && <Chip>{formatDuration(e.sleepMin)} alvás</Chip>}
      {e.hrvNight !== undefined && (
        <Chip>
          HRV {formatNumber(e.hrvNight, 0)}
          {hrvTone && hrvTone !== 'neutral' && (
            <span className={hrvTone === 'good' ? 'text-good' : 'text-bad'}>
              {TONE_LABELS[hrvTone].symbol}
            </span>
          )}
        </Chip>
      )}
      {e.sleepQuality !== undefined && <Chip>érzésre {e.sleepQuality}/10</Chip>}
      {tone && <ToneBadge tone={tone} size="sm" />}
    </div>
  );
}

function EveningChips({ e }: { e: DayEntry }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
      {e.nose !== undefined && <Chip>orr {e.nose}</Chip>}
      {e.fatigue !== undefined && <Chip>fáradtság {e.fatigue}</Chip>}
      {e.postMealFatigue !== undefined && <Chip>evés után {e.postMealFatigue}</Chip>}
      {e.bloating !== undefined && <Chip>puffadás {e.bloating}</Chip>}
      {e.diet && <Chip>diéta: {DIET_LABELS[e.diet].toLowerCase()}</Chip>}
    </div>
  );
}

export function CheckinCard({ kind, entry, baseline, onOpen, muted }: Props) {
  const state = checkinState(entry, kind);
  const isMorning = kind === 'morning';
  const key = isMorning ? 'R' : 'E';
  const accent = isMorning ? 'night' : 'day';
  const title = isMorning ? 'Reggel' : 'Este';
  const subtitle = isMorning ? 'az éjszakáról' : 'a napról';
  const adjective = isMorning ? 'Reggeli' : 'Esti';

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'card relative flex min-h-[208px] flex-col overflow-hidden p-6',
        state !== 'done' &&
          (isMorning
            ? 'bg-[color-mix(in_oklab,var(--night)_9%,var(--surface))]'
            : 'bg-[color-mix(in_oklab,var(--day)_9%,var(--surface))]'),
        muted && state === 'todo' && 'opacity-80',
      )}
      aria-label={`${title} – ${subtitle}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full',
            state === 'done'
              ? isMorning
                ? 'bg-[color-mix(in_oklab,var(--night)_14%,var(--surface))] text-night'
                : 'bg-[color-mix(in_oklab,var(--day)_14%,var(--surface))] text-day'
              : isMorning
                ? 'bg-night text-white dark:text-[#121418]'
                : 'bg-day text-white dark:text-[#121418]',
          )}
        >
          {isMorning ? (
            <Sun className="size-5" aria-hidden />
          ) : (
            <Moon className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[24px] leading-tight font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {subtitle} ·{' '}
            {state === 'done'
              ? 'kész'
              : state === 'partial'
                ? 'félbehagytad, ott folytatod'
                : muted
                  ? 'inkább 17:00 után, de már most is kitöltheted'
                  : '30 másodperc'}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-5">
        {state === 'done' && entry ? (
          <div className="flex flex-col gap-3">
            {isMorning ? (
              <MorningChips e={entry} baseline={baseline} />
            ) : (
              <EveningChips e={entry} />
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil className="size-3.5" aria-hidden />}
              onClick={onOpen}
              tip="Szerkesztés"
              shortcut={key}
              aria-label={`${adjective} check-in szerkesztése`}
              className="-ml-3 self-start"
            >
              Szerkesztés
            </Button>
          </div>
        ) : (
          <Button
            variant={accent}
            size="lg"
            onClick={onOpen}
            shortcut={key}
            tip={`${adjective} check-in`}
            className="w-full"
          >
            {state === 'partial' ? 'Folytatom' : 'Kitöltöm'}
            <kbd className="ml-1 rounded border border-white/35 px-1.5 text-[12px] font-semibold dark:border-black/30">
              {key}
            </kbd>
          </Button>
        )}
      </div>
    </m.section>
  );
}
