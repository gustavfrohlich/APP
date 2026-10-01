import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { AppShell } from '@/app/AppShell';
import { TodayPage } from '@/features/today/TodayPage';

const JournalPage = lazy(() => import('@/features/journal/JournalPage'));
const AnalysisPage = lazy(() => import('@/features/analysis/AnalysisPage'));
const PlanPage = lazy(() => import('@/features/plan/PlanPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="py-24" aria-busy="true" />}>{children}</Suspense>;
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      {
        path: 'naplo',
        element: (
          <Lazy>
            <JournalPage />
          </Lazy>
        ),
      },
      {
        path: 'elemzes',
        element: (
          <Lazy>
            <AnalysisPage />
          </Lazy>
        ),
      },
      {
        path: 'terv',
        element: (
          <Lazy>
            <PlanPage />
          </Lazy>
        ),
      },
      {
        path: 'beallitasok',
        element: (
          <Lazy>
            <SettingsPage />
          </Lazy>
        ),
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
