// Reggeli check-in: hely + barátnő, alvásminőség, az óra adatai, összegzés.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, House, MapPin } from 'lucide-react';
import { Scale } from '@/components/Scale';
import { Segmented } from '@/components/Segmented';
import { useAppData } from '@/data/context';
import type { DayPatch } from '@/data/repository';
import { isWeekend } from '@/domain/dates';
import { explainNight } from '@/domain/explain';
import { WATCH_METRICS } from '@/domain/metrics';
import { suggestLocation } from '@/domain/suggest';
import type { DayEntry, Location } from '@/domain/types';
import { focusFirstIn } from './focus';
import { QuestionList, type QuestionDef } from './QuestionList';
import { FinishButton, NightSummaryView } from './Summaries';
import { WatchGrid } from './WatchGrid';

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

export function MorningForm({
  draft,
  update,
  onFinish,
}: {
  draft: DayEntry;
  update: (p: DayPatch) => void;
  onFinish: () => void;
}) {
  const { baseline, entries } = useAppData();
  const rows = useRef<(HTMLElement | null)[]>([]);
  const partnerRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const suggested = useMemo(() => suggestLocation(draft.date, entries), [draft.date, entries]);

  const [active, setActive] = useState(() => {
    if (draft.location === undefined || draft.partnerStayed === undefined) return 0;
    if (draft.sleepQuality === undefined) return 1;
    if (WATCH_METRICS.some((m) => draft[m] === undefined)) return 2;
    return 3;
  });
  // Nyitáskor az aktív kérdésre kerül a fókusz.
  const initial = useRef(active);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      initial.current === 3
        ? finishRef.current?.focus()
        : focusFirstIn(rows.current[initial.current]),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  const go = (i: number) => {
    setActive(i);
    requestAnimationFrame(() =>
      i === 3 ? finishRef.current?.focus() : focusFirstIn(rows.current[i]),
    );
  };

  const explanation = explainNight(draft, baseline);

  const questions: QuestionDef[] = [
    {
      id: 'where',
      bare: true,
      content: (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="flex flex-col gap-3">
            <h3 id="q-where" className="text-[17px] font-semibold tracking-tight">
              Hol aludtál?
              {isWeekend(draft.date) && (
                <span className="ml-2 text-[13px] font-normal text-muted">hétvége</span>
              )}
            </h3>
            <Segmented
              options={LOCATIONS}
              value={draft.location}
              suggested={suggested}
              onChange={(v) => update({ location: v })}
              onCommit={() => focusFirstIn(partnerRef.current)}
              labelledBy="q-where"
              accent="night"
              size="lg"
            />
          </div>
          <div ref={partnerRef} className="flex flex-col gap-3">
            <h3 id="partner-label" className="text-[17px] font-semibold tracking-tight">
              Barátnő itt aludt?
            </h3>
            <Segmented
              options={[
                { value: true, label: 'Igen' },
                { value: false, label: 'Nem' },
              ]}
              value={draft.partnerStayed}
              onChange={(v) => update({ partnerStayed: v })}
              onCommit={() => go(1)}
              labelledBy="partner-label"
              accent="night"
              size="lg"
              className="min-w-44"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'quality',
      title: 'Milyen volt az alvás érzésre?',
      hint: 'az óra nélkül',
      content: (
        <Scale
          min={1}
          max={10}
          reversed
          anchors={['borzalmas', 'teljesen kipihent']}
          labelledBy="q-quality"
          value={draft.sleepQuality}
          onChange={(v) => update({ sleepQuality: v })}
          onCommit={() => go(2)}
        />
      ),
    },
    {
      id: 'watch',
      title: 'Az óra adatai',
      hint: 'az alvásidő az ébrenléttel együtt („Sleep”)',
      content: <WatchGrid draft={draft} baseline={baseline} update={update} onDone={() => go(3)} />,
    },
    {
      id: 'summary',
      bare: true,
      content: (
        <div>
          <NightSummaryView x={explanation} />
          <FinishButton ref={finishRef} accent="night" onClick={onFinish} />
        </div>
      ),
    },
  ];

  return (
    <QuestionList
      questions={questions}
      active={active}
      onActivate={setActive}
      accent="night"
      registerRow={(i, el) => {
        rows.current[i] = el;
      }}
    />
  );
}
