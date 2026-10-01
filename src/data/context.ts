// Kontextusok és hookok az aktív adattárhoz és az élő adat-pillanatképhez.

import { createContext, useContext } from 'react';
import type { Baseline } from '@/domain/baseline';
import type { EntryMap } from '@/domain/entries';
import type {
  BaselineDay,
  BaselineNight,
  DayEntry,
  ISODate,
  PlanWeek,
  Settings,
} from '@/domain/types';
import type { WeekInfo } from '@/domain/weeks';
import type { Repository } from './repository';

export type Mode = 'real' | 'demo';

export interface RepoContextValue {
  repo: Repository;
  realRepo: Repository;
  mode: Mode;
  setDemo: (on: boolean) => Promise<void>;
}

export const RepoContext = createContext<RepoContextValue | null>(null);

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error('useRepo: hiányzó DataProvider');
  return ctx;
}

export interface AppData {
  ready: boolean;
  today: ISODate;
  settings: Settings;
  plan: PlanWeek[];
  days: DayEntry[];
  entries: EntryMap;
  baselineNights: BaselineNight[];
  baselineDays: BaselineDay[];
  baseline: Baseline;
  info: WeekInfo;
  /** Az aktuális (vagy a kezdés előtt az első) hét terve. */
  currentWeek?: PlanWeek;
}

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData: hiányzó DataProvider');
  return ctx;
}
