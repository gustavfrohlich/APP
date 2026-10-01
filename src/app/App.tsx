import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { AppShell } from '@/app/AppShell';
import { AutosaveController, PersistenceController, ThemeController } from '@/app/controllers';
import { DataProvider } from '@/data/DataProvider';
import { TodayPage } from '@/features/today/TodayPage';

const JournalPage = lazy(() => import('@/features/journal/JournalPage'));
const AnalysisPage = lazy(() => import('@/features/analysis/AnalysisPage'));
const PlanPage = lazy(() => import('@/features/plan/PlanPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="py-24" aria-busy="true" />}>{children}</Suspense>;
}

/** Hash routing: bármilyen statikus hostingon működik, szerveroldali átirányítás nélkül. */
export function App() {
  return (
    <DataProvider>
      <ThemeController />
      <PersistenceController />
      <AutosaveController />
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<TodayPage />} />
            <Route
              path="naplo"
              element={
                <Lazy>
                  <JournalPage />
                </Lazy>
              }
            />
            <Route
              path="elemzes"
              element={
                <Lazy>
                  <AnalysisPage />
                </Lazy>
              }
            />
            <Route
              path="terv"
              element={
                <Lazy>
                  <PlanPage />
                </Lazy>
              }
            />
            <Route
              path="beallitasok"
              element={
                <Lazy>
                  <SettingsPage />
                </Lazy>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
