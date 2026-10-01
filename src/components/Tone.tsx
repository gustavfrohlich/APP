// Jobb / rosszabb jelzés: mindig szín + szimbólum + szöveg (a szín sosem egyedül).

import type { ReactNode } from 'react';
import { TONE_LABELS, type Tone } from '@/domain/deviation';
import { cn } from '@/lib/cn';
import { TONE_FILL, TONE_TEXT } from './toneClasses';

export function ToneText({
  tone,
  children,
  className,
  symbolOnly,
}: {
  tone: Tone;
  children?: ReactNode;
  className?: string;
  symbolOnly?: boolean;
}) {
  return (
    <span className={cn('num font-medium', TONE_TEXT[tone], className)}>
      {children ??
        (symbolOnly
          ? TONE_LABELS[tone].symbol
          : `${TONE_LABELS[tone].symbol} ${TONE_LABELS[tone].text}`)}
    </span>
  );
}

/** Kitöltött jelvény: „▲ jobb”, „● átlagos”, „▼ rosszabb”. */
export function ToneBadge({
  tone,
  children,
  size = 'md',
  className,
}: {
  tone: Tone;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const label = TONE_LABELS[tone];
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        TONE_FILL[tone],
        size === 'sm' && 'px-2 py-0.5 text-[12px]',
        size === 'md' && 'px-2.5 py-1 text-[13px]',
        size === 'lg' && 'px-3.5 py-1.5 text-[15px]',
        className,
      )}
    >
      <span aria-hidden>{label.symbol}</span>
      {children ?? label.text}
    </span>
  );
}
