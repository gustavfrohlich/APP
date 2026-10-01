// Az aktív adattár (valódi vagy demó) és az élő adat-pillanatkép a képernyőknek.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { computeBaseline } from '@/domain/baseline';
import { toEntryMap } from '@/domain/entries';
import type { ISODate } from '@/domain/types';
import { weekInfo } from '@/domain/weeks';
import {
  AppDataContext,
  RepoContext,
  type AppData,
  type Mode,
  type RepoContextValue,
} from './context';
import { DEMO_DB_NAME, REAL_DB_NAME } from './db';
import { DexieRepository, type Repository } from './repository';
import { useToday } from './useToday';

/** A demó adatbázis a mai naphoz igazítva töltődik fel (naponta egyszer frissül). */
async function ensureDemoSeeded(repo: Repository, today: ISODate): Promise<void> {
  if ((await repo.kvGet<string>('demoSeededFor')) === today) return;
  const { generateDemo } = await import('@/domain/demo/generate');
  await repo.importAll(generateDemo(today), 'replace');
  await repo.kvSet('demoSeededFor', today);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const realRepo = useMemo(() => new DexieRepository(REAL_DB_NAME, 'real'), []);
  const demoRepo = useMemo(() => new DexieRepository(DEMO_DB_NAME, 'demo'), []);
  const today = useToday();
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    let alive = true;
    void realRepo.getSettings().then(async (s) => {
      if (s.demo) await ensureDemoSeeded(demoRepo, today);
      if (alive) setMode(s.demo ? 'demo' : 'real');
    });
    return () => {
      alive = false;
    };
  }, [realRepo, demoRepo, today]);

  const setDemo = useCallback(
    async (on: boolean) => {
      if (on) await ensureDemoSeeded(demoRepo, today);
      await realRepo.updateSettings({ demo: on });
      setMode(on ? 'demo' : 'real');
    },
    [realRepo, demoRepo, today],
  );

  const value = useMemo<RepoContextValue | null>(
    () => (mode ? { repo: mode === 'demo' ? demoRepo : realRepo, realRepo, mode, setDemo } : null),
    [mode, demoRepo, realRepo, setDemo],
  );

  if (!value) return <div className="min-h-dvh" aria-busy="true" />;
  return (
    <RepoContext.Provider value={value}>
      <AppDataProvider key={value.mode} repo={value.repo} today={today}>
        {children}
      </AppDataProvider>
    </RepoContext.Provider>
  );
}

function AppDataProvider({
  repo,
  today,
  children,
}: {
  repo: Repository;
  today: ISODate;
  children: ReactNode;
}) {
  const settings = useLiveQuery(() => repo.getSettings(), [repo]);
  const plan = useLiveQuery(() => repo.getPlan(), [repo]);
  const days = useLiveQuery(() => repo.listDays(), [repo]);
  const baselineNights = useLiveQuery(() => repo.getBaselineNights(), [repo]);
  const baselineDays = useLiveQuery(() => repo.getBaselineDays(), [repo]);

  const value = useMemo<AppData | null>(() => {
    if (!settings || !plan || !days || !baselineNights || !baselineDays) return null;
    const info = weekInfo(today, settings.startDate, plan.length);
    const lookupWeek = info.phase === 'before' ? 1 : Math.min(Math.max(info.week, 1), plan.length);
    return {
      ready: true,
      today,
      settings,
      plan,
      days,
      entries: toEntryMap(days),
      baselineNights,
      baselineDays,
      baseline: computeBaseline(baselineNights, baselineDays),
      info,
      currentWeek: plan.find((w) => w.week === lookupWeek),
    };
  }, [settings, plan, days, baselineNights, baselineDays, today]);

  if (!value) return <div className="min-h-dvh" aria-busy="true" />;
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
