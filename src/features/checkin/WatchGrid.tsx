// Az óra adatai 3 × 2-es rácsban, okos beillesztéssel (Ctrl/Cmd + V).

import { useRef, useState, type ClipboardEvent } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/Button';
import { MetricField } from '@/components/MetricField';
import type { Baseline } from '@/domain/baseline';
import { formatMetricWithUnit } from '@/domain/format';
import { METRICS, WATCH_METRICS, type WatchMetric } from '@/domain/metrics';
import { parseSmartPaste, type WatchValues } from '@/domain/parse/smartPaste';
import type { DayEntry } from '@/domain/types';
import type { DayPatch } from '@/data/repository';
import { modKey } from '@/lib/platform';

export function WatchGrid({
  draft,
  baseline,
  update,
  onDone,
}: {
  draft: DayEntry;
  baseline: Baseline;
  update: (p: DayPatch) => void;
  onDone: () => void;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [preview, setPreview] = useState<WatchValues | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const applyBtn = useRef<HTMLButtonElement>(null);

  const offer = (text: string): boolean => {
    const values = parseSmartPaste(text);
    if (Object.keys(values).length >= 2) {
      setPreview(values);
      setPasteError(null);
      requestAnimationFrame(() => applyBtn.current?.focus());
      return true;
    }
    return false;
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (offer(text)) e.preventDefault();
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!offer(text)) setPasteError('A vágólapon nem találtam óraadatokat.');
    } catch {
      setPasteError(`A vágólap nem olvasható – nyomd meg a ${modKey()}+V-t egy mezőben.`);
    }
  };

  const apply = () => {
    if (!preview) return;
    update({ ...preview, deviceSource: 'shortcut' });
    setPreview(null);
    onDone();
  };

  return (
    <div onPaste={onPaste}>
      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
        {WATCH_METRICS.map((m: WatchMetric, i) => (
          <MetricField
            key={m}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            metric={m}
            label={m === 'sleepMin' ? 'Alvásidő' : m === 'awakeMin' ? 'Ébren' : METRICS[m].short}
            value={draft[m]}
            stat={baseline[m]}
            imported={draft.deviceSource === 'import'}
            compact
            onCommit={(v) => update({ [m]: v, deviceSource: 'manual' })}
            onEnter={() =>
              i < WATCH_METRICS.length - 1 ? inputs.current[i + 1]?.focus() : onDone()
            }
          />
        ))}
      </div>

      {preview ? (
        <div className="mt-4 rounded-xl bg-surface p-4 ring-1 ring-line">
          <p className="mb-2 text-sm font-medium">Ezt találtam a vágólapon:</p>
          <dl className="mb-3 grid grid-cols-3 gap-x-5 gap-y-1 text-sm">
            {WATCH_METRICS.filter((m) => preview[m] !== undefined).map((m) => (
              <div key={m} className="flex justify-between gap-2">
                <dt className="text-muted">{METRICS[m].short}</dt>
                <dd className="num font-semibold">{formatMetricWithUnit(m, preview[m])}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2">
            <Button
              ref={applyBtn}
              variant="night"
              size="sm"
              onClick={apply}
              shortcut="Enter"
              tip="Kitöltöm"
            >
              Kitöltöm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Mégse
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-[13px] text-muted">
          <Button
            variant="ghost"
            size="sm"
            icon={<ClipboardPaste className="size-4" aria-hidden />}
            onClick={() => void pasteFromClipboard()}
            tip="Óraadatok beillesztése a vágólapról"
            shortcut={`${modKey()}+V`}
          >
            Beillesztés
          </Button>
          <span>
            {pasteError ??
              'Pl. „Alvás 7:56, Ébren 11 perc, Mély 0:42, REM 2:05, HRV 84, Pulzus 51,5”'}
          </span>
        </div>
      )}
    </div>
  );
}
