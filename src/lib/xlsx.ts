// SheetJS lusta betöltése: csak importnál és exportnál töltődik le (nem része az első betöltésnek).
import type { XLSXModule } from './sheets';
import { workbookToMatrices } from './sheets';
import { tableFromMatrix, type RawTable } from '@/domain/io/table';
import { parseCsv } from '@/domain/io/csv';

let modPromise: Promise<XLSXModule> | undefined;

export function loadXlsx(): Promise<XLSXModule> {
  modPromise ??= import('xlsx');
  return modPromise;
}

export interface ReadSheets {
  sheetNames: string[];
  matrices: Record<string, unknown[][]>;
}

export async function readWorkbook(file: File): Promise<ReadSheets> {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  return { sheetNames: wb.SheetNames, matrices: workbookToMatrices(XLSX, wb) };
}

/** CSV vagy xlsx (első lap) → fejléc + sorok. */
export async function readTableFile(file: File): Promise<RawTable> {
  if (/\.(csv|txt|tsv)$/i.test(file.name) || file.type === 'text/csv') {
    return tableFromMatrix(parseCsv(await file.text()));
  }
  const { sheetNames, matrices } = await readWorkbook(file);
  const first = sheetNames[0];
  return tableFromMatrix(first ? (matrices[first] ?? []) : []);
}
