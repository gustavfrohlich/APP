// Léptető: nagy − és + gomb, középen a szám; ↑/↓ billentyűvel és görgetéssel is állítható.

import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLatest } from '@/lib/useLatest';

export interface StepperProps {
  value?: number;
  suggested?: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
}

export function Stepper({ value, suggested, min, max, onChange, label, unit }: StepperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = value ?? suggested;
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  const base = shown ?? min;

  // Görgetés: nem passzív figyelő kell, hogy az oldal ne görögjön közben.
  const latest = useLatest({ base, set });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el && !el.contains(document.activeElement)) return;
      e.preventDefault();
      latest.current.set(latest.current.base + (e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [latest]);

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line ring-inset">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label} csökkentése`}
        onClick={() => set(base - 1)}
        disabled={shown !== undefined && shown <= min}
        className="grid size-9 place-items-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <div
        ref={ref}
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={shown === undefined ? 'nincs megadva' : `${shown}${unit ? ` ${unit}` : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') {
            e.preventDefault();
            set(base + 1);
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') {
            e.preventDefault();
            set(base - 1);
          } else if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            set(Number(e.key));
          }
        }}
        className={cn(
          'num grid h-9 min-w-10 place-items-center rounded-lg px-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-night',
          value === undefined && 'text-muted italic',
        )}
      >
        {shown ?? '–'}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label} növelése`}
        onClick={() => set(base + 1)}
        disabled={shown !== undefined && shown >= max}
        className="grid size-9 place-items-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
