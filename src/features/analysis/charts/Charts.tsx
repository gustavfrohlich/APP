// A grafikonok egy lusta csomagban: csak az Elemzés megnyitásakor töltődnek le.
import { useAppData } from '@/data/context';
import { useWeekly } from '@/data/useDerived';
import { Card } from '@/components/Card';
import { MetricExplorer } from './MetricExplorer';
import { NightScoreChart } from './NightScoreChart';
import { WeeklyMultiples } from './WeeklyMultiples';

export default function Charts() {
  const { entries, baseline, settings, today, plan, days } = useAppData();
  const summaries = useWeekly();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-1 font-serif text-xl font-semibold">Éjszakák napról napra</h2>
        <p className="mb-4 text-[14px] text-muted">Kattints egy oszlopra a nap részleteiért.</p>
        <NightScoreChart
          entries={entries}
          baseline={baseline}
          start={settings.startDate}
          today={today}
          plan={plan}
        />
      </Card>
      <Card>
        <h2 className="mb-1 font-serif text-xl font-semibold">Heti tünetek</h2>
        <p className="mb-4 text-[14px] text-muted">
          Heti átlagok; a szaggatott vonal a saját kiinduló becslésed (az összképnél a baseline).
        </p>
        <WeeklyMultiples summaries={summaries} subjective={settings.subjectiveBaseline} />
      </Card>
      <Card>
        <h2 className="mb-1 font-serif text-xl font-semibold">Mutató-böngésző</h2>
        <p className="mb-4 text-[14px] text-muted">
          Bármely mutató napi értékei a baseline-hoz és a hetekhez mérve.
        </p>
        <MetricExplorer
          entries={entries}
          baseline={baseline}
          subjective={settings.subjectiveBaseline}
          start={settings.startDate}
          today={today}
          plan={plan}
          firstDate={days[0]?.date}
        />
      </Card>
    </div>
  );
}
