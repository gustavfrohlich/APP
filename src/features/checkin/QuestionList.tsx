// Kérdéslista: minden kérdés egy oszlopban látszik, az aktív sor finom háttérrel és bal oldali
// színsávval kiemelve; a kiemelés soronként csúszik (CSS, 180 ms).

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface QuestionDef {
  id: string;
  title?: ReactNode;
  hint?: ReactNode;
  content: ReactNode;
  /** Kérdés nélküli sor (pl. összegzés) – nincs címsor. */
  bare?: boolean;
}

export function QuestionList({
  questions,
  active,
  onActivate,
  accent,
  registerRow,
}: {
  questions: QuestionDef[];
  active: number;
  onActivate: (i: number) => void;
  accent: 'night' | 'day';
  registerRow: (i: number, el: HTMLElement | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = rows.current[active];
      if (el) setBox({ top: el.offsetTop, height: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    rows.current.forEach((r) => r && ro.observe(r));
    return () => ro.disconnect();
  }, [active, questions.length]);

  return (
    <div ref={container} className="relative flex flex-col gap-1">
      {box && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 rounded-2xl bg-surface-2 transition-[top,height] duration-[180ms] ease-out"
          style={{ top: box.top, height: box.height }}
        >
          <div
            className={cn(
              'absolute top-4 bottom-4 left-0 w-[3px] rounded-full',
              accent === 'night' ? 'bg-night' : 'bg-day',
            )}
          />
        </div>
      )}
      {questions.map((q, i) => (
        <section
          key={q.id}
          ref={(el) => {
            rows.current[i] = el;
            registerRow(i, el);
          }}
          aria-labelledby={q.bare ? undefined : `q-${q.id}`}
          onFocusCapture={() => i !== active && onActivate(i)}
          onPointerDown={() => i !== active && onActivate(i)}
          data-active={i === active || undefined}
          className="relative rounded-2xl px-6 py-5"
        >
          {!q.bare && (
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 id={`q-${q.id}`} className="text-[17px] font-semibold tracking-tight">
                {q.title}
              </h3>
              {q.hint && <span className="text-[13px] text-muted">{q.hint}</span>}
            </div>
          )}
          {q.content}
        </section>
      ))}
    </div>
  );
}
