// Esti check-in: orr, fáradtság, evés utáni fáradtság, puffadás (+ mikor), a nap röviden,
// címkék és megjegyzés, összegzés.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { ChoiceChips, ToggleChips } from '@/components/Chips';
import { MetricField } from '@/components/MetricField';
import { Scale } from '@/components/Scale';
import { Segmented } from '@/components/Segmented';
import { Stepper } from '@/components/Stepper';
import { useAppData, useRepo } from '@/data/context';
import type { DayPatch } from '@/data/repository';
import { addDays } from '@/domain/dates';
import { explainDay } from '@/domain/explain';
import { BLOATING_WHEN_LABELS, DIET_LABELS, EXERCISE_LABELS } from '@/domain/io/journalColumns';
import { kindOf } from '@/domain/plan';
import { suggestEvening } from '@/domain/suggest';
import type { BloatingWhen, DayEntry, DietAdherence, Exercise } from '@/domain/types';
import { dayInWeek, dietWeek } from '@/domain/weeks';
import { cn } from '@/lib/cn';
import { focusFirstIn } from './focus';
import { QuestionList, type QuestionDef } from './QuestionList';
import { DEFAULT_TAGS } from './tags';
import { DaySummaryView, FinishButton } from './Summaries';

const SLIP_OPTIONS = [
  'étterem',
  'édesség',
  'pékáru',
  'tejtermék',
  'fűszeres étel',
  'nassolás',
  'alkohol',
];

const SYMPTOMS = [
  { key: 'nose', title: 'Orr / légzés', anchors: ['teljesen szabad', 'teljesen eldugult'] },
  { key: 'fatigue', title: 'Fáradtság', anchors: ['friss egész nap', 'alig bírtam fennmaradni'] },
  {
    key: 'postMealFatigue',
    title: 'Evés utáni fáradtság',
    anchors: ['semmi', 'muszáj volt ledőlnöm'],
  },
  { key: 'bloating', title: 'Puffadás', anchors: ['semmi', 'fájdalmas, feszülő has'] },
] as const;

export function EveningForm({
  draft,
  update,
  onFinish,
}: {
  draft: DayEntry;
  update: (p: DayPatch) => void;
  onFinish: () => void;
}) {
  const { entries, settings, plan } = useAppData();
  const { repo } = useRepo();
  const rows = useRef<(HTMLElement | null)[]>([]);
  const whenRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const [more, setMore] = useState(draft.rhrDay !== undefined || draft.hrvDay !== undefined);
  const s = useMemo(() => suggestEvening(draft.date, entries), [draft.date, entries]);

  const shortDone =
    draft.diet !== undefined &&
    draft.caffeine !== undefined &&
    draft.alcohol !== undefined &&
    draft.exercise !== undefined;
  const [active, setActive] = useState(() => {
    const i = SYMPTOMS.findIndex((q) => draft[q.key] === undefined);
    if (i >= 0) return i;
    if (!shortDone) return 4;
    return 6;
  });
  // Nyitáskor az aktív kérdésre kerül a fókusz.
  const initial = useRef(active);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      initial.current === 6
        ? finishRef.current?.focus()
        : focusFirstIn(rows.current[initial.current]),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  const go = (i: number) => {
    setActive(i);
    requestAnimationFrame(() =>
      i === 6 ? finishRef.current?.focus() : focusFirstIn(rows.current[i]),
    );
  };

  const confirmAll = () => {
    update({
      diet: draft.diet ?? s.diet,
      caffeine: draft.caffeine ?? s.caffeine,
      alcohol: draft.alcohol ?? s.alcohol,
      exercise: draft.exercise ?? s.exercise,
      ...(draft.stress === undefined && s.stress !== undefined ? { stress: s.stress } : {}),
    });
    go(5);
  };

  const week = dietWeek(draft.date, settings.startDate);
  const pw = plan.find((w) => w.week === week);
  const recent = [1, 2, 3, 4, 5, 6, 7]
    .map((i) => entries.get(addDays(draft.date, -i)))
    .filter((e): e is DayEntry => !!e);
  const explanation = explainDay(draft, settings.subjectiveBaseline, recent, {
    food: pw?.food,
    dayInWeek: dayInWeek(draft.date, settings.startDate),
    isTestWeek: pw ? kindOf(pw) === 'test' : false,
  });

  const tags = [
    ...DEFAULT_TAGS,
    ...(settings.customTags ?? []).filter((t) => !DEFAULT_TAGS.includes(t)),
  ];

  const questions: QuestionDef[] = [
    ...SYMPTOMS.map((q, i): QuestionDef => ({
      id: q.key,
      title: q.title,
      hint: '0–10',
      content: (
        <div className="flex flex-col gap-4">
          <Scale
            min={0}
            max={10}
            anchors={[q.anchors[0], q.anchors[1]]}
            labelledBy={`q-${q.key}`}
            value={draft[q.key]}
            onChange={(v) => {
              update({
                [q.key]: v,
                ...(q.key === 'bloating' && v < 3 ? { bloatingWhen: undefined } : {}),
              });
            }}
            onCommit={(v) => {
              if (q.key === 'bloating' && v >= 3) focusFirstIn(whenRef.current);
              else go(i + 1);
            }}
          />
          {q.key === 'bloating' && (draft.bloating ?? 0) >= 3 && (
            <div ref={whenRef} className="flex flex-col gap-2">
              <span className="label-caps" id="when-label">
                Mikor?
              </span>
              <ChoiceChips<BloatingWhen>
                label="Puffadás mikor?"
                options={(Object.entries(BLOATING_WHEN_LABELS) as [BloatingWhen, string][]).map(
                  ([value, label]) => ({ value, label }),
                )}
                value={draft.bloatingWhen}
                onChange={(v) => update({ bloatingWhen: v })}
                onCommit={() => go(4)}
              />
            </div>
          )}
        </div>
      ),
    })),
    {
      id: 'short',
      title: 'A nap röviden',
      hint: shortDone ? undefined : 'a tegnapi értékekkel előtöltve',
      content: (
        <div className="flex flex-col gap-4">
          {!shortDone && (
            <Button
              variant="day"
              size="md"
              icon={<CheckCheck className="size-4" aria-hidden />}
              onClick={confirmAll}
              data-autofocus
              className="self-start"
              shortcut="Enter"
              tip="A javaslatok elfogadása"
            >
              Minden stimmel
            </Button>
          )}
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3">
            <span className="label-caps" id="diet-label">
              Diéta betartva?
            </span>
            <Segmented<DietAdherence>
              options={(Object.entries(DIET_LABELS) as [DietAdherence, string][]).map(
                ([value, label]) => ({ value, label }),
              )}
              value={draft.diet}
              suggested={s.diet}
              onChange={(v) =>
                update({
                  diet: v,
                  ...(v === 'yes' ? { dietSlip: undefined, dietSlipNote: undefined } : {}),
                })
              }
              labelledBy="diet-label"
              accent="day"
              size="sm"
              className="max-w-80"
            />
            {draft.diet && draft.diet !== 'yes' && (
              <>
                <span className="label-caps">Mi volt?</span>
                <div className="flex flex-col gap-2">
                  <ToggleChips
                    label="Mi volt?"
                    options={SLIP_OPTIONS}
                    value={draft.dietSlip ?? []}
                    onChange={(v) => update({ dietSlip: v.length ? v : undefined })}
                  />
                  <input
                    className="input h-10 max-w-md"
                    placeholder="Pár szó, ha kell…"
                    aria-label="Mi volt? (szöveg)"
                    defaultValue={draft.dietSlipNote}
                    onBlur={(e) => update({ dietSlipNote: e.target.value.trim() || undefined })}
                  />
                </div>
              </>
            )}
            <span className="label-caps">Koffein</span>
            <div className="flex items-center gap-3">
              <Stepper
                label="Koffein (adag)"
                unit="adag"
                min={0}
                max={6}
                value={draft.caffeine}
                suggested={s.caffeine}
                onChange={(v) => update({ caffeine: v })}
              />
              <span className="text-[13px] text-muted">adag · 1 kávé vagy energiaital = 1</span>
            </div>
            <span className="label-caps">Alkohol</span>
            <div className="flex items-center gap-3">
              <Stepper
                label="Alkohol (ital)"
                unit="ital"
                min={0}
                max={8}
                value={draft.alcohol}
                suggested={s.alcohol}
                onChange={(v) => update({ alcohol: v })}
              />
              <span className="text-[13px] text-muted">ital</span>
            </div>
            <span className="label-caps" id="ex-label">
              Mozgás
            </span>
            <Segmented<Exercise>
              options={(Object.entries(EXERCISE_LABELS) as [Exercise, string][]).map(
                ([value, label]) => ({ value, label }),
              )}
              value={draft.exercise}
              suggested={s.exercise}
              onChange={(v) => update({ exercise: v })}
              labelledBy="ex-label"
              accent="day"
              size="sm"
              className="max-w-md"
            />
            <span className="label-caps" id="stress-label">
              Stressz
            </span>
            <Scale
              min={0}
              max={10}
              size="sm"
              anchors={['nyugodt', 'extrém']}
              labelledBy="stress-label"
              value={draft.stress}
              suggested={s.stress}
              onChange={(v) => update({ stress: v })}
              onCommit={() => go(5)}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'tags',
      title: 'Címkék és megjegyzés',
      hint: 'opcionális',
      content: (
        <div className="flex flex-col gap-3">
          <ToggleChips
            label="Címkék"
            options={tags}
            value={draft.tags ?? []}
            onChange={(v) => update({ tags: v.length ? v : undefined })}
            allowCustom
            onAddCustom={(t) => {
              if (!tags.includes(t))
                void repo.updateSettings({ customTags: [...(settings.customTags ?? []), t] });
            }}
          />
          <textarea
            className="input min-h-20 resize-y"
            placeholder="Bármi szokatlan: gyógyszer, orrspray, betegség, kilengés…"
            aria-label="Megjegyzés"
            defaultValue={draft.note}
            onBlur={(e) => update({ note: e.target.value.trim() || undefined })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
                go(6);
              }
            }}
          />
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((x) => !x)}
            className="flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-ink"
          >
            <ChevronDown
              className={cn('size-4 transition-transform', more && 'rotate-180')}
              aria-hidden
            />
            Több adat (nappali pulzus, HRV)
          </button>
          {more && (
            <div className="grid max-w-md grid-cols-2 gap-4">
              <MetricField
                metric="rhrDay"
                label="Nappali pulzus"
                value={draft.rhrDay}
                onCommit={(v) => update({ rhrDay: v })}
                compact
              />
              <MetricField
                metric="hrvDay"
                label="Nappali HRV"
                value={draft.hrvDay}
                onCommit={(v) => update({ hrvDay: v })}
                compact
              />
            </div>
          )}
          <Button
            data-autofocus
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => go(6)}
            shortcut="Ctrl+Enter"
            tip="Tovább az összegzéshez"
          >
            Tovább
          </Button>
        </div>
      ),
    },
    {
      id: 'summary',
      bare: true,
      content: (
        <div>
          <DaySummaryView x={explanation} />
          <FinishButton ref={finishRef} accent="day" onClick={onFinish} />
        </div>
      ),
    },
  ];

  return (
    <QuestionList
      questions={questions}
      active={active}
      onActivate={setActive}
      accent="day"
      registerRow={(i, el) => {
        rows.current[i] = el;
      }}
    />
  );
}
