// Baseline-import: az óra két exportja (xlsx vagy csv) vagy a régi Excel-tracker behúzása,
// azonnali előnézettel (átlag, szórás, napok száma, időszak). Ismeretlen fejlécnél oszlop-megfeleltetés.

import { useState, type DragEvent } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { useRepo } from '@/data/context';
import { computeBaseline } from '@/domain/baseline';
import { formatDateFull, formatMetric } from '@/domain/format';
import {
  autoMapDays,
  autoMapNights,
  DAY_FIELDS,
  detectKind,
  importDays,
  importNights,
  mappingIsUsable,
  NIGHT_FIELDS,
  type ImportField,
} from '@/domain/io/baselineImport';
import type { ColumnMapping, RawTable } from '@/domain/io/table';
import { isTrackerWorkbook, parseTrackerWorkbook, type TrackerImport } from '@/domain/io/tracker';
import { tableFromMatrix } from '@/domain/io/table';
import { BASELINE_METRICS, METRICS } from '@/domain/metrics';
import type { BaselineDay, BaselineNight } from '@/domain/types';
import { parseCsv } from '@/domain/io/csv';
import { pickFile } from '@/lib/files';
import { readWorkbook } from '@/lib/xlsx';
import { cn } from '@/lib/cn';

type Pending =
  | { id: string; name: string; kind: 'nights'; rows: BaselineNight[]; skipped: number }
  | { id: string; name: string; kind: 'days'; rows: BaselineDay[]; skipped: number }
  | { id: string; name: string; kind: 'tracker'; data: TrackerImport }
  | { id: string; name: string; kind: 'unknown'; table: RawTable };

async function readFile(file: File): Promise<Pending> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  let table: RawTable;
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    table = tableFromMatrix(parseCsv(await file.text()));
  } else {
    const wb = await readWorkbook(file);
    if (isTrackerWorkbook(wb.sheetNames)) {
      return { id, name: file.name, kind: 'tracker', data: parseTrackerWorkbook(wb.matrices) };
    }
    table = tableFromMatrix(wb.matrices[wb.sheetNames[0]!] ?? []);
  }
  const kind = detectKind(table.headers);
  if (kind === 'nights') {
    const m = autoMapNights(table.headers);
    if (mappingIsUsable(m, NIGHT_FIELDS)) {
      const r = importNights(table, m);
      return { id, name: file.name, kind: 'nights', rows: r.rows, skipped: r.skipped };
    }
  }
  if (kind === 'days') {
    const m = autoMapDays(table.headers);
    if (mappingIsUsable(m, DAY_FIELDS)) {
      const r = importDays(table, m);
      return { id, name: file.name, kind: 'days', rows: r.rows, skipped: r.skipped };
    }
  }
  return { id, name: file.name, kind: 'unknown', table };
}

function Mapper({
  p,
  onDone,
}: {
  p: Extract<Pending, { kind: 'unknown' }>;
  onDone: (next: Pending) => void;
}) {
  const [kind, setKind] = useState<'nights' | 'days'>('nights');
  const fields = (kind === 'nights' ? NIGHT_FIELDS : DAY_FIELDS) as ImportField<string>[];
  const [mapping, setMapping] = useState<ColumnMapping<string>>(() =>
    kind === 'nights' ? autoMapNights(p.table.headers) : autoMapDays(p.table.headers),
  );
  const usable = mappingIsUsable(mapping, fields);
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-4">
      <p className="mb-3 text-[14px]">
        Ezeket a fejléceket nem ismerem fel – mondd meg, melyik oszlop mi. (Elég a dátum és legalább
        egy mutató.)
      </p>
      <div className="mb-3 flex gap-2 text-[14px]">
        {(['nights', 'days'] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`kind-${p.id}`}
              checked={kind === k}
              onChange={() => {
                setKind(k);
                setMapping(
                  k === 'nights' ? autoMapNights(p.table.headers) : autoMapDays(p.table.headers),
                );
              }}
            />
            {k === 'nights' ? 'Éjszakai export (alvás)' : 'Nappali export (pulzus, HRV)'}
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-2 text-[13px]">
            <span>
              {f.label}
              {f.required && ' *'}
            </span>
            <select
              className="input h-9 w-48 py-0"
              value={mapping[f.key] ?? ''}
              onChange={(e) =>
                setMapping({
                  ...mapping,
                  [f.key]: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            >
              <option value="">–</option>
              {p.table.headers.map((h, i) => (
                <option key={`${h}-${i}`} value={i}>
                  {h || `${i + 1}. oszlop`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button
        className="mt-3"
        size="sm"
        variant="plan"
        disabled={!usable}
        onClick={() => {
          if (kind === 'nights') {
            const r = importNights(p.table, mapping);
            onDone({ id: p.id, name: p.name, kind: 'nights', rows: r.rows, skipped: r.skipped });
          } else {
            const r = importDays(p.table, mapping);
            onDone({ id: p.id, name: p.name, kind: 'days', rows: r.rows, skipped: r.skipped });
          }
        }}
      >
        Megfeleltetés kész
      </Button>
    </div>
  );
}

export function BaselineImport({
  onImported,
  compact,
}: {
  onImported?: () => void;
  compact?: boolean;
}) {
  const { repo } = useRepo();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [trackerOpts, setTrackerOpts] = useState({
    subjective: true,
    days: true,
    start: true,
    plan: true,
  });

  const add = async (files: File[]) => {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const read = await Promise.all(files.map(readFile));
      setPending((prev) => [...prev.filter((p) => !read.some((r) => r.id === p.id)), ...read]);
    } catch (e) {
      setError(
        `A fájlt nem sikerült beolvasni (${e instanceof Error ? e.message : 'ismeretlen hiba'}).`,
      );
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void add(Array.from(e.dataTransfer.files));
  };

  const nights = pending.flatMap((p) =>
    p.kind === 'nights' ? p.rows : p.kind === 'tracker' ? p.data.baselineNights : [],
  );
  const daysRows = pending.flatMap((p) =>
    p.kind === 'days' ? p.rows : p.kind === 'tracker' ? p.data.baselineDays : [],
  );
  const tracker = pending.find(
    (p): p is Extract<Pending, { kind: 'tracker' }> => p.kind === 'tracker',
  )?.data;
  const stats = computeBaseline(nights, daysRows);
  const ready = nights.length > 0 || daysRows.length > 0 || !!tracker;

  const save = async () => {
    setBusy(true);
    try {
      if (nights.length) await repo.replaceBaselineNights(nights);
      if (daysRows.length) await repo.replaceBaselineDays(daysRows);
      const parts = [
        nights.length ? `${nights.length} éjszaka` : '',
        daysRows.length ? `${daysRows.length} nappali mérés` : '',
      ].filter(Boolean);
      if (tracker) {
        if (trackerOpts.subjective && Object.keys(tracker.subjective).length) {
          const s = await repo.getSettings();
          await repo.updateSettings({
            subjectiveBaseline: { ...s.subjectiveBaseline, ...tracker.subjective },
          });
          parts.push('becslések');
        }
        if (trackerOpts.start && tracker.startDate) {
          await repo.updateSettings({ startDate: tracker.startDate });
          parts.push('kezdés dátuma');
        }
        if (trackerOpts.days && tracker.days.length) {
          for (const e of tracker.days) {
            const { date, updatedAt: _u, ...fields } = e;
            await repo.patchDay(date, { ...fields, deviceSource: 'manual' });
          }
          parts.push(`${tracker.days.length} napló-nap`);
        }
        if (trackerOpts.plan && tracker.plan.length) {
          for (const w of tracker.plan) {
            await repo.updateWeek(w.week, {
              food: w.food,
              eat: w.eat,
              tip: w.tip,
              ...(w.result ? { result: w.result, closedAt: new Date().toISOString() } : {}),
              ...(w.resultNote ? { resultNote: w.resultNote } : {}),
            });
          }
          parts.push('terv');
        }
      }
      setDone(`Importálva: ${parts.join(', ') || 'semmi új'}.`);
      setPending([]);
      onImported?.();
    } catch (e) {
      setError(
        `Az importálás nem sikerült (${e instanceof Error ? e.message : 'ismeretlen hiba'}).`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors',
          compact ? 'py-6' : 'py-9',
          drag ? 'border-plan bg-[color-mix(in_oklab,var(--plan)_8%,transparent)]' : 'border-line',
        )}
      >
        <Upload className="size-6 text-muted" aria-hidden />
        <p className="text-[15px]">
          Húzd ide az óra exportjait (<span className="font-medium">sleep_readiness_data.xlsx</span>
          , <span className="font-medium">awake_rhr_with_hrv.csv</span>) – vagy a régi
          Excel-trackert.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<FileSpreadsheet className="size-4" aria-hidden />}
          onClick={async () => void add(await pickFile('.xlsx,.xls,.csv,.txt', true))}
          disabled={busy}
        >
          Fájlok kiválasztása
        </Button>
        <p className="text-[12px] text-muted">
          A fájlok nem hagyják el a gépedet – a böngésző olvassa be őket.
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-bad-fill px-4 py-2.5 text-[14px] text-bad">{error}</p>
      )}
      {done && (
        <p className="mt-3 rounded-xl bg-good-fill px-4 py-2.5 text-[14px] text-good">✓ {done}</p>
      )}

      {pending.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {pending.map((p) => (
            <li key={p.id} className="rounded-xl bg-surface-2/70 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-medium">{p.name}</span>
                <span className="flex items-center gap-2 text-[13px] text-muted">
                  {p.kind === 'nights' &&
                    `éjszakai export · ${p.rows.length} éjszaka${p.skipped ? ` · ${p.skipped} sor kihagyva` : ''}`}
                  {p.kind === 'days' &&
                    `nappali export · ${p.rows.length} nap${p.skipped ? ` · ${p.skipped} sor kihagyva` : ''}`}
                  {p.kind === 'tracker' && 'Excel-tracker'}
                  {p.kind === 'unknown' && 'ismeretlen fejlécek'}
                  <button
                    type="button"
                    aria-label={`${p.name} eltávolítása`}
                    onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
                    className="grid size-7 place-items-center rounded-lg hover:bg-surface hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </span>
              </div>
              {p.kind === 'unknown' && (
                <Mapper
                  p={p}
                  onDone={(next) =>
                    setPending((prev) => prev.map((x) => (x.id === p.id ? next : x)))
                  }
                />
              )}
              {p.kind === 'tracker' && (
                <div className="mt-2 grid gap-1.5 text-[14px]">
                  <span className="text-muted">
                    Baseline: {p.data.baselineNights.length} éjszaka, {p.data.baselineDays.length}{' '}
                    nappali mérés.
                  </span>
                  {Object.keys(p.data.subjective).length > 0 && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={trackerOpts.subjective}
                        onChange={(e) =>
                          setTrackerOpts({ ...trackerOpts, subjective: e.target.checked })
                        }
                      />
                      Szubjektív becslések átvétele
                    </label>
                  )}
                  {p.data.startDate && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={trackerOpts.start}
                        onChange={(e) =>
                          setTrackerOpts({ ...trackerOpts, start: e.target.checked })
                        }
                      />
                      Kezdés dátuma: {formatDateFull(p.data.startDate)}
                    </label>
                  )}
                  {p.data.days.length > 0 && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={trackerOpts.days}
                        onChange={(e) => setTrackerOpts({ ...trackerOpts, days: e.target.checked })}
                      />
                      Napló: {p.data.days.length} kitöltött nap átvétele
                    </label>
                  )}
                  {p.data.plan.length > 0 && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={trackerOpts.plan}
                        onChange={(e) => setTrackerOpts({ ...trackerOpts, plan: e.target.checked })}
                      />
                      Terv és eredmények átvétele
                    </label>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(nights.length > 0 || daysRows.length > 0) && (
        <div className="mt-4 overflow-x-auto">
          <div className="label-caps mb-2">Előnézet</div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="py-1 font-medium">Mutató</th>
                <th className="py-1 text-right font-medium">Átlag</th>
                <th className="py-1 text-right font-medium">Szórás</th>
                <th className="py-1 text-right font-medium">Napok</th>
                <th className="py-1 pl-3 font-medium">Időszak</th>
              </tr>
            </thead>
            <tbody>
              {BASELINE_METRICS.filter((m) => stats[m]).map((m) => {
                const s = stats[m]!;
                return (
                  <tr key={m} className="border-t border-line">
                    <td className="py-1.5">{METRICS[m].label}</td>
                    <td className="num py-1.5 text-right font-semibold">
                      {formatMetric(m, s.mean)}
                      {METRICS[m].kind === 'decimal' ? ` ${METRICS[m].unit}` : ''}
                    </td>
                    <td className="num py-1.5 text-right">
                      {s.sd !== undefined ? formatMetric(m, s.sd) : '–'}
                    </td>
                    <td className="num py-1.5 text-right">{s.n}</td>
                    <td className="py-1.5 pl-3 text-muted">
                      {formatDateFull(s.from)} – {formatDateFull(s.to)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ready && (
        <Button className="mt-4" variant="plan" onClick={() => void save()} disabled={busy}>
          Importálás
        </Button>
      )}
    </div>
  );
}
