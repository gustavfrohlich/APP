import { createContext, useContext } from 'react';
import type { ISODate } from '@/domain/types';

export type CheckinKind = 'morning' | 'evening';

export interface CheckinApi {
  open: (kind: CheckinKind, date?: ISODate) => void;
  close: () => void;
  current?: { kind: CheckinKind; date: ISODate };
}

export const CheckinContext = createContext<CheckinApi | null>(null);

export function useCheckin(): CheckinApi {
  const ctx = useContext(CheckinContext);
  if (!ctx) throw new Error('useCheckin: hiányzó CheckinProvider');
  return ctx;
}
