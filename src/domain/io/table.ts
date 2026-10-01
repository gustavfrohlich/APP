// Táblázatos bemenet (CSV vagy xlsx első lapja) és fejléc-megfeleltetés.

export interface RawTable {
  headers: string[];
  rows: unknown[][];
}

export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Az első nem üres sor a fejléc; utána az adatsorok. */
export function tableFromMatrix(matrix: unknown[][]): RawTable {
  const idx = matrix.findIndex((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (idx < 0) return { headers: [], rows: [] };
  const headers = matrix[idx]!.map((h) => String(h ?? '').trim());
  const rows = matrix
    .slice(idx + 1)
    .filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''));
  return { headers, rows };
}

export interface FieldSpec<K extends string = string> {
  key: K;
  label: string;
  aliases: string[];
  required?: boolean;
}

export type ColumnMapping<K extends string = string> = Partial<Record<K, number>>;

/** Fejlécek automatikus megfeleltetése: előbb pontos egyezés, aztán ékezet nélküli. */
export function autoMap<K extends string>(
  headers: string[],
  fields: readonly FieldSpec<K>[],
): ColumnMapping<K> {
  const norm = headers.map(normalizeHeader);
  const loose = norm.map(stripAccents);
  const used = new Set<number>();
  const out: ColumnMapping<K> = {};
  for (const pass of [0, 1] as const) {
    for (const f of fields) {
      if (out[f.key] !== undefined) continue;
      for (const alias of f.aliases) {
        const a = normalizeHeader(alias);
        const i = pass === 0 ? norm.indexOf(a) : loose.indexOf(stripAccents(a));
        if (i >= 0 && !used.has(i)) {
          out[f.key] = i;
          used.add(i);
          break;
        }
      }
    }
  }
  return out;
}
