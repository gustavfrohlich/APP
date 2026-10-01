// Számfelismerés: vesszőt és pontot is elfogad („72,5” = „72.5”), a mértékegységet levágja.

export function parseDecimal(input: string | number | null | undefined): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  const s = input
    .trim()
    .replace(/\s/g, '')
    .replace(/(ms|bpm|\/min|ütés\/perc)$/i, '')
    .replace('−', '-');
  if (!s) return undefined;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(s)) return undefined;
  return Number(s.replace(',', '.'));
}
