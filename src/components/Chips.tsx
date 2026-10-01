// Chipek: egy- vagy többválasztós, opcionálisan saját elem hozzáadásával.

import { useState, type KeyboardEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

const chipBase =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-150';
const chipOff =
  'bg-surface-2 text-ink/80 ring-1 ring-inset ring-line hover:bg-line/60 hover:text-ink';

/** Egyválasztós chipek (rádiócsoport). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  onCommit,
  label,
  accent = 'day',
}: {
  options: ChipOption<T>[];
  value?: T;
  onChange: (v: T) => void;
  onCommit?: () => void;
  label: string;
  accent?: 'night' | 'day';
}) {
  const index = options.findIndex((o) => o.value === value);
  const on =
    accent === 'day'
      ? 'bg-day text-white dark:text-[#121418]'
      : 'bg-night text-white dark:text-[#121418]';
  const pick = (i: number, advance: boolean, el?: HTMLElement | null) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    el?.focus();
    if (advance && onCommit) window.setTimeout(onCommit, 250);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const i =
        (index < 0 ? 0 : index + (e.key === 'ArrowRight' ? 1 : -1) + options.length) %
        options.length;
      pick(i, false, buttons[i]);
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= options.length) {
      e.preventDefault();
      pick(Number(e.key) - 1, true, buttons[Number(e.key) - 1]);
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === (index < 0 ? 0 : index) ? 0 : -1}
            onClick={(e) => pick(i, true, e.currentTarget)}
            className={cn(chipBase, selected ? on : chipOff)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Többválasztós chipek, saját elem felvételével. */
export function ToggleChips({
  options,
  value,
  onChange,
  label,
  allowCustom,
  onAddCustom,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  allowCustom?: boolean;
  onAddCustom?: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (t) {
      if (!value.includes(t)) onChange([...value, t]);
      onAddCustom?.(t);
    }
    setDraft('');
    setAdding(false);
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {all.map((t) => {
        const on = value.includes(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(t)}
            className={cn(chipBase, on ? 'bg-ink text-bg' : chipOff)}
          >
            {on && <Check className="size-3.5" aria-hidden />}
            {t}
          </button>
        );
      })}
      {allowCustom &&
        (adding ? (
          <input
            autoFocus
            value={draft}
            aria-label="Új címke"
            placeholder="új címke…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setDraft('');
                setAdding(false);
              }
            }}
            className="input h-9 w-40 rounded-full px-3.5 py-0 text-[14px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(chipBase, 'text-muted ring-1 ring-line ring-inset hover:text-ink')}
          >
            <Plus className="size-3.5" aria-hidden /> saját
          </button>
        ))}
    </div>
  );
}
