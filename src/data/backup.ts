// JSON biztonsági mentés, visszatöltés és automatikus mentés választott mappába
// (Chrome/Edge: File System Access API). Az automatikus mentés mindig a valódi adatokat menti.

import { makeBackup } from '@/domain/io/merge';
import { todayISO } from '@/domain/dates';
import { downloadText } from '@/lib/files';
import type { Repository } from './repository';

export function backupFileName(date = todayISO()): string {
  return `bazis-mentes-${date}.json`;
}

export async function backupText(repo: Repository): Promise<string> {
  return JSON.stringify(makeBackup(await repo.exportAll()), null, 2);
}

export async function downloadBackup(repo: Repository): Promise<void> {
  downloadText(backupFileName(), await backupText(repo), 'application/json');
  await repo.updateSettings({
    autosave: { ...(await repo.getSettings()).autosave, lastOfferedAt: new Date().toISOString() },
  });
}

export async function restoreBackup(
  repo: Repository,
  text: string,
  mode: 'merge' | 'replace',
): Promise<{ ok: true; days: number } | { ok: false; error: string }> {
  const { parseBackup } = await import('@/domain/io/backup');
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  await repo.importAll(parsed.backup.data, mode);
  return { ok: true, days: parsed.backup.data.days.length };
}

// ---------------------------------------------------------------------------
// Automatikus mentés mappába
// ---------------------------------------------------------------------------

type PermissionState = 'granted' | 'denied' | 'prompt';

interface DirHandle {
  name: string;
  getFileHandle(
    name: string,
    opts?: { create?: boolean },
  ): Promise<{
    createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  }>;
  queryPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (opts?: {
    id?: string;
    mode?: 'readwrite';
    startIn?: string;
  }) => Promise<DirHandle>;
};

const KEY = 'autosaveDir';

export function supportsFolderAutosave(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as PickerWindow).showDirectoryPicker === 'function'
  );
}

export type AutosaveStatus = 'unsupported' | 'none' | 'granted' | 'prompt' | 'denied';

export async function autosaveStatus(realRepo: Repository): Promise<AutosaveStatus> {
  if (!supportsFolderAutosave()) return 'unsupported';
  const handle = await realRepo.kvGet<DirHandle>(KEY);
  if (!handle) return 'none';
  try {
    return (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
  } catch {
    return 'prompt';
  }
}

/** Mappa kiválasztása (felhasználói gesztusból hívandó). */
export async function chooseAutosaveFolder(realRepo: Repository): Promise<string | undefined> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return undefined;
  try {
    const handle = await picker({ id: 'bazis-mentes', mode: 'readwrite', startIn: 'documents' });
    await realRepo.kvSet(KEY, handle);
    const s = await realRepo.getSettings();
    await realRepo.updateSettings({ autosave: { ...s.autosave, folderName: handle.name } });
    await writeAutosave(realRepo, true);
    return handle.name;
  } catch {
    return undefined; // a felhasználó megszakította
  }
}

export async function forgetAutosaveFolder(realRepo: Repository): Promise<void> {
  await realRepo.kvSet(KEY, undefined);
  const s = await realRepo.getSettings();
  await realRepo.updateSettings({ autosave: { ...s.autosave, folderName: undefined } });
}

/** Engedély megújítása (felhasználói gesztusból). */
export async function renewAutosavePermission(realRepo: Repository): Promise<boolean> {
  const handle = await realRepo.kvGet<DirHandle>(KEY);
  if (!handle?.requestPermission) return false;
  try {
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Mentés a választott mappába. `force` nélkül naponta legfeljebb egyszer ír.
 * Két fájl: a napi (bazis-mentes-ÉÉÉÉ-HH-NN.json) és a mindig legfrissebb.
 */
export async function writeAutosave(realRepo: Repository, force = false): Promise<boolean> {
  if (!supportsFolderAutosave()) return false;
  const handle = await realRepo.kvGet<DirHandle>(KEY);
  if (!handle) return false;
  const settings = await realRepo.getSettings();
  const today = todayISO();
  const last = settings.autosave?.lastWrittenAt;
  if (!force && last && todayISO(new Date(last)) === today) return false;
  try {
    const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (perm !== 'granted') return false;
    const text = await backupText(realRepo);
    for (const name of [backupFileName(today), 'bazis-mentes-legujabb.json']) {
      const file = await handle.getFileHandle(name, { create: true });
      const w = await file.createWritable();
      await w.write(text);
      await w.close();
    }
    await realRepo.updateSettings({
      autosave: {
        ...settings.autosave,
        lastWrittenAt: new Date().toISOString(),
        folderName: handle.name,
      },
    });
    return true;
  } catch {
    return false;
  }
}
