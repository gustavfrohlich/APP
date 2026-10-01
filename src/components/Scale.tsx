// Skála: 10 vagy 11 kerek gomb egy sorban, a skála színeivel, két végén horgony-szöveggel.
// Billentyűzet: számjegy (az „1” után fél másodpercig vár egy „0”-ra → 10), ←/→ léptet,
// Enter/Szóköz választ. Választás után 250 ms-mal továbblép (onCommit).

import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { useLatest } from '@/lib/useLatest';
import { valueFill } from './scaleColor';

export interface ScaleProps {
  value?: number;
  suggested?: number;
  min: number;
  max: number;
  /** Magasabb a jobb (alvásminőség): a színek fordítva. */
  reversed?: boolean;
  anchors: [string, string];
  labelledBy?: string;
  label?: string;
  onChange: (v: number) => void;
  /** Továbblépés (kiválasztás után 250 ms-mal), a választott értékkel. */
  onCommit?: (v: number) => void;
  size?: 'md' | 'sm';
  autoFocus?: boolean;
}

export function Scale({
  value,
  suggested,
  min,
  max,
  reversed = false,
  anchors,
  labelledBy,
  label,
  onChange,
  onCommit,
  size = 'md',
}: ScaleProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const pending = useRef<number | undefined>(undefined);
  const commitTimer = useRef<number | undefined>(undefined);
  const anchorId = useId();
  const commitRef = useLatest(onCommit);

  useEffect(
    () => () => {
      window.clearTimeout(pending.current);
      window.clearTimeout(commitTimer.current);
    },
    [],
  );

  const focusValue = (v: number) => refs.current[v - min]?.focus();

  const choose = (v: number, advance: boolean) => {
    onChange(v);
    focusValue(v);
    window.clearTimeout(commitTimer.current);
    if (advance && commitRef.current)
      commitTimer.current = window.setTimeout(() => commitRef.current?.(v), 250);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const current = value ?? suggested;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      choose(current === undefined ? min : Math.min(max, current + 1), false);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      choose(current === undefined ? max : Math.max(min, current - 1), false);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      choose(min, false);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      choose(max, false);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const d = Number(e.key);
      if (pending.current !== undefined) {
        window.clearTimeout(pending.current);
        pending.current = undefined;
        if (d === 0 && max >= 10) {
          choose(10, true);
          return;
        }
        // Az „1” véglegesül, a mostani számjegy pedig a következő kérdésé lesz.
        onChange(1);
        commitRef.current?.(1);
        const key = e.key;
        window.setTimeout(() => {
          document.activeElement?.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true }),
          );
        }, 60);
        return;
      }
      if (d === 1 && max >= 10) {
        // „1” után fél másodpercig várunk egy „0”-ra.
        pending.current = window.setTimeout(() => {
          pending.current = undefined;
          choose(1, true);
        }, 500);
        focusValue(1);
        return;
      }
      if (d >= min && d <= max) choose(d, true);
    }
  };

  const tabStop = value ?? suggested ?? min;
  const btn = size === 'md' ? 'size-11 text-[15px]' : 'size-9 text-[13px]';

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        aria-describedby={anchorId}
        onKeyDown={onKeyDown}
        className={cn(
          'flex flex-wrap items-center',
          size === 'md' ? 'justify-between gap-1.5' : 'gap-1',
        )}
      >
        {values.map((v) => {
          const selected = value === v;
          const isSuggested = value === undefined && suggested === v;
          return (
            <button
              key={v}
              ref={(el) => {
                refs.current[v - min] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={String(v)}
              tabIndex={v === tabStop ? 0 : -1}
              onClick={() => choose(v, true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  choose(v, true);
                }
              }}
              style={{
                // A nem választott értékeknél csak a háttér halványul, a szám olvasható marad.
                background:
                  !selected && value !== undefined
                    ? `color-mix(in oklab, ${valueFill(v, min, max, reversed)} 40%, var(--surface))`
                    : valueFill(v, min, max, reversed),
              }}
              className={cn(
                btn,
                'num grid shrink-0 place-items-center rounded-full font-semibold text-scale-ink transition-[transform,box-shadow,background-color] duration-150 outline-none',
                'hover:scale-[1.08] focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                selected && 'scale-[1.12] shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]',
                isSuggested && 'outline-2 outline-offset-2 outline-muted outline-dashed',
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div id={anchorId} className="flex justify-between text-[12px] text-muted">
        <span>
          {min} = {anchors[0]}
        </span>
        <span>
          {max} = {anchors[1]}
        </span>
      </div>
    </div>
  );
}
