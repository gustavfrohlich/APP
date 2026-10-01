// SheetJS munkafüzet → lapnév szerinti mátrixok. A SheetJS-t a hívó adja át (lusta betöltés).
import type * as XLSXNS from 'xlsx';

export type XLSXModule = typeof XLSXNS;

export function workbookToMatrices(
  XLSX: XLSXModule,
  wb: XLSXNS.WorkBook,
): Record<string, unknown[][]> {
  const out: Record<string, unknown[][]> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    out[name] = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      blankrows: true,
      defval: undefined,
    });
  }
  return out;
}
