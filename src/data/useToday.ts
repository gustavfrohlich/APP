import { useEffect, useState } from 'react';
import { todayISO } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

/** A mai nap; éjfélkor és az ablak újbóli megnyitásakor frissül. */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const update = () => setToday(todayISO());
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const timer = window.setTimeout(update, midnight.getTime() - now.getTime());
    const onVisible = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', update);
    };
  }, [today]);
  return today;
}
