// Alap statisztika. A hiányzó érték (undefined, NaN) mindig kimarad – soha nem számít nullának.

export function presentValues(values: readonly (number | undefined | null)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

export function mean(values: readonly (number | undefined | null)[]): number | undefined {
  const xs = presentValues(values);
  if (xs.length === 0) return undefined;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Minta-szórás (n − 1). Két értéknél kevesebből nincs. */
export function sampleSd(values: readonly (number | undefined | null)[]): number | undefined {
  const xs = presentValues(values);
  if (xs.length < 2) return undefined;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const ss = xs.reduce((a, b) => a + (b - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}

/** Mozgóátlag: minden ponthoz az utolsó `window` nap meglévő értékeinek átlaga. */
export function movingAverage(
  values: readonly (number | undefined)[],
  window: number,
  minCount = 3,
): (number | undefined)[] {
  return values.map((_, i) => {
    const slice = presentValues(values.slice(Math.max(0, i - window + 1), i + 1));
    return slice.length >= minCount ? slice.reduce((a, b) => a + b, 0) / slice.length : undefined;
  });
}

/** Lebegőpontos tűrés a küszöb-összehasonlításokhoz (pl. 6,43 − 7,43 = −1,0000000001). */
export const EPS = 1e-9;
