// A tünetskála színei: 0 = zöld, 5 = borostyán, 10 = piros, köztük folyamatos átmenettel.
// Az alvásminőségnél fordítva: a 10 a zöld.

/** 0–10 közötti „rosszaság” → CSS szín (a téma tokenjeiből keverve). */
export function scaleFill(badness: number): string {
  const t = Math.max(0, Math.min(10, badness));
  if (t <= 5) {
    const p = Math.round((1 - t / 5) * 100);
    return `color-mix(in oklab, var(--scale-0) ${p}%, var(--scale-5))`;
  }
  const p = Math.round((1 - (t - 5) / 5) * 100);
  return `color-mix(in oklab, var(--scale-5) ${p}%, var(--scale-10))`;
}

/** Egy skálaérték színe; `reversed` = magasabb a jobb (alvásminőség 1–10). */
export function valueFill(value: number, min: number, max: number, reversed: boolean): string {
  const frac = (value - min) / (max - min);
  return scaleFill(reversed ? (1 - frac) * 10 : frac * 10);
}
