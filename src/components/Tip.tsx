// Könnyű tooltip, amely a billentyűparancsot is mutatja. Egérrel rövid késleltetéssel,
// billentyűzettel fókuszra jelenik meg; Esc elrejti. Portálon keresztül, a viewporton belül marad.

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface TipProps {
  label: ReactNode;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactElement;
}

type Handlers = {
  onPointerEnter?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-describedby'?: string;
};

export function Tip({ label, shortcut, side = 'top', children }: TipProps) {
  const id = useId();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback(
    (el: HTMLElement, delay: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const gap = 8;
        const p =
          side === 'right'
            ? { x: r.right + gap, y: r.top + r.height / 2 }
            : side === 'left'
              ? { x: r.left - gap, y: r.top + r.height / 2 }
              : side === 'bottom'
                ? { x: r.left + r.width / 2, y: r.bottom + gap }
                : { x: r.left + r.width / 2, y: r.top - gap };
        setPos(p);
      }, delay);
    },
    [side],
  );
  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => hide();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [pos, hide]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!isValidElement<Handlers>(children)) return children;
  const p = children.props;
  // A gyerek elem saját ref-jét a cloneElement érintetlenül hagyja; render közben nem olvassuk.
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(children, {
    'aria-describedby': pos ? id : p['aria-describedby'],
    onPointerEnter: (e: React.PointerEvent) => {
      p.onPointerEnter?.(e);
      if (e.pointerType === 'mouse') show(e.currentTarget as HTMLElement, 450);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      p.onPointerLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      p.onFocus?.(e);
      const el = e.currentTarget as HTMLElement;
      if (el.matches(':focus-visible')) show(el, 150);
    },
    onBlur: (e: React.FocusEvent) => {
      p.onBlur?.(e);
      hide();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && pos) hide();
      p.onKeyDown?.(e);
    },
  });

  const transform =
    side === 'right'
      ? 'translate(0,-50%)'
      : side === 'left'
        ? 'translate(-100%,-50%)'
        : side === 'bottom'
          ? 'translate(-50%,0)'
          : 'translate(-50%,-100%)';

  return (
    <>
      {trigger}
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.x, top: pos.y, transform }}
            className="no-print pointer-events-none fixed z-[100] flex max-w-xs items-center gap-2 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-bg shadow-lg"
          >
            {label}
            {shortcut && (
              <span className="rounded border border-white/25 px-1 text-[11px] text-bg/80 dark:border-black/25">
                {shortcut}
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
