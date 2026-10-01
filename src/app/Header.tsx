import { Link } from 'react-router';
import { Settings } from 'lucide-react';
import { Tip } from '@/components/Tip';

export function Header() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-transparent bg-[var(--nav-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-6 lg:px-10">
        <div className="flex-1" />
        <Tip label="Beállítások">
          <Link
            to="/beallitasok"
            aria-label="Beállítások"
            className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Settings className="size-[20px]" aria-hidden />
          </Link>
        </Tip>
      </div>
    </header>
  );
}
