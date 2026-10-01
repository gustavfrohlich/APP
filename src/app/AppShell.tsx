import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Sidebar } from '@/app/Sidebar';
import { NAV_ITEMS } from '@/app/nav';
import { Header } from '@/app/Header';
import { hasMod } from '@/lib/platform';
import { readLocal, writeLocal } from '@/lib/localPref';

export function AppShell() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => readLocal('bazis.navCollapsed') === '1');

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      writeLocal('bazis.navCollapsed', c ? '0' : '1');
      return !c;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd + 1–4 (asztali appként) és Alt + 1–4 (böngészőfülön) a fülek között.
      const digit = /^Digit([1-4])$/.exec(e.code)?.[1];
      if (digit && (hasMod(e) || (e.altKey && !e.ctrlKey && !e.metaKey))) {
        const item = NAV_ITEMS[Number(digit) - 1];
        if (item) {
          e.preventDefault();
          navigate(item.to);
        }
        return;
      }
      if (hasMod(e) && e.key.toLowerCase() === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, toggle]);

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Ugrás a tartalomra
      </a>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 lg:px-10"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
