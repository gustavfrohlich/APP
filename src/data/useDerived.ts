// Származtatott, memoizált számítások a képernyőknek (heti összesítő, összevetések).
import { useMemo } from 'react';
import { compareNights } from '@/domain/comparisons';
import { weeklySummaries } from '@/domain/weekly';
import { useAppData } from './context';

export function useWeekly() {
  const { entries, settings, plan, baseline } = useAppData();
  return useMemo(
    () =>
      weeklySummaries({
        entries,
        start: settings.startDate,
        weeks: plan.length,
        plan,
        baseline,
        subjective: settings.subjectiveBaseline,
      }),
    [entries, settings.startDate, settings.subjectiveBaseline, plan, baseline],
  );
}

export function useComparisons() {
  const { entries, baseline } = useAppData();
  return useMemo(() => compareNights(entries, baseline), [entries, baseline]);
}
