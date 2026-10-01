import { Link, useLocation } from 'react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '@/app/nav';
import { Tip } from '@/components/Tip';
import { modKey } from '@/lib/platform';
import { cn } from '@/lib/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <nav
      aria-label="Fő navigáció"
      className={cn(
        'no-print sticky top-0 z-30 flex h-dvh shrink-0 flex-col border-r border-line bg-[var(--nav-bg)] backdrop-blur-xl transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-[240px]',
      )}
    >
      <div className={cn('flex h-16 items-center gap-3 px-5', collapsed && 'justify-center px-0')}>
        <img src="./icon.svg" alt="" className="size-8 rounded-[9px]" />
        {!collapsed && (
          <span className="font-serif text-[22px] font-semibold tracking-tight">Bázis</span>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>

      <div className="mt-auto p-3">
        <Tip label={collapsed ? 'Kinyitás' : 'Összecsukás'} shortcut={`${modKey()}+B`} side="right">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Navigáció kinyitása' : 'Navigáció összecsukása'}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-[18px]" aria-hidden />
                <span>Összecsukás</span>
              </>
            )}
          </button>
        </Tip>
      </div>
    </nav>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation();
  const isActive = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
  return (
    <Tip label={item.label} shortcut={`${modKey()}+${item.shortcut}`} side="right">
      <Link
        to={item.to}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-surface text-ink shadow-[var(--shadow)] ring-1 ring-[var(--card-border)]'
            : 'text-muted hover:bg-surface-2 hover:text-ink',
        )}
      >
        <item.icon
          aria-hidden
          className={cn('size-[20px] shrink-0', isActive && 'text-night')}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        {collapsed ? (
          <span className="sr-only">{item.label}</span>
        ) : (
          <>
            <span className="flex-1">{item.label}</span>
            <span className="kbd opacity-0 transition-opacity group-hover:opacity-100">
              {modKey()} {item.shortcut}
            </span>
          </>
        )}
      </Link>
    </Tip>
  );
}
