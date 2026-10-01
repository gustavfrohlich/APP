// Egy nap részletei: minden mező szerkeszthető ugyanazokkal a vezérlőkkel, a baseline-tól való
// eltéréssel; törlés megerősítéssel. Jövőbeli nap nem szerkeszthető.

import { useState, type ReactNode } from 'react';
import { Building2, House, MapPin, Moon, Sun, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { ChoiceChips, ToggleChips } from '@/components/Chips';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MetricField } from '@/components/MetricField';
import { Scale } from '@/components/Scale';
import { Segmented } from '@/components/Segmented';
import { Stepper } from '@/components/Stepper';
import { ToneBadge } from '@/components/Tone';
import { useAppData, useRepo } from '@/data/context';
import type { DayPatch } from '@/data/repository';
import { hasAnyData } from '@/domain/entries';
import { article, capitalize, formatDateLong, formatSigned } from '@/domain/format';
import { BLOATING_WHEN_LABELS, DIET_LABELS, EXERCISE_LABELS } from '@/domain/io/journalColumns';
import { WATCH_METRICS, type ScaleMetric } from '@/domain/metrics';
import { nightLabel, nightScore } from '@/domain/nightScore';
import type {
  BloatingWhen,
  DayEntry,
  DietAdherence,
  Exercise,
  ISODate,
  Location,
} from '@/domain/types';
import { dietWeek, sleepWeek } from '@/domain/weeks';
import { useCheckin } from '@/features/checkin/context';
import { DEFAULT_TAGS } from '@/features/checkin/tags';
import { cn } from '@/lib/cn';

const LOCATIONS = [
  {
    value: 'budapest' as Location,
    label: 'Budapest',
    icon: <Building2 className="size-4" aria-hidden />,
  },
  {
    value: 'home_sk' as Location,
    label: 'Otthon (SK)',
    icon: <House className="size-4" aria-hidden />,
  },
  { value: 'other' as Location, label: 'Máshol', icon: <MapPin className="size-4" aria-hidden /> },
];

function Row({
  label,
  children,
  note,
  stacked,
}: {
  label: string;
  children: ReactNode;
  note?: ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-2 py-2.5">
        <div className="flex items-baseline justify-between gap-3 text-[14px] font-medium">
          {label}
          {note && <span className="text-[12px] font-normal text-muted">{note}</span>}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-4 gap-y-1 py-2.5">
      <div className="pt-2 text-[14px] font-medium">
        {label}
        {note && <div className="text-[12px] font-normal text-muted">{note}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const SCALES: { key: ScaleMetric; label: string; anchors: [string, string] }[] = [
  { key: 'nose', label: 'Orr / légzés', anchors: ['szabad', 'eldugult'] },
  { key: 'fatigue', label: 'Fáradtság', anchors: ['friss', 'alig bírtam'] },
  { key: 'postMealFatigue', label: 'Evés utáni fáradtság', anchors: ['semmi', 'le kellett dőlni'] },
  { key: 'bloating', label: 'Puffadás', anchors: ['semmi', 'fájdalmas'] },
];

export function DayDetail({ date }: { date: ISODate }) {
  const { entries, baseline, settings, plan, today } = useAppData();
  const { repo } = useRepo();
  const checkin = useCheckin();
  const [confirm, setConfirm] = useState(false);
  const e: DayEntry = entries.get(date) ?? { date, updatedAt: '' };
  const update = (patch: DayPatch) => void repo.patchDay(date, patch);
  const future = date > today;
  const week = dietWeek(date, settings.startDate);
  const pw = plan.find((w) => w.week === week);
  const sw = sleepWeek(date, settings.startDate);
  const label = nightLabel(nightScore(e, baseline), 'day');
  const missed = !future && date < today && date >= settings.startDate && !hasAnyData(e);
  const subj = settings.subjectiveBaseline;
  const tags = [
    ...DEFAULT_TAGS,
    ...(settings.customTags ?? []).filter((t) => !DEFAULT_TAGS.includes(t)),
  ];

  const subjNote = (k: keyof typeof subj, v: number | undefined) => {
    const est = subj[k];
    if (est === undefined || v === undefined)
      return est !== undefined ? `becslésed: ${est}` : undefined;
    const d = v - est;
    const worse = k === 'sleepQuality' ? d <= -1 : d >= 1;
    const better = k === 'sleepQuality' ? d >= 1 : d <= -1;
    return (
      <span className={cn(worse && 'text-bad', better && 'text-good')}>
        becslésed {est} · {formatSigned(d, 0)}
      </span>
    );
  };

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[26px] leading-tight font-semibold tracking-tight">
            {capitalize(formatDateLong(date))}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {pw
              ? `${week}. hét · ${pw.food}`
              : week < 1
                ? 'Alapidőszak (a kísérlet előtt)'
                : 'A terven kívül'}
            {sw >= 1 && sw !== week
              ? ` · az éjszaka ${article(String(sw))} ${sw}. hét ételét tükrözi`
              : ''}
          </p>
        </div>
        {label && <ToneBadge tone={label.tone} />}
      </header>

      {future ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-muted">
          Jövőbeli nap – még nem szerkeszthető.
        </p>
      ) : (
        <>
          {missed && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line px-4 py-3">
              <span className="text-[15px]">Ez a nap kimaradt – pótolod?</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Sun className="size-4" aria-hidden />}
                  onClick={() => checkin.open('morning', date)}
                >
                  Reggel
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Moon className="size-4" aria-hidden />}
                  onClick={() => checkin.open('evening', date)}
                >
                  Este
                </Button>
              </div>
            </div>
          )}

          <section aria-labelledby="dd-night" className="border-t border-line pt-3">
            <h3 id="dd-night" className="label-caps mb-1 flex items-center gap-2 text-night">
              <Sun className="size-3.5" aria-hidden /> Éjszaka (reggeli check-in)
            </h3>
            <Row label="Hol aludtál?">
              <Segmented
                options={LOCATIONS}
                value={e.location}
                onChange={(v) => update({ location: v })}
                label="Hol aludtál?"
                size="sm"
              />
            </Row>
            <Row label="Barátnő itt aludt?">
              <Segmented
                options={[
                  { value: true, label: 'Igen' },
                  { value: false, label: 'Nem' },
                ]}
                value={e.partnerStayed}
                onChange={(v) => update({ partnerStayed: v })}
                label="Barátnő itt aludt?"
                size="sm"
                className="min-w-40"
              />
            </Row>
            <Row label="Alvásminőség" note={subjNote('sleepQuality', e.sleepQuality)} stacked>
              <Scale
                min={1}
                max={10}
                reversed
                size="sm"
                anchors={['borzalmas', 'kipihent']}
                label="Alvásminőség"
                value={e.sleepQuality}
                onChange={(v) => update({ sleepQuality: v })}
              />
            </Row>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 py-3">
              {WATCH_METRICS.map((m) => (
                <MetricField
                  key={`${date}-${m}`}
                  metric={m}
                  value={e[m]}
                  stat={baseline[m]}
                  imported={e.deviceSource === 'import'}
                  compact
                  onCommit={(v) => update({ [m]: v, deviceSource: 'manual' })}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="dd-day" className="mt-2 border-t border-line pt-3">
            <h3 id="dd-day" className="label-caps mb-1 flex items-center gap-2 text-day">
              <Moon className="size-3.5" aria-hidden /> Nap (esti check-in)
            </h3>
            {SCALES.map((s) => (
              <Row
                key={s.key}
                label={s.label}
                note={subjNote(s.key as keyof typeof subj, e[s.key])}
                stacked
              >
                <Scale
                  min={0}
                  max={10}
                  size="sm"
                  anchors={s.anchors}
                  label={s.label}
                  value={e[s.key]}
                  onChange={(v) => update({ [s.key]: v })}
                />
              </Row>
            ))}
            {(e.bloating ?? 0) >= 3 && (
              <Row label="Puffadás mikor?">
                <ChoiceChips<BloatingWhen>
                  label="Puffadás mikor?"
                  options={(Object.entries(BLOATING_WHEN_LABELS) as [BloatingWhen, string][]).map(
                    ([value, l]) => ({ value, label: l }),
                  )}
                  value={e.bloatingWhen}
                  onChange={(v) => update({ bloatingWhen: v })}
                />
              </Row>
            )}
            <Row label="Diéta betartva?">
              <Segmented<DietAdherence>
                options={(Object.entries(DIET_LABELS) as [DietAdherence, string][]).map(
                  ([value, l]) => ({ value, label: l }),
                )}
                value={e.diet}
                onChange={(v) => update({ diet: v })}
                label="Diéta betartva?"
                accent="day"
                size="sm"
              />
            </Row>
            {e.diet && e.diet !== 'yes' && (
              <Row label="Mi volt?">
                <ToggleChips
                  label="Mi volt?"
                  options={[
                    'étterem',
                    'édesség',
                    'pékáru',
                    'tejtermék',
                    'fűszeres étel',
                    'nassolás',
                    'alkohol',
                  ]}
                  value={e.dietSlip ?? []}
                  onChange={(v) => update({ dietSlip: v.length ? v : undefined })}
                />
              </Row>
            )}
            <Row label="Koffein / alkohol">
              <div className="flex flex-wrap items-center gap-4">
                <Stepper
                  label="Koffein (adag)"
                  min={0}
                  max={6}
                  value={e.caffeine}
                  onChange={(v) => update({ caffeine: v })}
                />
                <Stepper
                  label="Alkohol (ital)"
                  min={0}
                  max={8}
                  value={e.alcohol}
                  onChange={(v) => update({ alcohol: v })}
                />
              </div>
            </Row>
            <Row label="Mozgás">
              <Segmented<Exercise>
                options={(Object.entries(EXERCISE_LABELS) as [Exercise, string][]).map(
                  ([value, l]) => ({ value, label: l }),
                )}
                value={e.exercise}
                onChange={(v) => update({ exercise: v })}
                label="Mozgás"
                accent="day"
                size="sm"
              />
            </Row>
            <Row label="Stressz" stacked>
              <Scale
                min={0}
                max={10}
                size="sm"
                anchors={['nyugodt', 'extrém']}
                label="Stressz"
                value={e.stress}
                onChange={(v) => update({ stress: v })}
              />
            </Row>
            <div className="grid max-w-md grid-cols-2 gap-4 py-3">
              <MetricField
                key={`${date}-rhrDay`}
                metric="rhrDay"
                label="Nappali pulzus"
                value={e.rhrDay}
                stat={baseline.rhrDay}
                compact
                onCommit={(v) => update({ rhrDay: v })}
              />
              <MetricField
                key={`${date}-hrvDay`}
                metric="hrvDay"
                label="Nappali HRV"
                value={e.hrvDay}
                stat={baseline.hrvDay}
                compact
                onCommit={(v) => update({ hrvDay: v })}
              />
            </div>
            <Row label="Címkék">
              <ToggleChips
                label="Címkék"
                options={tags}
                value={e.tags ?? []}
                onChange={(v) => update({ tags: v.length ? v : undefined })}
              />
            </Row>
            <Row label="Megjegyzés">
              <textarea
                key={`${date}-note`}
                className="input min-h-20 resize-y"
                defaultValue={e.note}
                aria-label="Megjegyzés"
                placeholder="Bármi szokatlan…"
                onBlur={(ev) => {
                  const v = ev.target.value.trim() || undefined;
                  if (v !== e.note) update({ note: v });
                }}
              />
            </Row>
          </section>

          {hasAnyData(e) && (
            <div className="mt-4 flex justify-end border-t border-line pt-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => setConfirm(true)}
              >
                A nap törlése
              </Button>
            </div>
          )}
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title="Törlöd ezt a napot?"
            description={`${capitalize(formatDateLong(date))} minden adata törlődik. Ezt nem lehet visszavonni (csak egy korábbi mentésből).`}
            confirmLabel="Törlés"
            onConfirm={() => void repo.deleteDay(date)}
          />
        </>
      )}
    </div>
  );
}
