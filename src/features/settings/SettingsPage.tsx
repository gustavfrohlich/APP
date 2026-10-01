// Beállítások: kezdés, baseline, óraadatok, adatok és mentés, emlékeztetők, megjelenés, telepítés, súgó.

import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router';
import {
  CalendarClock,
  Download,
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  FolderOpen,
  MonitorDown,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Segmented } from '@/components/Segmented';
import { useAppData, useRepo } from '@/data/context';
import {
  autosaveStatus,
  chooseAutosaveFolder,
  downloadBackup,
  forgetAutosaveFolder,
  renewAutosavePermission,
  restoreBackup,
  writeAutosave,
  type AutosaveStatus,
} from '@/data/backup';
import { isPersisted, requestPersistence } from '@/data/persist';
import { closeDb, REAL_DB_NAME } from '@/data/db';
import { diffDays, isISODate, weekdayIndex } from '@/domain/dates';
import { formatDateFull, formatMetric } from '@/domain/format';
import { BASELINE_METRICS, METRICS } from '@/domain/metrics';
import type { ThemePref } from '@/domain/types';
import { exportCsv, exportIcs, exportXlsx } from '@/lib/exporters';
import { pickFile } from '@/lib/files';
import { useInstallPrompt } from '@/lib/install';
import { BaselineImport } from './BaselineImport';
import { Help } from './Help';
import { SubjectiveSliders } from './SubjectiveSliders';
import { WatchImport } from './WatchImport';

const SECTIONS = [
  { id: 'kezdes', label: 'Kezdés' },
  { id: 'baseline', label: 'Baseline' },
  { id: 'oraadatok', label: 'Óraadatok' },
  { id: 'adatok', label: 'Adatok és mentés' },
  { id: 'emlekeztetok', label: 'Emlékeztetők' },
  { id: 'megjelenes', label: 'Megjelenés' },
  { id: 'telepites', label: 'Telepítés' },
  { id: 'sugo', label: 'Súgó' },
];

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <h2 className="font-serif text-[22px] font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-1 text-[14px] text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Notice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-3 rounded-xl px-4 py-2.5 text-[14px] ${ok ? 'bg-good-fill text-good' : 'bg-bad-fill text-bad'}`}
    >
      {children}
    </p>
  );
}

function StartDate() {
  const { settings, today } = useAppData();
  const { repo } = useRepo();
  const [draft, setDraft] = useState(settings.startDate);
  const [confirm, setConfirm] = useState(false);
  const started = diffDays(settings.startDate, today) >= 7;
  const save = () => void repo.updateSettings({ startDate: draft });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-[14px] font-medium">
        A kísérlet első napja (hétfő)
        <input
          type="date"
          className="input h-11 w-48"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <Button
        variant="plan"
        disabled={!isISODate(draft) || draft === settings.startDate}
        onClick={() => (started ? setConfirm(true) : save())}
      >
        Mentés
      </Button>
      {isISODate(draft) && weekdayIndex(draft) !== 0 && (
        <p className="w-full text-[13px] text-amber">
          Ez nem hétfő – az új ételek mindig ezen a napon indulnak.
        </p>
      )}
      {started && (
        <p className="w-full text-[13px] text-muted">
          Az első hét már lement: a kezdés módosítása minden nap hét-hozzárendelését megváltoztatja.
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Biztosan módosítod a kezdést?"
        description="Minden nap hét-hozzárendelése változik: a heti átlagok, a romlás-összevetések és a hét-sávok mind újraszámolódnak. A beírt napi adatok megmaradnak."
        confirmLabel="Módosítás"
        onConfirm={save}
      />
    </div>
  );
}

function BaselineSection() {
  const { baseline, settings } = useAppData();
  const { repo } = useRepo();
  const [reimport, setReimport] = useState(false);
  const has = BASELINE_METRICS.some((m) => baseline[m]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="label-caps mb-2">Importált statisztika</h3>
        {has ? (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="py-1 font-medium">Mutató</th>
                <th className="py-1 text-right font-medium">Átlag</th>
                <th className="py-1 text-right font-medium">Szórás</th>
                <th className="py-1 text-right font-medium">n</th>
              </tr>
            </thead>
            <tbody>
              {BASELINE_METRICS.map((m) => {
                const s = baseline[m];
                return (
                  <tr key={m} className="border-t border-line">
                    <td
                      className="py-1.5"
                      title={s ? `${formatDateFull(s.from)} – ${formatDateFull(s.to)}` : undefined}
                    >
                      {METRICS[m].label}
                    </td>
                    <td className="num py-1.5 text-right font-semibold">
                      {s
                        ? `${formatMetric(m, s.mean)}${METRICS[m].kind === 'decimal' ? ` ${METRICS[m].unit}` : ''}`
                        : '–'}
                    </td>
                    <td className="num py-1.5 text-right">
                      {s?.sd !== undefined ? formatMetric(m, s.sd) : '–'}
                    </td>
                    <td className="num py-1.5 text-right">{s?.n ?? '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-[14px] text-muted">
            Még nincs importálva. Enélkül nincs éjszaka-összkép és óraadat-színezés.
          </p>
        )}
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          icon={<Upload className="size-4" aria-hidden />}
          onClick={() => setReimport((r) => !r)}
        >
          {has ? 'Újraimportálás' : 'Importálás'}
        </Button>
        {reimport && (
          <div className="mt-4">
            <BaselineImport compact onImported={() => setReimport(false)} />
          </div>
        )}
      </div>
      <div>
        <h3 className="label-caps mb-1">Szubjektív becslésed</h3>
        <p className="mb-4 text-[13px] text-muted">
          Szerinted milyen volt eddig egy átlagos nap? Ehhez színeződnek a heti tünetek (±1 pont).
        </p>
        <SubjectiveSliders
          value={settings.subjectiveBaseline}
          onChange={(v) => void repo.updateSettings({ subjectiveBaseline: v })}
        />
      </div>
    </div>
  );
}

function DataSection() {
  const { repo, realRepo, mode, setDemo } = useRepo();
  const settings = useLiveQuery(() => realRepo.getSettings(), [realRepo]);
  const [status, setStatus] = useState<AutosaveStatus | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [del1, setDel1] = useState(false);
  const [del2, setDel2] = useState(false);
  const [typed, setTyped] = useState('');
  const [persist, setPersist] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void autosaveStatus(realRepo).then(setStatus);
    void isPersisted().then(setPersist);
  }, [realRepo, settings?.autosave?.folderName]);

  const exportData = async (kind: 'xlsx' | 'csv') => {
    const data = await repo.exportAll();
    if (kind === 'xlsx') await exportXlsx(data);
    else exportCsv(data);
  };

  const restore = async (mode2: 'merge' | 'replace') => {
    if (!restoreText) return;
    const r = await restoreBackup(realRepo, restoreText, mode2);
    setRestoreText(null);
    setMsg(
      r.ok ? { ok: true, text: `Visszatöltve: ${r.days} nap.` } : { ok: false, text: r.error },
    );
  };

  const deleteAll = async () => {
    await realRepo.clearAll();
    await closeDb(REAL_DB_NAME);
    window.location.hash = '#/';
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      {mode === 'demo' && (
        <p className="rounded-xl bg-amber-fill px-4 py-2.5 text-[14px] text-amber">
          Most demó módban vagy: a mentés, a visszatöltés és az automatikus mentés mindig a valódi
          adataidra vonatkozik; az exportok a demó adatokat írják ki.
        </p>
      )}

      <div>
        <h3 className="label-caps mb-2">Automatikus mentés mappába</h3>
        {status === 'unsupported' ? (
          <p className="text-[14px] text-muted">
            Ez a böngésző nem tud mappába menteni (Chrome-ban és Edge-ben megy). Vasárnaponként a Ma
            képernyő felajánlja a mentés letöltését.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[14px]">
            {settings?.autosave?.folderName && status !== 'none' ? (
              <>
                <span>
                  Mappa: <strong>{settings.autosave.folderName}</strong>
                  {settings.autosave.lastWrittenAt && (
                    <span className="text-muted">
                      {' '}
                      · utolsó mentés:{' '}
                      {new Date(settings.autosave.lastWrittenAt).toLocaleString('hu-HU')}
                    </span>
                  )}
                </span>
                {status === 'granted' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () =>
                      setMsg(
                        (await writeAutosave(realRepo, true))
                          ? { ok: true, text: 'Elmentve.' }
                          : { ok: false, text: 'Nem sikerült menteni.' },
                      )
                    }
                  >
                    Mentés most
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="plan"
                    onClick={async () =>
                      setStatus((await renewAutosavePermission(realRepo)) ? 'granted' : 'prompt')
                    }
                  >
                    Engedély megújítása
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void forgetAutosaveFolder(realRepo).then(() => setStatus('none'))}
                >
                  Kikapcsolás
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                icon={<FolderOpen className="size-4" aria-hidden />}
                onClick={() => void chooseAutosaveFolder(realRepo)}
              >
                Mappa kiválasztása (pl. OneDrive)
              </Button>
            )}
          </div>
        )}
        <p className="mt-2 text-[13px] text-muted">
          Naponta és minden hét lezárásakor JSON-mentést ír a mappába (bazis-mentes-ÉÉÉÉ-HH-NN.json
          és a mindig friss bazis-mentes-legujabb.json).
        </p>
      </div>

      <div>
        <h3 className="label-caps mb-2">Mentés és visszatöltés</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<FileJson className="size-4" aria-hidden />}
            onClick={() => void downloadBackup(realRepo)}
          >
            JSON-mentés letöltése
          </Button>
          <Button
            variant="secondary"
            icon={<RotateCcw className="size-4" aria-hidden />}
            onClick={async () => {
              const [f] = await pickFile('.json,application/json');
              if (f) setRestoreText(await f.text());
            }}
          >
            Visszatöltés mentésből…
          </Button>
        </div>
        {restoreText && (
          <div className="mt-3 rounded-xl bg-surface-2/70 p-4 text-[14px]">
            <p className="mb-3">Hogyan töltsem vissza?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="plan" onClick={() => void restore('merge')}>
                Összefésülés (a frissebb nyer)
              </Button>
              <Button size="sm" variant="danger" onClick={() => void restore('replace')}>
                Felülírás (a mostani adatok helyett)
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRestoreText(null)}>
                Mégse
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="label-caps mb-2">Export</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="size-4" aria-hidden />}
            onClick={() => void exportData('xlsx')}
          >
            Excel (xlsx)
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="size-4" aria-hidden />}
            onClick={() => void exportData('csv')}
          >
            CSV
          </Button>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          Az xlsx Napló lapja ugyanazokkal az oszlopokkal készül, mint az Excel-tracker Napló lapja
          (plusz Áttekintés, Terv és Baseline lap).
        </p>
      </div>

      <div>
        <h3 className="label-caps mb-2">Demó mód</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={mode === 'demo' ? 'primary' : 'secondary'}
            icon={<FlaskConical className="size-4" aria-hidden />}
            onClick={() => void setDemo(mode !== 'demo')}
          >
            {mode === 'demo' ? 'Demó mód kikapcsolása' : 'Demó mód bekapcsolása'}
          </Button>
          <span className="text-[13px] text-muted">
            Kitalált adatok külön adatbázisban – a valódiakat sosem írják felül.
          </span>
        </div>
      </div>

      <div>
        <h3 className="label-caps mb-2">Tartós tárolás</h3>
        <p className="text-[14px]">
          {persist === true
            ? '✓ A böngésző tartósnak jelölte az adatokat (magától nem törli).'
            : persist === false
              ? 'A böngésző még nem jelölte tartósnak az adatokat.'
              : 'A böngésző nem ad tájékoztatást a tárolásról.'}{' '}
          {persist === false && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void requestPersistence().then(setPersist)}
            >
              Kérés most
            </Button>
          )}
        </p>
      </div>

      <div className="border-t border-line pt-5">
        <h3 className="label-caps mb-2 text-bad">Minden adat törlése</h3>
        <Button
          variant="secondary"
          className="text-bad"
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => setDel1(true)}
        >
          Minden valódi adat törlése…
        </Button>
        {msg && <Notice ok={msg.ok}>{msg.text}</Notice>}
      </div>

      <ConfirmDialog
        open={del1}
        onOpenChange={setDel1}
        title="Minden adatot törölsz?"
        description="A napló, a terv, a baseline és a beállítások mind törlődnek erről a gépről. Előtte érdemes letölteni egy mentést."
        confirmLabel="Tovább a törléshez"
        onConfirm={() => {
          setTyped('');
          setDel2(true);
        }}
      >
        <Button
          className="mt-4"
          size="sm"
          variant="secondary"
          icon={<FileJson className="size-4" aria-hidden />}
          onClick={() => void downloadBackup(realRepo)}
        >
          Előbb mentés letöltése
        </Button>
      </ConfirmDialog>
      <ConfirmDialog
        open={del2}
        onOpenChange={setDel2}
        title="Utolsó lépés"
        description="Írd be: TÖRLÉS – és a gomb végleg törli az adatokat."
        confirmLabel="Végleges törlés"
        confirmDisabled={typed.trim().toUpperCase() !== 'TÖRLÉS'}
        onConfirm={() => {
          if (typed.trim().toUpperCase() === 'TÖRLÉS') void deleteAll();
        }}
      >
        <input
          className="input mt-4"
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Megerősítés: TÖRLÉS"
        />
      </ConfirmDialog>
    </div>
  );
}

function Reminders() {
  const { settings } = useAppData();
  const { repo } = useRepo();
  const r = settings.reminders;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="grid gap-1 text-[14px] font-medium">
        Reggel
        <input
          type="time"
          className="input h-11 w-36"
          value={r.morning}
          onChange={(e) =>
            void repo.updateSettings({ reminders: { ...r, morning: e.target.value } })
          }
        />
      </label>
      <label className="grid gap-1 text-[14px] font-medium">
        Este
        <input
          type="time"
          className="input h-11 w-36"
          value={r.evening}
          onChange={(e) =>
            void repo.updateSettings({ reminders: { ...r, evening: e.target.value } })
          }
        />
      </label>
      <Button
        variant="secondary"
        icon={<CalendarClock className="size-4" aria-hidden />}
        onClick={() => exportIcs(r, settings.startDate)}
      >
        Naptárfájl (.ics) letöltése
      </Button>
      <p className="w-full text-[13px] text-muted">
        A böngésző magától nem tud értesíteni, ha nincs nyitva – a .ics fájlt nyisd meg, és a
        naptárad két ismétlődő napi emlékeztetőt kap.
      </p>
    </div>
  );
}

function Appearance() {
  const { realRepo } = useRepo();
  const theme = useLiveQuery(async () => (await realRepo.getSettings()).theme, [realRepo]);
  return (
    <Segmented<ThemePref>
      options={[
        { value: 'light', label: 'Világos' },
        { value: 'dark', label: 'Sötét' },
        { value: 'system', label: 'Rendszer' },
      ]}
      value={theme}
      onChange={(v) => void realRepo.updateSettings({ theme: v })}
      label="Téma"
      accent="plan"
    />
  );
}

function Install() {
  const { canInstall, installed, install } = useInstallPrompt();
  if (installed) return <p className="text-[14px]">✓ Asztali appként fut.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="plan"
        icon={<MonitorDown className="size-4" aria-hidden />}
        disabled={!canInstall}
        onClick={() => void install()}
      >
        Telepítés asztali appként
      </Button>
      <span className="text-[13px] text-muted">
        {canInstall
          ? 'Saját ablakban, net nélkül is fut, és a böngészőadatok takarítása sem érinti.'
          : 'Chrome-ban vagy Edge-ben a címsor telepítés ikonjával (vagy a menüből) telepítheted – lásd a Súgót.'}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { hash } = useLocation();
  useEffect(() => {
    // A fejléc demó-jelvénye és más hivatkozások egy részhez ugranak (pl. #adatok).
    const id = hash.replace('#', '');
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <div className="pt-6">
      <h1 className="mb-6 font-serif text-[40px] leading-tight font-semibold tracking-[-0.02em]">
        Beállítások
      </h1>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Beállítások részei" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/beallitasok#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(s.id)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="block rounded-lg px-3 py-1.5 text-[14px] text-muted hover:bg-surface-2 hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            id="kezdes"
            title="Kezdés"
            intro="Az első diéta-hét hétfője. Ehhez igazodik minden hét, alvás-hét és összesítés."
          >
            <StartDate />
          </Section>
          <Section
            id="baseline"
            title="Baseline"
            intro="A mostani étrended átlaga – ehhez hasonlít minden nap és hét."
          >
            <BaselineSection />
          </Section>
          <Section
            id="oraadatok"
            title="Óraadatok importja"
            intro="Az óra exportja a kísérlet alatt is behúzható: dátum szerint beolvad a napokba, kézzel beírt értéket kérdés nélkül nem ír felül."
          >
            <WatchImport />
          </Section>
          <Section
            id="adatok"
            title="Adatok és mentés"
            intro="Minden adat ezen a gépen él. A mentés a te biztosítékod."
          >
            <DataSection />
          </Section>
          <Section id="emlekeztetok" title="Emlékeztetők">
            <Reminders />
          </Section>
          <Section id="megjelenes" title="Megjelenés">
            <Appearance />
          </Section>
          <Section id="telepites" title="Telepítés">
            <Install />
          </Section>
          <Section id="sugo" title="Súgó">
            <Help />
          </Section>
        </div>
      </div>
    </div>
  );
}
