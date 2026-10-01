// Service worker: offline működés, és értesítés, ha új verzió érhető el.
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/Button';

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="no-print fixed right-6 bottom-6 z-[70] flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-lg)] ring-1 ring-line"
    >
      <span className="text-[14px]">Új verzió érhető el.</span>
      <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
        Frissítés
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Később
      </Button>
    </div>
  );
}
