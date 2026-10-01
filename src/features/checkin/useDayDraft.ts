// A check-in piszkozata: helyben azonnal frissül, és minden változás rögtön az adatbázisba íródik.
import { useCallback, useRef, useState } from 'react';
import { useAppData, useRepo } from '@/data/context';
import type { DayPatch } from '@/data/repository';
import type { DayEntry, ISODate } from '@/domain/types';

function apply(entry: DayEntry, patch: DayPatch): DayEntry {
  const next: Record<string, unknown> = { ...entry };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  return next as unknown as DayEntry;
}

export function useDayDraft(date: ISODate) {
  const { repo } = useRepo();
  const { entries } = useAppData();
  const [draft, setDraft] = useState<DayEntry>(() => entries.get(date) ?? { date, updatedAt: '' });
  const [saving, setSaving] = useState(0);
  const queue = useRef(Promise.resolve());

  const update = useCallback(
    (patch: DayPatch) => {
      setDraft((d) => apply(d, patch));
      setSaving((n) => n + 1);
      // Sorba fűzve, hogy a gyors egymás utáni válaszok sorrendje megmaradjon.
      queue.current = queue.current
        .then(() => repo.patchDay(date, patch))
        .then(
          () => undefined,
          () => undefined,
        )
        .finally(() => setSaving((n) => n - 1));
    },
    [repo, date],
  );

  return { draft, update, saving: saving > 0 };
}
