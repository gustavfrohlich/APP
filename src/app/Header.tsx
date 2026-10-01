// Fejléc: mindig látszik, hányadik hét van és mi az új étel; demó-jelzés; parancspaletta és beállítások.

import { Link } from 'react-router';
import { FlaskConical, Search, Settings } from 'lucide-react';
import { Tip } from '@/components/Tip';
import { useAppData, useRepo } from '@/data/context';
import { kindOf } from '@/domain/plan';
import { modKey } from '@/lib/platform';

function WeekChip() {
  const { info, currentWeek, plan } = useAppData();
  if (!currentWeek && info.phase !== 'after') return null;
  let text: string;
  if (info.phase === 'before') {
    text = `${info.daysUntilStart <= 6 ? 'Hétfőn' : `${info.daysUntilStart} nap múlva`} indul az 1. hét · ${currentWeek!.food}`;
  } else if (info.phase === 'after') {
    text = `Kész mind a ${plan.length} hét`;
  } else {
    const w = currentWeek!;
    const kind = kindOf(w);
    const food = w.food.replace(/^\+\s*/, '');
    const prefix =
      kind === 'test'
        ? 'ÚJ: '
        : kind === 'base'
          ? 'Bázis: '
          : kind === 'washout'
            ? ''
            : 'Tartalék: ';
    text = `${w.week}. hét · ${prefix}${food}`;
  }
  return (
    <Link
      to="/terv"
      className="flex min-w-0 items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plan)_14%,var(--surface))] px-3.5 py-1.5 text-[14px] font-semibold text-plan-ink transition-colors hover:bg-[color-mix(in_oklab,var(--plan)_22%,var(--surface))]"
    >
      <span className="size-2 shrink-0 rounded-full bg-plan" aria-hidden />
      <span className="truncate">{text}</span>
    </Link>
  );
}

export function Header() {
  const { mode } = useRepo();
  return (
    <header className="no-print sticky top-0 z-20 bg-[var(--nav-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <WeekChip />
          {mode === 'demo' && (
            <Tip label="Kitalált adatok – a valódiakat nem érinti">
              <Link
                to="/beallitasok#adatok"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-fill px-3 py-1.5 text-[13px] font-semibold text-amber"
              >
                <FlaskConical className="size-3.5" aria-hidden /> Demó
              </Link>
            </Tip>
          )}
        </div>
        <Tip label="Parancsok" shortcut={`${modKey()}+K`}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('bazis:palette'))}
            className="flex h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-muted ring-1 ring-line transition-colors ring-inset hover:bg-surface-2 hover:text-ink"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="size-4" aria-hidden />
            <span className="sr-only md:not-sr-only">Parancsok</span>
            <kbd className="kbd hidden md:inline-flex">{modKey()} K</kbd>
          </button>
        </Tip>
        <Tip label="Beállítások">
          <Link
            to="/beallitasok"
            aria-label="Beállítások"
            className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Settings className="size-[20px]" aria-hidden />
          </Link>
        </Tip>
      </div>
    </header>
  );
}
