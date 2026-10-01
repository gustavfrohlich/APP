// Első indítás: üdvözlés (demó-gombbal), kezdés dátuma, baseline-import, szubjektív baseline,
// emlékeztetők. Minden lépés kihagyható.

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { m } from 'framer-motion';
import { CalendarClock, FlaskConical, MonitorDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAppData, useRepo } from '@/data/context';
import { isISODate, weekdayIndex } from '@/domain/dates';
import { formatDateLong } from '@/domain/format';
import type { SubjectiveBaseline } from '@/domain/types';
import { exportIcs } from '@/lib/exporters';
import { useInstallPrompt } from '@/lib/install';
import { cn } from '@/lib/cn';
import { BaselineImport } from '@/features/settings/BaselineImport';
import { SubjectiveSliders } from '@/features/settings/SubjectiveSliders';

const STEPS = ['Üdv', 'Kezdés', 'Baseline', 'Becslés', 'Emlékeztetők'];

export function Onboarding() {
  const { settings, days } = useAppData();
  const { repo, mode, setDemo } = useRepo();
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(settings.startDate);
  const [subj, setSubj] = useState<SubjectiveBaseline>(settings.subjectiveBaseline);
  const [reminders, setReminders] = useState(settings.reminders);
  const { canInstall, install } = useInstallPrompt();

  if (mode !== 'real' || settings.onboardedAt || days.length > 0) return null;

  const finish = () => void repo.updateSettings({ onboardedAt: new Date().toISOString() });
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-bg/92 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed inset-x-0 top-[6vh] z-[91] mx-auto flex max-h-[88vh] w-[min(680px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-lg)] ring-1 ring-[var(--card-border)]"
        >
          <div className="flex items-center justify-between gap-3 px-8 pt-6">
            <ol className="flex gap-1.5" aria-label="Lépések">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  aria-current={i === step ? 'step' : undefined}
                  className={cn(
                    'h-1.5 w-8 rounded-full transition-colors',
                    i <= step ? 'bg-plan' : 'bg-line',
                  )}
                >
                  <span className="sr-only">{s}</span>
                </li>
              ))}
            </ol>
            {step > 0 && (
              <button
                type="button"
                onClick={finish}
                className="text-[13px] text-muted hover:text-ink"
              >
                Az egészet kihagyom
              </button>
            )}
          </div>

          <m.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto px-8 py-6"
          >
            {step === 0 && (
              <div className="flex flex-col items-start gap-4 py-4">
                <img src="./icon.svg" alt="" className="size-14 rounded-2xl" />
                <Dialog.Title className="font-serif text-[34px] leading-tight font-semibold tracking-tight">
                  Üdv a Bázisban!
                </Dialog.Title>
                <p className="text-[17px] leading-relaxed text-ink/85">
                  8–9 hét alatt kiderül, melyik étel rontja az alvásodat, a légzésedet és az
                  emésztésedet – naponta két 30 másodperces check-innel. Minden adat ezen a gépen
                  marad.
                </p>
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <Dialog.Title className="font-serif text-[26px] font-semibold">
                  Mikor kezded?
                </Dialog.Title>
                <p className="text-[15px] text-muted">
                  Az első hét hétfője. Minden új étel hétfőn indul; addig is kitöltheted a
                  check-ineket – ezek lesznek az alapidőszak napjai.
                </p>
                <input
                  type="date"
                  className="input h-12 w-56 text-lg"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  aria-label="Kezdés dátuma"
                />
                {isISODate(start) && (
                  <p
                    className={cn(
                      'text-[14px]',
                      weekdayIndex(start) === 0 ? 'text-muted' : 'text-amber',
                    )}
                  >
                    {formatDateLong(start)}
                    {weekdayIndex(start) !== 0 && ' – ez nem hétfő; javasolt a hétfői kezdés.'}
                  </p>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <Dialog.Title className="font-serif text-[26px] font-semibold">
                  Baseline: a mostani étrended
                </Dialog.Title>
                <p className="text-[15px] text-muted">
                  Húzd be az óra két exportját (vagy a régi Excel-trackert). Ehhez méri az app
                  minden éjszakádat: átlag, szórás, napok száma és időszak – azonnal látod.
                </p>
                <BaselineImport compact onImported={next} />
              </div>
            )}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <Dialog.Title className="font-serif text-[26px] font-semibold">
                  Szerinted milyen volt eddig egy átlagos nap?
                </Dialog.Title>
                <p className="text-[15px] text-muted">
                  Öt szám – ehhez színezi a heti tüneteket. Később is módosíthatod.
                </p>
                <SubjectiveSliders value={subj} onChange={setSubj} />
              </div>
            )}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <Dialog.Title className="font-serif text-[26px] font-semibold">
                  Emlékeztetők
                </Dialog.Title>
                <p className="text-[15px] text-muted">
                  Két rövid check-in naponta. A naptáradba mentve emlékeztet – a böngésző magától
                  nem tud.
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="grid gap-1 text-[14px] font-medium">
                    Reggel
                    <input
                      type="time"
                      className="input h-11 w-36"
                      value={reminders.morning}
                      onChange={(e) => setReminders({ ...reminders, morning: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-[14px] font-medium">
                    Este
                    <input
                      type="time"
                      className="input h-11 w-36"
                      value={reminders.evening}
                      onChange={(e) => setReminders({ ...reminders, evening: e.target.value })}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    icon={<CalendarClock className="size-4" aria-hidden />}
                    onClick={() => exportIcs(reminders, start)}
                  >
                    Naptárba (.ics)
                  </Button>
                </div>
                {canInstall && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2/70 p-4">
                    <MonitorDown className="size-5 text-plan-ink" aria-hidden />
                    <span className="flex-1 text-[14px]">
                      Telepítsd asztali appként: saját ablakban, net nélkül is fut, és a böngésző
                      takarítása sem viszi el az adatokat.
                    </span>
                    <Button size="sm" variant="plan" onClick={() => void install()}>
                      Telepítés
                    </Button>
                  </div>
                )}
              </div>
            )}
          </m.div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-8 py-4">
            {step === 0 ? (
              <>
                <Button
                  variant="secondary"
                  icon={<FlaskConical className="size-4" aria-hidden />}
                  onClick={() => void setDemo(true)}
                >
                  Kipróbálom demó adatokkal
                </Button>
                <Button variant="plan" size="lg" onClick={next} autoFocus>
                  Kezdjük
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>
                  Vissza
                </Button>
                <div className="flex gap-2">
                  {step < STEPS.length - 1 && (
                    <Button variant="ghost" size="lg" onClick={next}>
                      Kihagyom
                    </Button>
                  )}
                  <Button
                    variant="plan"
                    size="lg"
                    onClick={async () => {
                      if (step === 1 && isISODate(start))
                        await repo.updateSettings({ startDate: start });
                      if (step === 3) await repo.updateSettings({ subjectiveBaseline: subj });
                      if (step === 4) {
                        await repo.updateSettings({
                          reminders,
                          onboardedAt: new Date().toISOString(),
                        });
                        return;
                      }
                      next();
                    }}
                  >
                    {step === STEPS.length - 1 ? 'Kész, indulhat' : 'Tovább'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
