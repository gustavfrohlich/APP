// „Ezen a héten” kártya: az új étel kiemelve, alatta chipekben minden most engedélyezett étel.
// Kibontva: mit eszel, tipp és bevásárlólista. Indulás előtt visszaszámláló.

import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Leaf, ShoppingBasket } from 'lucide-react';
import { Card } from '@/components/Card';
import { useAppData } from '@/data/context';
import { allowedFoods, kindOf } from '@/domain/plan';
import { cn } from '@/lib/cn';
import { readLocal, writeLocal } from '@/lib/localPref';

function countdownText(days: number): string {
  if (days === 1) return 'Holnap indul az 1. hét';
  if (days <= 6) return `Hétfőn indul az 1. hét · még ${days} nap`;
  return `${days} nap múlva indul az 1. hét`;
}

export function ThisWeekCard() {
  const { info, plan, currentWeek, settings } = useAppData();
  const [open, setOpen] = useState(false);
  const storeKey = `bazis.shop.${settings.startDate}.${currentWeek?.week ?? 0}`;
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(readLocal(storeKey) ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  if (info.phase === 'after') {
    return (
      <Card>
        <div className="label-caps mb-2 text-plan-ink">A kísérlet véget ért</div>
        <p className="font-serif text-2xl font-semibold">Megvan mind a {plan.length} hét!</p>
        <p className="mt-2 text-[15px] text-muted">
          Az Elemzésben megtalálod az összegzést és a nyomtatható orvosi összefoglalót.
        </p>
        <Link
          to="/elemzes#osszegzes"
          className="mt-4 inline-block font-medium text-plan-ink underline-offset-4 hover:underline"
        >
          Összegzés megnyitása →
        </Link>
      </Card>
    );
  }
  if (!currentWeek) return null;

  const week = currentWeek.week;
  const foods = allowedFoods(plan, week);
  const kind = kindOf(currentWeek);
  const newName = currentWeek.food.replace(/^\+\s*/, '');
  const toggle = (name: string) => {
    const next = checked.includes(name) ? checked.filter((x) => x !== name) : [...checked, name];
    setChecked(next);
    writeLocal(storeKey, JSON.stringify(next));
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="label-caps mb-2 flex items-center gap-2 text-plan-ink">
        <Leaf className="size-3.5" aria-hidden />
        {info.phase === 'before'
          ? countdownText(info.daysUntilStart)
          : `Ezen a héten · ${week}. hét`}
      </div>
      <p className="font-serif text-[26px] leading-snug font-semibold tracking-tight">
        <span className="mr-2 align-middle font-sans text-[13px] font-bold tracking-[0.08em] text-plan-ink uppercase">
          {kind === 'base'
            ? 'Bázis'
            : kind === 'washout'
              ? 'Visszaállás'
              : kind === 'reserve'
                ? 'Tartalék'
                : 'Új'}
        </span>
        {newName}
      </p>
      {currentWeek.tip && currentWeek.tip !== '–' && (
        <p className="mt-1 text-[15px] text-muted">{currentWeek.tip}</p>
      )}

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Most engedélyezett ételek">
        {foods.map((f) => (
          <li
            key={f.name}
            className={cn(
              'rounded-full px-2.5 py-1 text-[13px] font-medium',
              f.isNew
                ? 'bg-[color-mix(in_oklab,var(--plan)_20%,var(--surface))] text-plan-ink ring-1 ring-[color-mix(in_oklab,var(--plan)_45%,transparent)]'
                : 'bg-surface-2 text-ink/80',
            )}
          >
            {f.name}
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        Mit eszel és bevásárlólista
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4 border-t border-line pt-4">
          <div>
            <div className="label-caps mb-1">Mit eszel ezen a héten</div>
            <p className="text-[15px]">{currentWeek.eat}</p>
          </div>
          <div>
            <div className="label-caps mb-2 flex items-center gap-1.5">
              <ShoppingBasket className="size-3.5" aria-hidden /> Bevásárlólista
            </div>
            <ul className="grid grid-cols-2 gap-1">
              {foods
                .filter((f) => !['só', 'víz'].includes(f.name))
                .map((f) => (
                  <li key={f.name}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={checked.includes(f.name)}
                        onChange={() => toggle(f.name)}
                        className="size-4 accent-[var(--plan)]"
                      />
                      <span className={cn(checked.includes(f.name) && 'text-muted line-through')}>
                        {f.name}
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
          <Link
            to="/terv"
            className="text-[13px] font-medium text-plan-ink underline-offset-4 hover:underline"
          >
            A teljes terv és a szabályok →
          </Link>
        </div>
      )}
    </Card>
  );
}
