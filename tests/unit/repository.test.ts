import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { closeDb, openDb } from '@/data/db';
import { DexieRepository } from '@/data/repository';
import { makeBackup, parseBackup } from '@/domain/io/backup';
import { generateDemo } from '@/domain/demo/generate';

let n = 0;
const fresh = () => {
  const name = `test-${++n}`;
  return { name, repo: new DexieRepository(name, 'real') };
};

afterEach(async () => {
  await closeDb(`test-${n}`);
});

describe('repository', () => {
  it('üres adatbázisnál alapbeállítások és alapterv', async () => {
    const { repo } = fresh();
    const s = await repo.getSettings();
    expect(s.demo).toBe(false);
    expect(s.reminders).toEqual({ morning: '07:30', evening: '21:00' });
    expect(await repo.getPlan()).toHaveLength(9);
  });

  it('patchDay összefésül, az undefined törli a mezőt', async () => {
    const { repo } = fresh();
    await repo.patchDay('2026-10-06', { sleepQuality: 7, location: 'budapest' });
    const e = await repo.patchDay('2026-10-06', { location: undefined, nose: 2 });
    expect(e).toMatchObject({ date: '2026-10-06', sleepQuality: 7, nose: 2 });
    expect(e.location).toBeUndefined();
    expect(e.updatedAt).toBeTruthy();
  });

  it('JSON mentés → minden törlése → visszatöltés: minden adat visszajön', async () => {
    const { repo } = fresh();
    const demo = generateDemo('2026-10-01');
    await repo.importAll({ ...demo, settings: { ...demo.settings, demo: false } }, 'replace');
    const before = await repo.exportAll();
    const text = JSON.stringify(makeBackup(before));
    await repo.clearAll();
    expect(await repo.listDays()).toHaveLength(0);
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await repo.importAll(parsed.backup.data, 'replace');
    const after = await repo.exportAll();
    expect(after.days).toEqual(before.days);
    expect(after.plan).toEqual(before.plan);
    expect(after.baselineNights).toEqual(before.baselineNights);
    expect(after.baselineDays).toEqual(before.baselineDays);
    expect(after.settings).toEqual({ ...before.settings, schemaVersion: 2 });
  });

  it('összefésülő visszatöltés nem veszít el helyi napot', async () => {
    const { repo } = fresh();
    await repo.patchDay('2026-10-06', { nose: 1 });
    await repo.importAll(
      {
        ...(await repo.exportAll()),
        days: [{ date: '2026-10-07', nose: 4, updatedAt: '2026-10-07T20:00:00Z' }],
      },
      'merge',
    );
    expect((await repo.listDays()).map((d) => d.date)).toEqual(['2026-10-06', '2026-10-07']);
  });

  it('óraadatok beolvasztása forrás-jelöléssel', async () => {
    const { repo } = fresh();
    await repo.applyWatchValues(
      [{ date: '2026-10-06', values: { sleepMin: 470, hrvNight: 80 } }],
      'import',
    );
    expect(await repo.getDay('2026-10-06')).toMatchObject({
      sleepMin: 470,
      hrvNight: 80,
      deviceSource: 'import',
    });
  });

  it('a hét eredményének rögzítése és törlése', async () => {
    const { repo } = fresh();
    await repo.updateWeek(3, { result: 'reaction', resultNote: 'orr' });
    expect((await repo.getPlan())[2]).toMatchObject({ result: 'reaction', resultNote: 'orr' });
    await repo.updateWeek(3, { result: undefined });
    expect((await repo.getPlan())[2]!.result).toBeUndefined();
  });

  it('migráció: az 1. verziós adatbázis 2-re frissül', async () => {
    const name = `legacy-${n}`;
    const legacy = new Dexie(name);
    legacy
      .version(1)
      .stores({
        days: 'date',
        plan: 'week',
        settings: 'id',
        baselineNights: 'date',
        baselineDays: 'date',
      });
    await legacy.open();
    await legacy.table('plan').bulkPut([
      { week: 1, food: 'x', eat: '', tip: '' },
      { week: 9, food: 'tartalék hét', eat: '', tip: '' },
    ]);
    await legacy.table('settings').put({ id: 'app', startDate: '2026-10-05', schemaVersion: 1 });
    legacy.close();
    const db = openDb(name);
    await db.open();
    expect(db.verno).toBe(2);
    const plan = await db.plan.toArray();
    expect(plan.map((w) => w.kind)).toEqual(['base', 'reserve']);
    expect((await db.settings.get('app'))?.schemaVersion).toBe(2);
    await closeDb(name);
  });
});
