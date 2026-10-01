import { describe, expect, it } from 'vitest';
import { computeBaseline } from '@/domain/baseline';
import { toEntryMap } from '@/domain/entries';
import { detectKind, importDays, importNights, planWatchMerge } from '@/domain/io/baselineImport';
import { makeBackup, mergeDays, parseBackup } from '@/domain/io/backup';
import { parseCsv, toCsv } from '@/domain/io/csv';
import { buildIcs } from '@/domain/io/ics';
import { JOURNAL_COLUMNS, journalCsvRows, parseJournalRows } from '@/domain/io/journalColumns';
import { autoMap, tableFromMatrix } from '@/domain/io/table';
import { DEFAULT_PLAN } from '@/domain/plan';
import type { AppData } from '@/domain/types';
import { BASELINE, entry } from './helpers';

describe('csv', () => {
  it('idézőjelek, sortörések, automatikus elválasztó', () => {
    expect(parseCsv('a;b\n"x;y";"he said ""hi"""\n')).toEqual([
      ['a', 'b'],
      ['x;y', 'he said "hi"'],
    ]);
    expect(parseCsv('\uFEFFDate,Awake RHR (bpm),HRV (ms)\r\n2026-06-01,61,65\r\n')).toEqual([
      ['Date', 'Awake RHR (bpm)', 'HRV (ms)'],
      ['2026-06-01', '61', '65'],
    ]);
  });
  it('írás: pontosvessző, tizedesvessző, BOM', () => {
    const out = toCsv([['a', 1.5, undefined, 'x;y']]);
    expect(out).toBe('\uFEFFa;1,5;;"x;y"\r\n');
  });
});

describe('baseline-import az export fejléceivel', () => {
  const nightsCsv = [
    'Date,Sleep,Awake,REM,Core,Deep,Sleep (h),Awake (h),HRV (ms),RHR (bpm),Readiness Sleep (h)',
    '2026-06-01,8:04,11m,1:59,5:12,0:42,8.07,0.18,72,54.2,7.9',
    '2026-06-02,7:16,1:07,1:40,4:00,0:29,7.27,1.12,,,',
    'rossz sor,,,,,,,,,,',
    '2026-06-02,7:20,21m,1:40,4:00,0:29,7.33,0.35,65,56,7.0',
  ].join('\n');
  const daysCsv = 'Date,Awake RHR (bpm),HRV (ms)\n2026-05-01,61,65\n2026-05-02,63,71\n';

  it('felismeri a fajtát', () => {
    expect(detectKind(nightsCsv.split('\n')[0]!.split(','))).toBe('nights');
    expect(detectKind(daysCsv.split('\n')[0]!.split(','))).toBe('days');
    expect(detectKind(['Foo', 'Bar'])).toBe('unknown');
  });
  it('éjszakák: időtartam-szövegek, duplikátum, hibás sor', () => {
    const r = importNights(tableFromMatrix(parseCsv(nightsCsv)));
    expect(r.skipped).toBe(1);
    expect(r.duplicates).toBe(1);
    expect(r.rows).toEqual([
      {
        date: '2026-06-01',
        sleepMin: 484,
        awakeMin: 11,
        remMin: 119,
        coreMin: 312,
        deepMin: 42,
        hrv: 72,
        rhr: 54.2,
        readinessSleepH: 7.9,
      },
      {
        date: '2026-06-02',
        sleepMin: 440,
        awakeMin: 21,
        remMin: 100,
        coreMin: 240,
        deepMin: 29,
        hrv: 65,
        rhr: 56,
        readinessSleepH: 7,
      },
    ]);
  });
  it('nappali export', () => {
    const r = importDays(tableFromMatrix(parseCsv(daysCsv)));
    expect(r.rows).toEqual([
      { date: '2026-05-01', rhrDay: 61, hrvDay: 65 },
      { date: '2026-05-02', rhrDay: 63, hrvDay: 71 },
    ]);
    expect(computeBaseline([], r.rows).rhrDay?.mean).toBe(62);
  });
  it('xlsx-időcellák (a nap törtrésze) is működnek', () => {
    const r = importNights({
      headers: ['Date', 'Sleep', 'Awake'],
      rows: [[46174, 0.3361111, 0.0076389]],
    });
    expect(r.rows[0]).toEqual({ date: '2026-06-01', sleepMin: 484, awakeMin: 11 });
  });
  it('ismeretlen fejléc → kézi megfeleltetés', () => {
    const map = autoMap(
      ['Nap', 'Valami'],
      [
        { key: 'date', label: 'Dátum', aliases: ['nap'] },
        { key: 'x', label: 'X', aliases: ['x'] },
      ],
    );
    expect(map).toEqual({ date: 0 });
  });
});

describe('tömeges óraadat-import', () => {
  it('kézzel beírt értéket kérdés nélkül nem ír felül', () => {
    const entries = toEntryMap([
      entry('2026-10-06', { sleepMin: 470, deviceSource: 'manual' }),
      entry('2026-10-07', { sleepMin: 470, deviceSource: 'import' }),
      entry('2026-10-08', { sleepQuality: 6 }),
    ]);
    const plan = planWatchMerge(
      [
        { date: '2026-10-06', sleepMin: 480, hrv: 70 },
        { date: '2026-10-07', sleepMin: 480 },
        { date: '2026-10-08', sleepMin: 455 },
        { date: '2026-10-09', sleepMin: 470 },
      ],
      entries,
    );
    expect(plan.conflicts).toEqual([
      { date: '2026-10-06', metric: 'sleepMin', current: 470, incoming: 480 },
    ]);
    expect(plan.apply).toEqual([
      { date: '2026-10-06', values: { hrvNight: 70 } },
      { date: '2026-10-07', values: { sleepMin: 480 } },
      { date: '2026-10-08', values: { sleepMin: 455 } },
      { date: '2026-10-09', values: { sleepMin: 470 } },
    ]);
  });
});

describe('Napló oszlopok', () => {
  it('az Excel Napló lapjának oszlopsorrendje', () => {
    expect(JOURNAL_COLUMNS.map((c) => c.header.replace(/\n/g, ' ')).slice(0, 26)).toEqual([
      'Hét',
      'Dátum',
      'Nap',
      'Barátnő itt aludt?',
      'Hol aludtál?',
      'Alvásminőség (1–10)',
      'Alvásidő (ó:pp)',
      'Ébren éjjel (ó:pp)',
      'Mélyalvás (ó:pp)',
      'REM (ó:pp)',
      'HRV (ms)',
      'Pulzus (bpm)',
      'Éjszaka vs. átlag',
      'Orr / légzés (0–10)',
      'Fáradtság (0–10)',
      'Evés utáni fáradtság (0–10)',
      'Puffadás (0–10)',
      'Puffadás mikor?',
      'Diéta betartva?',
      'Koffein (adag)',
      'Alkohol (ital)',
      'Mozgás',
      'Stressz (0–10)',
      'Nappali pulzus (opc.)',
      'Nappali HRV (opc.)',
      'Megjegyzés (gyógyszer, orrspray, betegség, kilengés…)',
    ]);
  });
  it('csv-export és visszaolvasás oda-vissza', () => {
    const e = entry('2026-10-08', {
      location: 'home_sk',
      partnerStayed: true,
      sleepQuality: 7,
      sleepMin: 476,
      awakeMin: 11,
      deepMin: 42,
      remMin: 125,
      hrvNight: 84,
      rhrNight: 51.5,
      nose: 2,
      fatigue: 3,
      postMealFatigue: 1,
      bloating: 4,
      bloatingWhen: 'lunch',
      diet: 'partial',
      dietSlip: ['étterem'],
      caffeine: 1,
      alcohol: 0,
      exercise: 'moderate',
      stress: 3,
      rhrDay: 63,
      hrvDay: 68,
      tags: ['orrspray', 'edzés'],
      note: 'Teszt; „idézet”',
    });
    const rows = journalCsvRows([e], { start: '2026-10-05', baseline: BASELINE });
    expect(rows[1]!.slice(0, 13)).toEqual([
      '1',
      '2026-10-08',
      'Cs',
      'Igen',
      'Otthon (SK)',
      '7',
      '7:56',
      '0:11',
      '0:42',
      '2:05',
      '84',
      '51,5',
      rows[1]![12],
    ]);
    const back = parseJournalRows(rows[0]!, rows.slice(1), e.updatedAt);
    expect(back).toEqual([e]);
  });
});

describe('.ics', () => {
  it('két napi ismétlődő emlékeztető, CRLF sorvégekkel', () => {
    const ics = buildIcs(
      { morning: '07:30', evening: '21:15' },
      '2026-10-05',
      undefined,
      new Date('2026-10-01T10:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261005T073000');
    expect(ics).toContain('DTSTART:20261005T211500');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});

describe('JSON mentés', () => {
  const data: AppData = {
    settings: {
      startDate: '2026-10-05',
      subjectiveBaseline: { sleepQuality: 6 },
      reminders: { morning: '07:30', evening: '21:00' },
      theme: 'system',
      demo: false,
      schemaVersion: 2,
    },
    plan: DEFAULT_PLAN,
    days: [entry('2026-10-06', { sleepQuality: 7, tags: ['a'] })],
    baselineNights: [{ date: '2026-09-01', sleepMin: 460 }],
    baselineDays: [{ date: '2026-09-01', rhrDay: 63 }],
  };
  it('oda-vissza minden adat visszajön', () => {
    const text = JSON.stringify(makeBackup(data, new Date('2026-10-07T10:00:00Z')));
    const r = parseBackup(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.data).toEqual(data);
  });
  it('hibás fájlnál érthető hiba', () => {
    expect(parseBackup('nem json')).toEqual({ ok: false, error: 'A fájl nem érvényes JSON.' });
    const r = parseBackup(JSON.stringify({ app: 'mas' }));
    expect(r.ok).toBe(false);
  });
  it('összefésülés: dátumonként a frissebb nyer', () => {
    const merged = mergeDays(
      [
        entry('2026-10-06', { nose: 1, updatedAt: '2026-10-06T20:00:00Z' }),
        entry('2026-10-07', { nose: 2 }),
      ],
      [
        entry('2026-10-06', { nose: 5, updatedAt: '2026-10-06T21:00:00Z' }),
        entry('2026-10-08', { nose: 3 }),
      ],
    );
    expect(merged.map((e) => e.nose)).toEqual([5, 2, 3]);
  });
});
