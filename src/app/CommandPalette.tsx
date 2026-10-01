// Parancspaletta (Ctrl/Cmd + K): Reggeli/Esti check-in, Ugrás dátumra, Hét lezárása, Mentés most, navigáció.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BookOpen,
  CalendarCheck,
  CalendarSearch,
  ChartColumn,
  FlaskConical,
  House,
  Moon,
  Printer,
  Route,
  Save,
  Search,
  Settings,
  Sun,
  SunMoon,
} from 'lucide-react';
import { useAppData, useRepo } from '@/data/context';
import { autosaveStatus, downloadBackup, writeAutosave } from '@/data/backup';
import { parseFlexibleDate } from '@/domain/dates';
import { formatDateLong } from '@/domain/format';
import { stripAccents } from '@/domain/io/table';
import { useCheckin } from '@/features/checkin/context';
import { cn } from '@/lib/cn';
import { hasMod, modKey } from '@/lib/platform';
import { useLatest } from '@/lib/useLatest';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void | Promise<void>;
  keepOpen?: boolean;
}

const norm = (s: string) => stripAccents(s.toLowerCase());

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [dateMode, setDateMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const checkin = useCheckin();
  const { today } = useAppData();
  const { realRepo, repo, mode, setDemo } = useRepo();
  const listRef = useRef<HTMLUListElement>(null);

  const show = (o: boolean) => {
    if (o) {
      setQuery('');
      setIndex(0);
      setDateMode(false);
    }
    setOpen(o);
  };
  const showRef = useLatest(show);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hasMod(e) && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        showRef.current(!document.querySelector('[data-palette]'));
      }
    };
    const onOpen = () => showRef.current(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('bazis:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('bazis:palette', onOpen);
    };
  }, [showRef]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const saveNow = async () => {
    if ((await autosaveStatus(realRepo)) === 'granted' && (await writeAutosave(realRepo, true))) {
      setToast('Elmentve a választott mappába.');
    } else {
      await downloadBackup(realRepo);
      setToast('A mentés letöltődött.');
    }
  };

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'morning',
        label: 'Reggeli check-in',
        hint: 'R',
        icon: <Sun className="size-4" />,
        keywords: 'reggel ejszaka alvas',
        run: () => checkin.open('morning'),
      },
      {
        id: 'evening',
        label: 'Esti check-in',
        hint: 'E',
        icon: <Moon className="size-4" />,
        keywords: 'este nap tunetek',
        run: () => checkin.open('evening'),
      },
      {
        id: 'date',
        label: 'Ugrás dátumra…',
        icon: <CalendarSearch className="size-4" />,
        keywords: 'datum nap naplo',
        keepOpen: true,
        run: () => setDateMode(true),
      },
      {
        id: 'close',
        label: 'Hét lezárása',
        icon: <CalendarCheck className="size-4" />,
        keywords: 'eredmeny atment reakcio',
        run: () => navigate('/elemzes?lezaras=1'),
      },
      {
        id: 'save',
        label: 'Mentés most',
        icon: <Save className="size-4" />,
        keywords: 'backup json biztonsagi',
        run: saveNow,
      },
      {
        id: 'today',
        label: 'Ma',
        hint: `${modKey()} 1`,
        icon: <House className="size-4" />,
        run: () => navigate('/'),
      },
      {
        id: 'journal',
        label: 'Napló',
        hint: `${modKey()} 2`,
        icon: <BookOpen className="size-4" />,
        run: () => navigate('/naplo'),
      },
      {
        id: 'analysis',
        label: 'Elemzés',
        hint: `${modKey()} 3`,
        icon: <ChartColumn className="size-4" />,
        run: () => navigate('/elemzes'),
      },
      {
        id: 'plan',
        label: 'Terv',
        hint: `${modKey()} 4`,
        icon: <Route className="size-4" />,
        run: () => navigate('/terv'),
      },
      {
        id: 'doctor',
        label: 'Összefoglaló orvosnak',
        icon: <Printer className="size-4" />,
        keywords: 'nyomtatas pdf',
        run: () => navigate('/osszefoglalo'),
      },
      {
        id: 'settings',
        label: 'Beállítások',
        icon: <Settings className="size-4" />,
        run: () => navigate('/beallitasok'),
      },
      {
        id: 'theme',
        label: 'Téma váltása (világos / sötét / rendszer)',
        icon: <SunMoon className="size-4" />,
        keywords: 'sotet mod dark',
        run: async () => {
          const s = await realRepo.getSettings();
          const next = s.theme === 'light' ? 'dark' : s.theme === 'dark' ? 'system' : 'light';
          await realRepo.updateSettings({ theme: next });
          setToast(
            `Téma: ${next === 'light' ? 'világos' : next === 'dark' ? 'sötét' : 'rendszer'}`,
          );
        },
      },
      {
        id: 'demo',
        label: mode === 'demo' ? 'Demó mód kikapcsolása' : 'Demó mód bekapcsolása',
        icon: <FlaskConical className="size-4" />,
        keywords: 'demo kitalalt adatok',
        run: () => setDemo(mode !== 'demo'),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, repo],
  );

  const filtered = commands.filter((c) => {
    const q = norm(query.trim());
    if (!q) return true;
    return norm(`${c.label} ${c.keywords ?? ''}`).includes(q);
  });
  const queryDate = parseFlexibleDate(query.trim());

  const run = async (c: Command) => {
    if (!c.keepOpen) setOpen(false);
    await c.run();
  };

  const goDate = (d: string | undefined) => {
    if (!d) return;
    setOpen(false);
    navigate(`/naplo?nap=${d}`);
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={show}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-[2px]" />
          <Dialog.Content
            aria-describedby={undefined}
            data-palette
            className="fixed inset-x-0 top-[14vh] z-[61] mx-auto w-[min(600px,calc(100vw-32px))] overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-lg)] ring-1 ring-[var(--card-border)] outline-none"
          >
            <Dialog.Title className="sr-only">Parancsok</Dialog.Title>
            {dateMode ? (
              <div className="p-5">
                <label htmlFor="palette-date" className="label-caps">
                  Ugrás dátumra
                </label>
                <input
                  id="palette-date"
                  type="date"
                  autoFocus
                  max={today}
                  defaultValue={today}
                  className="input mt-2 h-12 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goDate((e.target as HTMLInputElement).value);
                  }}
                />
                <p className="mt-2 text-[13px] text-muted">Enter: megnyitás a Naplóban</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4">
                  <Search className="size-4 text-muted" aria-hidden />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIndex(0);
                    }}
                    onKeyDown={(e) => {
                      const total = filtered.length + (queryDate ? 1 : 0);
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIndex((i) => (i + 1) % Math.max(1, total));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setIndex((i) => (i - 1 + total) % Math.max(1, total));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (queryDate && index === 0) goDate(queryDate);
                        else {
                          const c = filtered[index - (queryDate ? 1 : 0)];
                          if (c) void run(c);
                        }
                      }
                    }}
                    placeholder="Parancs vagy dátum (pl. 2026-10-08)…"
                    aria-label="Parancs keresése"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="palette-list"
                    className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
                  />
                  <kbd className="kbd">Esc</kbd>
                </div>
                <ul
                  id="palette-list"
                  ref={listRef}
                  role="listbox"
                  className="max-h-[50vh] overflow-y-auto p-2"
                >
                  {queryDate && (
                    <PaletteItem
                      active={index === 0}
                      icon={<CalendarSearch className="size-4" />}
                      label={`Ugrás: ${formatDateLong(queryDate)}`}
                      onClick={() => goDate(queryDate)}
                    />
                  )}
                  {filtered.map((c, i) => (
                    <PaletteItem
                      key={c.id}
                      active={index === i + (queryDate ? 1 : 0)}
                      icon={c.icon}
                      label={c.label}
                      hint={c.hint}
                      onClick={() => void run(c)}
                    />
                  ))}
                  {filtered.length === 0 && !queryDate && (
                    <li className="px-3 py-6 text-center text-[14px] text-muted">
                      Nincs ilyen parancs.
                    </li>
                  )}
                </ul>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-medium text-bg shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function PaletteItem({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <li
      ref={ref}
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]',
        active ? 'bg-surface-2 text-ink' : 'text-ink/85 hover:bg-surface-2/60',
      )}
    >
      <span className="text-muted" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hint && <span className="kbd">{hint}</span>}
    </li>
  );
}
