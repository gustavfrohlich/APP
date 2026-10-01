// Szegmens-választó (rádiócsoport) nagy kattintási felülettel.
// Billentyűzet: ←/→ léptet, 1…n vagy a felirat kezdőbetűje választ, Enter elfogadja a javaslatot.

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useLatest } from '@/lib/useLatest';

export interface SegmentOption<T extends string | boolean> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Gyorsbillentyű (alapból a felirat kezdőbetűje). */
  key?: string;
}

export interface SegmentedProps<T extends string | boolean> {
  options: SegmentOption<T>[];
  value?: T;
  suggested?: T;
  onChange: (v: T) => void;
  onCommit?: (v: T) => void;
  label?: string;
  labelledBy?: string;
  size?: 'md' | 'lg' | 'sm';
  accent?: 'night' | 'day' | 'plan';
  className?: string;
}

const ACCENT = {
  night: 'bg-night text-white dark:text-[#121418]',
  day: 'bg-day text-white dark:text-[#121418]',
  plan: 'bg-plan-ink text-white dark:text-[#121418]',
};

export function Segmented<T extends string | boolean>({
  options,
  value,
  suggested,
  onChange,
  onCommit,
  label,
  labelledBy,
  size = 'md',
  accent = 'night',
  className,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const commitRef = useLatest(onCommit);
  const index = options.findIndex((o) => o.value === (value ?? suggested));

  const choose = (i: number, advance: boolean) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    refs.current[i]?.focus();
    window.clearTimeout(timer.current);
    if (advance && commitRef.current)
      timer.current = window.setTimeout(() => commitRef.current?.(o.value), 250);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      choose(index < 0 ? 0 : (index + 1) % options.length, false);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      choose(index < 0 ? options.length - 1 : (index - 1 + options.length) % options.length, false);
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= options.length) {
      e.preventDefault();
      choose(Number(e.key) - 1, true);
    } else if (e.key.length === 1 && /\p{L}/u.test(e.key)) {
      const k = e.key.toLowerCase();
      const i = options.findIndex((o) => (o.key ?? o.label.charAt(0)).toLowerCase() === k);
      if (i >= 0) {
        e.preventDefault();
        choose(i, true);
      }
    }
  };

  const h =
    size === 'lg' ? 'h-12 text-[15px]' : size === 'sm' ? 'h-9 text-[13px]' : 'h-11 text-[15px]';

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex rounded-xl bg-surface-2 p-1 ring-1 ring-line ring-inset',
        className,
      )}
    >
      {options.map((o, i) => {
        const selected = value !== undefined && o.value === value;
        const isSuggested = value === undefined && suggested !== undefined && o.value === suggested;
        const tabbable = i === (index < 0 ? 0 : index);
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => choose(i, true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                choose(i, true);
              }
            }}
            className={cn(
              h,
              'flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3.5 font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
              selected
                ? cn(ACCENT[accent], 'shadow-sm')
                : 'text-muted hover:bg-surface hover:text-ink',
              isSuggested &&
                'bg-surface text-ink/75 outline-[1.5px] -outline-offset-[1.5px] outline-muted/70 outline-dashed',
            )}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
