import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tip } from './Tip';

type Variant = 'primary' | 'night' | 'day' | 'plan' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Tooltip-szöveg és billentyűparancs. */
  tip?: string;
  shortcut?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink/90',
  night: 'bg-night text-white hover:brightness-110 dark:text-[#121418]',
  day: 'bg-day text-white hover:brightness-110 dark:text-[#121418]',
  plan: 'bg-plan-ink text-white hover:brightness-105 dark:text-[#121418]',
  secondary: 'bg-surface-2 text-ink hover:bg-line/70 ring-1 ring-inset ring-line',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-bad text-white hover:brightness-110 dark:text-[#121418]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    tip,
    shortcut,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,filter,color,box-shadow] select-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
  if (!tip && !shortcut) return btn;
  return (
    <Tip label={tip ?? (typeof children === 'string' ? children : '')} shortcut={shortcut}>
      {btn}
    </Tip>
  );
});
