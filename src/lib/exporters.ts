// Exportok: xlsx (a Napló lap az Excel-tracker oszlopaival), csv és .ics.
// A SheetJS csak itt, lustán töltődik be.

import { computeBaseline } from '@/domain/baseline';
import { toEntryMap } from '@/domain/entries';
import { todayISO } from '@/domain/dates';
import { toCsv } from '@/domain/io/csv';
import { buildIcs } from '@/domain/io/ics';
import {
  JOURNAL_COLUMNS,
  journalCsvRows,
  NIGHT_SCORE_FORMAT,
  type JournalContext,
} from '@/domain/io/journalColumns';
import { BASELINE_METRICS, METRICS } from '@/domain/metrics';
import type { AppData } from '@/domain/types';
import { resultText } from '@/domain/verdict';
import { WORSEN_LABELS, weeklySummaries } from '@/domain/weekly';
import { dietWeekRange } from '@/domain/weeks';
import { downloadBlob, downloadText } from './files';
import type { WorkBook } from 'xlsx';
import type { XLSXModule } from './sheets';
import { loadXlsx } from './xlsx';

/** ISO nap → Excel dátum-sorszám (1900-as rendszer). */
function excelDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000 + 25569;
}

type Cell = { v: string | number; t: 's' | 'n'; z?: string };

function cell(v: string | number | undefined, z?: string): Cell | null {
  if (v === undefined || v === '') return null;
  return typeof v === 'number' ? { v, t: 'n', ...(z ? { z } : {}) } : { v, t: 's' };
}

/** A munkafüzet felépítése (Napló, Áttekintés, Terv, Baseline). Tesztelhető, böngésző nélkül. */
export function buildWorkbook(XLSX: XLSXModule, data: AppData): WorkBook {
  const baseline = computeBaseline(data.baselineNights, data.baselineDays);
  const ctx: JournalContext = { start: data.settings.startDate, baseline };
  const wb = XLSX.utils.book_new();

  // Napló – ugyanazok az oszlopok, mint az Excel-tracker Napló lapján.
  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  const rows: (Cell | null)[][] = [
    JOURNAL_COLUMNS.map((c) => cell(c.header)),
    ...days.map((e) =>
      JOURNAL_COLUMNS.map((c) => {
        const v = c.value(e, ctx);
        if (v === undefined) return null;
        if (c.type === 'date') return cell(excelDate(v as string), 'yyyy.mm.dd.');
        if (c.type === 'duration') return cell((v as number) / 1440, '[h]:mm');
        if (c.type === 'score') return cell(v as number, NIGHT_SCORE_FORMAT);
        return cell(v);
      }),
    ),
  ];
  const naplo = XLSX.utils.aoa_to_sheet(rows as unknown[][]);
  naplo['!cols'] = JOURNAL_COLUMNS.map((c) => ({ wch: c.width + 2 }));
  naplo['!freeze'] = { xSplit: 3, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, naplo, 'Napló');

  // Áttekintés – heti összesítő.
  const summaries = weeklySummaries({
    entries: toEntryMap(data.days),
    start: data.settings.startDate,
    weeks: data.plan.length,
    plan: data.plan,
    baseline,
    subjective: data.settings.subjectiveBaseline,
  });
  const dur = (v: number | undefined) => cell(v === undefined ? undefined : v / 1440, '[h]:mm');
  const n1 = (v: number | undefined) => cell(v, '0.0');
  const over: (Cell | null)[][] = [
    [
      'Hét',
      'Étel',
      'Napok',
      'Alvásidő',
      'Ébren',
      'Mély',
      'REM',
      'HRV',
      'Pulzus',
      'Éjszaka összkép',
      'Alvásminőség',
      'Orr / légzés',
      'Fáradtság',
      'Evés utáni fáradtság',
      'Puffadás',
      'Romlás az előző héthez képest',
      'Eredmény',
    ].map((h) => cell(h)),
    ...summaries.map((s) => [
      cell(`${s.week}. hét`),
      cell(s.plan?.food),
      cell(s.filledDays),
      dur(s.watch.sleepMin),
      dur(s.watch.awakeMin),
      dur(s.watch.deepMin),
      dur(s.watch.remMin),
      n1(s.watch.hrvNight),
      n1(s.watch.rhrNight),
      cell(s.nightScore, '[>=0.25]"▲ jobb";[<=-0.25]"▼ rosszabb";"● átlagos"'),
      n1(s.sleepQuality),
      n1(s.symptoms.nose),
      n1(s.symptoms.fatigue),
      n1(s.symptoms.postMealFatigue),
      n1(s.symptoms.bloating),
      cell(
        s.comparison.status === 'empty'
          ? ''
          : s.comparison.status === 'na'
            ? '–'
            : s.comparison.worsened.length
              ? `▼ ${s.comparison.worsened.map((k) => WORSEN_LABELS[k]).join(', ')}`
              : '✓ nincs',
      ),
      cell(s.plan?.result ? resultText(s.plan.result) : ''),
    ]),
  ];
  const attek = XLSX.utils.aoa_to_sheet(over as unknown[][]);
  attek['!cols'] = [8, 30, 7, 9, 8, 8, 8, 8, 8, 14, 12, 11, 10, 18, 10, 40, 14].map((wch) => ({
    wch,
  }));
  XLSX.utils.book_append_sheet(wb, attek, 'Áttekintés');

  // Terv
  const terv = XLSX.utils.aoa_to_sheet([
    [
      'Hét',
      'Kezdete',
      'Vége',
      'Új étel',
      'Mit eszel ezen a héten',
      'Adag / tipp',
      'Eredmény',
      'Megjegyzés',
    ].map((h) => cell(h)),
    ...data.plan.map((w) => {
      const r = dietWeekRange(w.week, data.settings.startDate);
      return [
        cell(`${w.week}. hét`),
        cell(excelDate(r.from), 'mm.dd.'),
        cell(excelDate(r.to), 'mm.dd.'),
        cell(w.food),
        cell(w.eat),
        cell(w.tip),
        cell(w.result ? resultText(w.result) : ''),
        cell(w.resultNote),
      ];
    }),
  ] as unknown[][]);
  terv['!cols'] = [8, 9, 9, 32, 50, 40, 14, 40].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, terv, 'Terv');

  // Baseline – statisztika, becslés és nyers adatok.
  const bl: (Cell | null)[][] = [
    ['Mutató', 'Átlag', 'Szórás', 'Napok', 'Első nap', 'Utolsó nap'].map((h) => cell(h)),
    ...BASELINE_METRICS.map((m) => {
      const s = baseline[m];
      const isDur = METRICS[m].kind === 'duration';
      return [
        cell(METRICS[m].label),
        s ? (isDur ? dur(s.mean) : n1(s.mean)) : null,
        s?.sd !== undefined ? (isDur ? dur(s.sd) : n1(s.sd)) : null,
        cell(s?.n),
        s ? cell(excelDate(s.from), 'yyyy.mm.dd.') : null,
        s ? cell(excelDate(s.to), 'yyyy.mm.dd.') : null,
      ];
    }),
    [],
    [cell('Szubjektív becslés'), cell('Érték')],
    ...(['sleepQuality', 'nose', 'fatigue', 'postMealFatigue', 'bloating'] as const).map((k) => [
      cell(METRICS[k].label),
      cell(data.settings.subjectiveBaseline[k]),
    ]),
    [],
    // Nyers adatok egymás mellett, mint az Excel-tracker Baseline lapján (éjszakák | nappali mérések).
    [
      ...[
        'Dátum',
        'Alvás',
        'Ébren',
        'REM',
        'Core',
        'Mély',
        'HRV (ms)',
        'Pulzus (bpm)',
        'Readiness alvás (ó)',
      ].map((h) => cell(h)),
      null,
      ...['Dátum', 'Nappali pulzus', 'Nappali HRV'].map((h) => cell(h)),
    ],
    ...Array.from(
      { length: Math.max(data.baselineNights.length, data.baselineDays.length) },
      (_, r) => {
        const n = data.baselineNights[r];
        const d = data.baselineDays[r];
        const left = n
          ? [
              cell(excelDate(n.date), 'yyyy.mm.dd.'),
              dur(n.sleepMin),
              dur(n.awakeMin),
              dur(n.remMin),
              dur(n.coreMin),
              dur(n.deepMin),
              cell(n.hrv),
              cell(n.rhr),
              cell(n.readinessSleepH),
            ]
          : Array.from({ length: 9 }, () => null);
        const right = d
          ? [cell(excelDate(d.date), 'yyyy.mm.dd.'), cell(d.rhrDay), cell(d.hrvDay)]
          : [];
        return [...left, null, ...right];
      },
    ),
  ];
  const blSheet = XLSX.utils.aoa_to_sheet(bl as unknown[][]);
  blSheet['!cols'] = [22, 10, 10, 8, 12, 12, 10, 12, 18, 3, 12, 14, 12].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, blSheet, 'Baseline');

  return wb;
}

export async function exportXlsx(data: AppData): Promise<void> {
  const XLSX = await loadXlsx();
  const wb = buildWorkbook(XLSX, data);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  downloadBlob(
    `bazis-naplo-${todayISO()}.xlsx`,
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}

export function exportCsv(data: AppData): void {
  const baseline = computeBaseline(data.baselineNights, data.baselineDays);
  const rows = journalCsvRows(data.days, { start: data.settings.startDate, baseline });
  downloadText(
    `bazis-naplo-${todayISO()}.csv`,
    toCsv(rows, { decimalComma: false }),
    'text/csv;charset=utf-8',
  );
}

export function exportIcs(
  reminders: { morning: string; evening: string },
  startDate: string,
): void {
  const url =
    typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : undefined;
  const start = startDate > todayISO() ? startDate : todayISO();
  downloadText(
    'bazis-emlekezteto.ics',
    buildIcs(reminders, start, url),
    'text/calendar;charset=utf-8',
  );
}
