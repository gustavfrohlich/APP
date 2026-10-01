// Óraadatok tömegesen a kísérlet alatt: ugyanilyen formátumú export, ami dátum szerint beolvad
// a napokba. Kézzel beírt értéket kérdés nélkül nem ír felül – az ütközéseknél te döntesz.

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAppData, useRepo } from '@/data/context';
import {
  autoMapNights,
  importNights,
  mappingIsUsable,
  NIGHT_FIELDS,
  planWatchMerge,
  type WatchMergePlan,
} from '@/domain/io/baselineImport';
import { formatDateShort, formatMetricWithUnit } from '@/domain/format';
import { METRICS } from '@/domain/metrics';
import { pickFile } from '@/lib/files';
import { readTableFile } from '@/lib/xlsx';

export function WatchImport() {
  const { entries } = useAppData();
  const { repo } = useRepo();
  const [plan, setPlan] = useState<WatchMergePlan | null>(null);
  const [overwrite, setOverwrite] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const choose = async () => {
    setMsg(null);
    const [file] = await pickFile('.xlsx,.xls,.csv,.txt');
    if (!file) return;
    try {
      const table = await readTableFile(file);
      const mapping = autoMapNights(table.headers);
      if (!mappingIsUsable(mapping, NIGHT_FIELDS)) {
        setMsg({
          ok: false,
          text: 'Ebben a fájlban nem találtam az éjszakai export oszlopait (Date, Sleep, Awake, …).',
        });
        return;
      }
      setPlan(planWatchMerge(importNights(table, mapping).rows, entries));
      setOverwrite(new Set());
    } catch {
      setMsg({ ok: false, text: 'A fájlt nem sikerült beolvasni.' });
    }
  };

  const apply = async () => {
    if (!plan) return;
    const n = await repo.applyWatchValues(plan.apply, 'import');
    let c = 0;
    for (const [i, conflict] of plan.conflicts.entries()) {
      if (!overwrite.has(i)) continue;
      await repo.patchDay(conflict.date, { [conflict.metric]: conflict.incoming });
      c++;
    }
    setMsg({
      ok: true,
      text: `Kész: ${n} nap frissült${c ? `, ${c} kézi értéket felülírtál` : ''}.`,
    });
    setPlan(null);
  };

  return (
    <div>
      <Button
        variant="secondary"
        icon={<FileSpreadsheet className="size-4" aria-hidden />}
        onClick={() => void choose()}
      >
        Óraadat-export beolvasása
      </Button>
      {msg && (
        <p
          className={`mt-3 rounded-xl px-4 py-2.5 text-[14px] ${msg.ok ? 'bg-good-fill text-good' : 'bg-bad-fill text-bad'}`}
        >
          {msg.text}
        </p>
      )}
      {plan && (
        <div className="mt-4 rounded-xl bg-surface-2/70 p-4 text-[14px]">
          <p>
            <strong>{plan.apply.length}</strong> nap kap új óraadatot ·{' '}
            <strong>{plan.unchanged}</strong> érték már egyezik ·{' '}
            <strong>{plan.conflicts.length}</strong> ütközés kézzel beírt értékkel.
          </p>
          {plan.conflicts.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-muted">
                Ahol bejelölöd, ott az export értéke írja felül a kézit:
              </p>
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {plan.conflicts.map((c, i) => (
                  <li key={`${c.date}-${c.metric}`}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={overwrite.has(i)}
                        onChange={(e) => {
                          const next = new Set(overwrite);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setOverwrite(next);
                        }}
                      />
                      <span className="w-20 text-muted">{formatDateShort(c.date)}</span>
                      <span className="w-28">{METRICS[c.metric].short}</span>
                      <span className="num">
                        {formatMetricWithUnit(c.metric, c.current)} →{' '}
                        {formatMetricWithUnit(c.metric, c.incoming)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              variant="plan"
              size="sm"
              onClick={() => void apply()}
              disabled={!plan.apply.length && !overwrite.size}
            >
              Beolvasztás
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPlan(null)}>
              Mégse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
