// Egyszerű, függőség nélküli CSV olvasó és író (idézőjelek, automatikus elválasztó).

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => ({ d, n: firstLine.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0]!.n > 0 ? counts[0]!.d : ',';
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

type Cell = string | number | boolean | undefined | null;

function escapeCell(v: Cell, delimiter: string): string {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /["\r\n]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV szöveg. Alapból pontosvessző és tizedesvessző, UTF-8 BOM-mal, hogy a magyar Excel
 * dupla kattintásra helyesen nyissa meg.
 */
export function toCsv(
  rows: Cell[][],
  opts: { delimiter?: string; decimalComma?: boolean; bom?: boolean } = {},
): string {
  const delimiter = opts.delimiter ?? ';';
  const decimalComma = opts.decimalComma ?? true;
  const body = rows
    .map((r) =>
      r
        .map((v) =>
          escapeCell(
            typeof v === 'number' && decimalComma ? String(v).replace('.', ',') : v,
            delimiter,
          ),
        )
        .join(delimiter),
    )
    .join('\r\n');
  return ((opts.bom ?? true) ? '\uFEFF' : '') + body + '\r\n';
}
