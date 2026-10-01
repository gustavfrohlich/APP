// Grafikon-segédfüggvények (komponens nélkül).
import { useLayoutEffect, useRef, useState } from 'react';
import type { ISODate, PlanWeek } from '@/domain/types';

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e!.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Oszlop lekerekített adatvéggel (4 px), a nullvonalnál szögletes. */
export function barPath(x: number, w: number, yBase: number, yEnd: number, r = 4): string {
  const h = Math.abs(yEnd - yBase);
  const rr = Math.min(r, w / 2, h);
  if (h < 0.5) return '';
  if (yEnd < yBase) {
    // felfelé
    return `M${x},${yBase} V${yEnd + rr} Q${x},${yEnd} ${x + rr},${yEnd} H${x + w - rr} Q${x + w},${yEnd} ${x + w},${yEnd + rr} V${yBase} Z`;
  }
  return `M${x},${yBase} V${yEnd - rr} Q${x},${yEnd} ${x + rr},${yEnd} H${x + w - rr} Q${x + w},${yEnd} ${x + w},${yEnd - rr} V${yBase} Z`;
}

/** Vonal hiányzó értékekkel: a hiánynál megszakad (nem húz át nullán). */
export function linePath(points: ({ x: number; y: number } | undefined)[]): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

export interface WeekBand {
  week: number;
  from: number;
  to: number;
  label: string;
}

/** Hét-sávok: egymást követő napok csoportosítása hét szerint (váltakozó tónus, felirattal). */
export function weekBands(
  dates: ISODate[],
  weekOf: (d: ISODate) => number,
  plan: readonly PlanWeek[],
  xOf: (i: number) => number,
  step: number,
): WeekBand[] {
  const bands: WeekBand[] = [];
  dates.forEach((d, i) => {
    const w = weekOf(d);
    const last = bands[bands.length - 1];
    if (last && last.week === w) last.to = xOf(i) + step;
    else {
      const food = plan.find((p) => p.week === w)?.food.replace(/^\+\s*/, '') ?? '';
      bands.push({
        week: w,
        from: xOf(i),
        to: xOf(i) + step,
        label: w >= 1 ? `${w}. ${food}` : '',
      });
    }
  });
  return bands;
}
