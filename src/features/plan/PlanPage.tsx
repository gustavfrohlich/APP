// Terv: függőleges idővonal a hetekről (hét, dátumok, étel, állapot), kibontva a részletek és a
// szerkesztés; a jövőbeli hetek sorrendje húzással (vagy a ↑/↓ gombokkal) módosítható; tartalék hét,
// „Csúsztatás egy héttel” reakció után; „Ami eddig átment” és szabálykártya.

import { useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  ChevronDown,
  GripVertical,
  Pencil,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAppData, useRepo } from '@/data/context';
import { useWeekly } from '@/data/useDerived';
import { formatDateFull, formatRange } from '@/domain/format';
import {
  kindOf,
  moveWeek,
  passedFoods,
  planItems,
  PLAN_RULES,
  shiftAfter,
  weekStatus,
} from '@/domain/plan';
import { canCloseWeek } from '@/domain/summary';
import type { PlanWeek } from '@/domain/types';
import { resultText } from '@/domain/verdict';
import { WORSEN_LABELS } from '@/domain/weekly';
import { dietWeekRange } from '@/domain/weeks';
import { cn } from '@/lib/cn';

const STATUS_TEXT = {
  future: 'Jövőbeli',
  current: 'Aktuális',
  closed: 'Lezárva',
  open: 'Lezáratlan',
} as const;

function ResultPill({ w }: { w: PlanWeek }) {
  if (!w.result) return null;
  const cls =
    w.result === 'pass'
      ? 'bg-good-fill text-good'
      : w.result === 'reaction'
        ? 'bg-bad-fill text-bad'
        : 'bg-amber-fill text-amber';
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', cls)}>
      {resultText(w.result)}
    </span>
  );
}

function WeekEditor({ w, onDone }: { w: PlanWeek; onDone: () => void }) {
  const { repo } = useRepo();
  const [food, setFood] = useState(
    kindOf(w) === 'reserve' && /tartalék/i.test(w.food) ? '' : w.food,
  );
  const [eat, setEat] = useState(w.eat);
  const [tip, setTip] = useState(w.tip);
  const save = async () => {
    const f = food.trim() || w.food;
    const becomesTest = kindOf(w) === 'reserve' && !/tartalék/i.test(f);
    await repo.updateWeek(w.week, {
      food: f,
      eat: eat.trim(),
      tip: tip.trim(),
      ...(becomesTest ? { kind: 'test' } : {}),
    });
    onDone();
  };
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="grid gap-1 text-[13px] font-medium">
        Új étel (ez látszik mindenhol)
        <input
          className="input"
          value={food}
          autoFocus
          placeholder={kindOf(w) === 'reserve' ? 'pl. hagyma + fokhagyma külön' : '+ új étel'}
          onChange={(e) => setFood(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-[13px] font-medium">
        Mit eszel ezen a héten
        <textarea className="input min-h-16" value={eat} onChange={(e) => setEat(e.target.value)} />
      </label>
      <label className="grid gap-1 text-[13px] font-medium">
        Adag / tipp
        <input className="input" value={tip} onChange={(e) => setTip(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="plan" size="sm">
          Mentés
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Mégse
        </Button>
      </div>
    </form>
  );
}

export default function PlanPage() {
  const { plan, settings, info } = useAppData();
  const { repo } = useRepo();
  const summaries = useWeekly();
  const [open, setOpen] = useState<number | null>(info.phase === 'running' ? info.week : null);
  const [editing, setEditing] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [shiftFor, setShiftFor] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(true);
  const current =
    info.phase === 'before' ? 0 : info.phase === 'after' ? plan.length + 1 : info.week;
  const passed = passedFoods(plan);

  useEffect(() => {
    // Nyitáskor az aktuális hét kerül középre.
    document.getElementById(`week-${current}`)?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (from: number, to: number) => void repo.savePlan(moveWeek(plan, from, to, current));

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragging !== null && dragging !== to) move(dragging, to);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="pt-6">
      <div className="mb-6">
        <h1 className="font-serif text-[40px] leading-tight font-semibold tracking-[-0.02em]">
          Terv
        </h1>
        <p className="text-[15px] text-muted">
          {plan.length} hét · kezdés: {formatDateFull(settings.startDate)} · minden új étel hétfőn
          indul, ami átment, marad.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="relative flex flex-col gap-3" aria-label="A hetek idővonala">
          <span aria-hidden className="absolute top-6 bottom-6 left-[27px] w-0.5 rounded bg-line" />
          {plan.map((w) => {
            const status = weekStatus(w, current);
            const range = dietWeekRange(w.week, settings.startDate);
            const isOpen = open === w.week;
            const isFuture = w.week > current;
            const s = summaries[w.week - 1];
            const kind = kindOf(w);
            const movable = isFuture && kind !== 'base';
            return (
              <li
                id={`week-${w.week}`}
                key={`${w.week}-${w.food}`}
                draggable={movable && editing === null}
                onDragStart={(e) => {
                  setDragging(w.week);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onDragOver={(e) => {
                  if (dragging !== null && movable) {
                    e.preventDefault();
                    setOver(w.week);
                  }
                }}
                onDrop={(e) => onDrop(e, w.week)}
                className={cn(
                  'relative flex gap-4 transition-opacity',
                  dragging === w.week && 'opacity-40',
                  over === w.week && dragging !== w.week && '[&>div]:ring-2 [&>div]:ring-plan',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'z-[1] mt-4 grid size-[56px] shrink-0 place-items-center rounded-full font-serif text-lg font-semibold ring-4 ring-bg',
                    status === 'current' && 'bg-plan-ink text-white dark:text-[#121418]',
                    status === 'future' &&
                      'bg-surface text-muted ring-4 [box-shadow:inset_0_0_0_2px_var(--line)] ring-bg',
                    status === 'open' && 'bg-amber-fill text-amber',
                    status === 'closed' &&
                      (w.result === 'pass'
                        ? 'bg-good-fill text-good'
                        : w.result === 'reaction'
                          ? 'bg-bad-fill text-bad'
                          : 'bg-amber-fill text-amber'),
                  )}
                >
                  {w.week}
                </span>
                <div
                  className={cn(
                    'card min-w-0 flex-1 p-0',
                    status === 'current' &&
                      'ring-2 ring-[color-mix(in_oklab,var(--plan)_55%,transparent)]',
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : w.week)}
                    className="flex w-full items-center gap-3 rounded-[22px] px-5 py-4 text-left hover:bg-surface-2/50"
                  >
                    {isFuture && (
                      <GripVertical
                        className="size-4 shrink-0 cursor-grab text-muted"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[13px] font-semibold text-muted">{w.week}. hét</span>
                        <span className="text-[13px] text-muted">
                          {formatRange(range.from, range.to)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                            status === 'current'
                              ? 'bg-plan-ink text-white dark:text-[#121418]'
                              : 'bg-surface-2 text-muted',
                          )}
                        >
                          {STATUS_TEXT[status]}
                        </span>
                        {kind === 'base' && (
                          <span className="text-[12px] text-muted">bázisépítés</span>
                        )}
                        {kind === 'washout' && (
                          <span className="text-[12px] text-muted">visszaállás</span>
                        )}
                      </div>
                      <div className="mt-1 truncate font-serif text-[20px] font-semibold tracking-tight">
                        {w.food}
                      </div>
                    </div>
                    <ResultPill w={w} />
                    <ChevronDown
                      className={cn(
                        'size-5 shrink-0 text-muted transition-transform',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-line px-5 py-4 text-[15px]">
                      {editing === w.week ? (
                        <WeekEditor w={w} onDone={() => setEditing(null)} />
                      ) : (
                        <>
                          <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <dt className="label-caps mb-1">Mit eszel</dt>
                              <dd>{w.eat || '–'}</dd>
                            </div>
                            <div>
                              <dt className="label-caps mb-1">Adag / tipp</dt>
                              <dd>{w.tip || '–'}</dd>
                            </div>
                            {planItems(w.food).length > 0 && (
                              <div className="sm:col-span-2">
                                <dt className="label-caps mb-1">Ételek</dt>
                                <dd className="flex flex-wrap gap-1.5">
                                  {planItems(w.food).map((it) => (
                                    <span
                                      key={it}
                                      className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[13px]"
                                    >
                                      {it}
                                    </span>
                                  ))}
                                </dd>
                              </div>
                            )}
                            {(w.result || s?.comparison.status === 'ok') && (
                              <div className="sm:col-span-2">
                                <dt className="label-caps mb-1">Eredmény</dt>
                                <dd className="flex flex-col gap-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    {w.result ? (
                                      <ResultPill w={w} />
                                    ) : (
                                      <span className="text-muted">még nincs lezárva</span>
                                    )}
                                    {s?.comparison.status === 'ok' && (
                                      <span className="text-[13px] text-muted">
                                        romlás az előző héthez:{' '}
                                        {s.comparison.worsened.length
                                          ? s.comparison.worsened
                                              .map((k) => WORSEN_LABELS[k])
                                              .join(', ')
                                          : 'nincs'}
                                      </span>
                                    )}
                                  </span>
                                  {w.resultNote && (
                                    <span className="text-ink/85">{w.resultNote}</span>
                                  )}
                                </dd>
                              </div>
                            )}
                          </dl>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Pencil className="size-3.5" aria-hidden />}
                              onClick={() => setEditing(w.week)}
                            >
                              {kind === 'reserve' ? 'Tartalék hét felhasználása' : 'Szerkesztés'}
                            </Button>
                            {!w.result && canCloseWeek(w.week, info) && (
                              <Link
                                to={`/elemzes?lezaras=${w.week}`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-plan-ink px-3 text-[13px] font-medium text-white dark:text-[#121418]"
                              >
                                <CalendarCheck className="size-3.5" aria-hidden /> Hét lezárása
                              </Link>
                            )}
                            {w.result === 'reaction' &&
                              w.week < plan.length &&
                              kindOf(plan[w.week]!) !== 'washout' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={<Undo2 className="size-3.5" aria-hidden />}
                                  onClick={() => setShiftFor(w.week)}
                                >
                                  Csúsztatás egy héttel
                                </Button>
                              )}
                            {movable && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={<ArrowUp className="size-3.5" aria-hidden />}
                                  disabled={
                                    w.week - 1 <= current || kindOf(plan[w.week - 2]!) === 'base'
                                  }
                                  onClick={() => {
                                    move(w.week, w.week - 1);
                                    setOpen(w.week - 1);
                                  }}
                                >
                                  Feljebb
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={<ArrowDown className="size-3.5" aria-hidden />}
                                  disabled={w.week >= plan.length}
                                  onClick={() => {
                                    move(w.week, w.week + 1);
                                    setOpen(w.week + 1);
                                  }}
                                >
                                  Lejjebb
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="flex flex-col gap-6">
          <Card>
            <h2 className="label-caps mb-3 text-plan-ink">Ami eddig átment</h2>
            {passed.length ? (
              <ul className="flex flex-col gap-2">
                {passed.map((p) => (
                  <li key={p.week} className="flex items-start gap-2">
                    <span className="mt-0.5 text-good" aria-hidden>
                      ✓
                    </span>
                    <span>
                      <span className="text-muted">{p.week}. hét:</span>{' '}
                      {p.items.join(', ') || p.food}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">
                Még nincs lezárt, átment hét. Vasárnaponként zárd le a hetet.
              </p>
            )}
          </Card>
          <Card>
            <button
              type="button"
              aria-expanded={rulesOpen}
              onClick={() => setRulesOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="label-caps">Szabályok</h2>
              <ChevronDown
                className={cn('size-4 text-muted transition-transform', rulesOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {rulesOpen && (
              <ol className="mt-3 flex flex-col gap-2.5 text-[14px] leading-relaxed">
                {PLAN_RULES.map((r, i) => (
                  <li key={r} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold">
                      {i + 1}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={shiftFor !== null}
        onOpenChange={(o) => !o && setShiftFor(null)}
        title="Csúsztatás egy héttel?"
        description="A reakciós hét utánra egy „visszaállás az alapra” hét kerül, a további ételek egy héttel később jönnek. Ha a tartalék hét még szabad, az fogy el; különben a terv egy héttel hosszabb lesz."
        confirmLabel="Csúsztatás"
        danger={false}
        onConfirm={() => {
          if (shiftFor !== null) void repo.savePlan(shiftAfter(plan, shiftFor));
          setShiftFor(null);
        }}
      />
    </div>
  );
}
