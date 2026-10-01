// Az xlsx-export Napló lapja az Excel-tracker oszlopaival készül, és visszaolvasva ugyanazt adja.
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { generateDemo } from '@/domain/demo/generate';
import { parseTrackerWorkbook } from '@/domain/io/tracker';
import { buildWorkbook } from '@/lib/exporters';
import { workbookToMatrices } from '@/lib/sheets';

describe('xlsx export', () => {
  const data = generateDemo('2026-10-01');
  const wb = buildWorkbook(XLSX, data);
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const back = XLSX.read(bytes, { type: 'array', cellNF: true });

  it('lapok és a Napló fejléce az Excel-tracker szerint', () => {
    expect(back.SheetNames).toEqual(['Napló', 'Áttekintés', 'Terv', 'Baseline']);
    const header = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets['Napló']!, {
      header: 1,
    })[0] as string[];
    expect(header.slice(0, 6)).toEqual([
      'Hét',
      'Dátum',
      'Nap',
      'Barátnő itt aludt?',
      'Hol aludtál?',
      'Alvásminőség\n(1–10)',
    ]);
    // időtartam [h]:mm formátumú számként, ahogy az Excelben
    const c = back.Sheets['Napló']!['G2'];
    expect(c?.t).toBe('n');
    expect(c?.z).toBe('[h]:mm');
  });

  it('visszaolvasva a napló, a baseline és a terv egyezik', () => {
    const t = parseTrackerWorkbook(workbookToMatrices(XLSX, back));
    expect(t.days).toHaveLength(data.days.length);
    const strip = (e: Record<string, unknown>) => {
      const {
        updatedAt: _u,
        morningDoneAt: _m,
        eveningDoneAt: _e,
        deviceSource: _d,
        dietSlipNote: _n,
        ...rest
      } = e;
      return rest;
    };
    for (const [i, e] of t.days.entries()) {
      const orig = data.days[i]!;
      const expected = { ...strip(orig as unknown as Record<string, unknown>) };
      if (orig.dietSlipNote) expected.dietSlip = [...(orig.dietSlip ?? []), orig.dietSlipNote];
      expect(strip(e as unknown as Record<string, unknown>)).toEqual(expected);
    }
    expect(t.baselineNights.length).toBe(30);
    expect(t.baselineDays.length).toBe(80);
    expect(t.plan.map((w) => w.result ?? null)).toEqual(data.plan.map((w) => w.result ?? null));
  });
});
