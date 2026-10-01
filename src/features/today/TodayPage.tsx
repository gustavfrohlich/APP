// Ma (kezdőképernyő): fejléc, két check-in kártya, pótlás; jobbra „Ezen a héten”, az éjszaka
// eredménye és a hét csík. Keskeny ablakban egy oszlopba rendeződik.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, Download, Flame, History } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAppData, useRepo } from '@/data/context';
import { downloadBackup, supportsFolderAutosave } from '@/data/backup';
import { addDays, weekdayIndex } from '@/domain/dates';
import { article, capitalize, formatDateLong } from '@/domain/format';
import { catchUpForYesterday, streak } from '@/domain/streak';
import { useCheckin } from '@/features/checkin/context';
import { CheckinCard } from './CheckinCard';
import { NightCard } from './NightCard';
import { ThisWeekCard } from './ThisWeekCard';
import { useLetterShortcut } from './useShortcut';
import { WeekStrip } from './WeekStrip';

function greeting(hour: number): string {
  if (hour < 10) return 'Jó reggelt!';
  if (hour < 17) return 'Szép napot!';
  return 'Jó estét!';
}

function useHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = window.setInterval(() => setH(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return h;
}

export function TodayPage() {
  const { today, entries, baseline, settings, info, plan, currentWeek } = useAppData();
  const { realRepo, mode } = useRepo();
  const checkin = useCheckin();
  const hour = useHour();
  const entry = entries.get(today);
  const n = streak(entries, today);
  const catchUp = catchUpForYesterday(entries, settings.startDate, today);

  useLetterShortcut('r', () => checkin.open('morning'));
  useLetterShortcut('e', () => checkin.open('evening'));

  const isSunday = weekdayIndex(today) === 6;
  const weekOpen = info.phase === 'running' && currentWeek && !currentWeek.result;
  const lastOffered = settings.autosave?.lastOfferedAt;
  const offerBackup =
    mode === 'real' &&
    isSunday &&
    !supportsFolderAutosave() &&
    (!lastOffered || lastOffered.slice(0, 10) < addDays(today, -5));

  return (
    <div className="@container pt-6">
      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[15px] text-muted">{greeting(hour)}</p>
              <h1 className="font-serif text-[40px] leading-tight font-semibold tracking-[-0.02em]">
                {capitalize(formatDateLong(today))}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
                {info.phase === 'running' && (
                  <span className="rounded-full bg-[color-mix(in_oklab,var(--plan)_16%,var(--surface))] px-3 py-1 font-semibold text-plan-ink">
                    {info.week}. hét · {info.dayInWeek}/7. nap
                  </span>
                )}
                {info.phase === 'before' && (
                  <span className="rounded-full bg-surface-2 px-3 py-1 font-medium text-muted">
                    Alapidőszak · az 1. hét {info.daysUntilStart} nap múlva indul
                  </span>
                )}
                {n > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-medium ring-1 ring-line">
                    <Flame className="size-4 text-day" aria-hidden />
                    {n} napos sorozat
                  </span>
                )}
              </div>
            </div>
          </header>

          {isSunday && weekOpen && (
            <Card className="flex flex-wrap items-center justify-between gap-4 bg-[color-mix(in_oklab,var(--plan)_10%,var(--surface))]">
              <div className="flex items-center gap-3">
                <CalendarCheck className="size-5 text-plan-ink" aria-hidden />
                <div>
                  <p className="font-semibold">
                    Vasárnap van – ideje lezárni {article(String(currentWeek.week))}{' '}
                    {currentWeek.week}. hetet
                  </p>
                  <p className="text-[14px] text-muted">
                    Javaslatot kapsz indoklással, a döntés a tiéd.
                  </p>
                </div>
              </div>
              <Link
                to="/elemzes?lezaras=1"
                className="inline-flex h-10 items-center rounded-xl bg-plan px-4 font-medium text-white dark:text-[#121418]"
              >
                Hét lezárása
              </Link>
            </Card>
          )}

          <div className="grid gap-4 @2xl:grid-cols-2">
            <CheckinCard
              kind="morning"
              entry={entry}
              baseline={baseline}
              onOpen={() => checkin.open('morning')}
            />
            <CheckinCard
              kind="evening"
              entry={entry}
              baseline={baseline}
              onOpen={() => checkin.open('evening')}
              muted={hour < 17}
            />
          </div>

          {catchUp && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-3.5">
              <p className="flex items-center gap-2 text-[15px]">
                <History className="size-4 text-muted" aria-hidden />
                {catchUp.morning && catchUp.evening
                  ? 'Tegnap kimaradt a reggeli és az esti check-in – pótolod?'
                  : catchUp.evening
                    ? 'Tegnap este kimaradt – pótolod? (30 mp)'
                    : 'Tegnap reggel kimaradt – pótolod? (30 mp)'}
              </p>
              <div className="flex gap-2">
                {catchUp.morning && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => checkin.open('morning', catchUp.date)}
                  >
                    Tegnap reggel
                  </Button>
                )}
                {catchUp.evening && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => checkin.open('evening', catchUp.date)}
                  >
                    Tegnap este
                  </Button>
                )}
              </div>
            </div>
          )}

          {offerBackup && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 px-5 py-3.5">
              <p className="text-[15px]">
                Heti biztonsági mentés: egy kattintás, és nem vész el semmi.
              </p>
              <Button
                size="sm"
                icon={<Download className="size-4" aria-hidden />}
                onClick={() => void downloadBackup(realRepo)}
              >
                Mentés letöltése
              </Button>
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Ezen a héten">
          <ThisWeekCard />
          <NightCard entry={entry} baseline={baseline} />
          <Card>
            <div className="label-caps mb-3 flex items-center justify-between">
              <span>A hét</span>
              <span className="font-normal tracking-normal normal-case">
                <span className="text-night">◐</span> reggel · <span className="text-day">◑</span>{' '}
                este
              </span>
            </div>
            <WeekStrip today={today} entries={entries} start={settings.startDate} />
            {plan.length > 0 && info.phase === 'running' && (
              <p className="mt-3 text-[13px] text-muted">
                A heti alvásátlag keddtől a következő hétfő reggelig számol.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
