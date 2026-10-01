// Háttérben futó, láthatatlan vezérlők: téma, tartós tárolás, automatikus mentés.

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRepo } from '@/data/context';
import { writeAutosave } from '@/data/backup';
import { requestPersistence } from '@/data/persist';
import { writeLocal } from '@/lib/localPref';

export function ThemeController() {
  const { realRepo } = useRepo();
  const theme = useLiveQuery(async () => (await realRepo.getSettings()).theme, [realRepo]);
  useEffect(() => {
    if (!theme) return;
    writeLocal('bazis.theme', theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  return null;
}

export function PersistenceController() {
  useEffect(() => {
    void requestPersistence();
  }, []);
  return null;
}

/** Napi automatikus mentés a választott mappába (ha van engedély). */
export function AutosaveController() {
  const { realRepo } = useRepo();
  useEffect(() => {
    const run = () => void writeAutosave(realRepo);
    run();
    const id = window.setInterval(run, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [realRepo]);
  return null;
}
