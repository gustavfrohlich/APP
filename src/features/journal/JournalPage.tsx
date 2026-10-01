// Napló: Naptár nézet (hőtérkép + lista balra, a kiválasztott nap részletei jobbra) és
// Excel-szerű Táblázat nézet, egy kapcsolóval.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, Table2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Segmented } from '@/components/Segmented';
import { useAppData } from '@/data/context';
import { eachDay, isISODate, minDate } from '@/domain/dates';
import { readLocal, writeLocal } from '@/lib/localPref';
import { CalendarHeatmap } from './CalendarHeatmap';
import { DayDetail } from './DayDetail';
import { DayList } from './DayList';
import type { HeatMetric } from './heat';
import { JournalTable } from './JournalTable';

type View = 'calendar' | 'table';

export default function JournalPage() {
  const { today, entries, baseline, settings, plan, days } = useAppData();
  const [params, setParams] = useSearchParams();
  const view: View =
    (params.get('nezet') as View) ?? ((readLocal('bazis.journalView') as View) || 'calendar');
  const paramDay = params.get('nap');
  const selected = paramDay && isISODate(paramDay) && paramDay <= today ? paramDay : today;
  const [month, setMonth] = useState(() => `${selected.slice(0, 7)}-01`);
  const [metric, setMetric] = useState<HeatMetric>(
    () => (readLocal('bazis.heatMetric') as HeatMetric) || 'nightScore',
  );

  // Időrend: a kezdéstől (vagy az első bejegyzéstől, ha az korábbi) ma estig.
  const allDates = useMemo(() => {
    const first = days[0]?.date;
    const from = first ? minDate(first, settings.startDate) : settings.startDate;
    return from <= today ? eachDay(from, today) : [today];
  }, [days, settings.startDate, today]);

  const select = (d: string) => {
    const next = new URLSearchParams(params);
    next.set('nap', d);
    next.delete('nezet');
    setParams(next, { replace: true });
    if (d.slice(0, 7) !== month.slice(0, 7)) setMonth(`${d.slice(0, 7)}-01`);
    writeLocal('bazis.journalView', 'calendar');
  };

  const setView = (v: View) => {
    writeLocal('bazis.journalView', v);
    const next = new URLSearchParams(params);
    next.set('nezet', v);
    setParams(next, { replace: true });
  };

  const listDates = useMemo(
    () => [...allDates].reverse().filter((d) => d >= settings.startDate || entries.has(d)),
    [allDates, settings.startDate, entries],
  );

  return (
    <div className="pt-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[40px] leading-tight font-semibold tracking-[-0.02em]">
            Napló
          </h1>
          <p className="text-[15px] text-muted">
            Minden nap egy helyen – kattints egy napra a részletekért.
          </p>
        </div>
        <Segmented<View>
          options={[
            {
              value: 'calendar',
              label: 'Naptár',
              icon: <CalendarDays className="size-4" aria-hidden />,
            },
            { value: 'table', label: 'Táblázat', icon: <Table2 className="size-4" aria-hidden /> },
          ]}
          value={view}
          onChange={setView}
          label="Nézet"
          size="sm"
          accent="plan"
        />
      </div>

      {days.length === 0 && view === 'calendar' && (
        <Card className="mb-6">
          <EmptyState art="journal" title="Még üres a napló">
            Az első reggeli check-in után itt jelennek meg a napjaid. A Ma képernyőn az{' '}
            <kbd className="kbd">R</kbd> billentyűvel kezdheted.
          </EmptyState>
        </Card>
      )}

      {view === 'table' ? (
        <JournalTable
          dates={allDates}
          entries={entries}
          baseline={baseline}
          start={settings.startDate}
          today={today}
          onOpenDay={select}
        />
      ) : (
        <div className="@container">
          <div className="grid gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card>
                <CalendarHeatmap
                  month={month}
                  onMonth={setMonth}
                  selected={selected}
                  onSelect={select}
                  metric={metric}
                  onMetric={(m) => {
                    setMetric(m);
                    writeLocal('bazis.heatMetric', m);
                  }}
                  entries={entries}
                  baseline={baseline}
                  start={settings.startDate}
                  plan={plan}
                  today={today}
                />
              </Card>
              {listDates.length > 0 && (
                <section aria-labelledby="list-title">
                  <h2 id="list-title" className="label-caps mb-3">
                    Időrendben
                  </h2>
                  <div className="max-h-[560px] overflow-y-auto pr-1">
                    <DayList
                      dates={listDates}
                      entries={entries}
                      baseline={baseline}
                      start={settings.startDate}
                      plan={plan}
                      selected={selected}
                      onSelect={select}
                    />
                  </div>
                </section>
              )}
            </div>
            <Card className="h-fit @5xl:sticky @5xl:top-20">
              <DayDetail key={selected} date={selected} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
