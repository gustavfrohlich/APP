import { BookOpen, ChartColumn, House, Route } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Ma', icon: House, shortcut: '1' },
  { to: '/naplo', label: 'Napló', icon: BookOpen, shortcut: '2' },
  { to: '/elemzes', label: 'Elemzés', icon: ChartColumn, shortcut: '3' },
  { to: '/terv', label: 'Terv', icon: Route, shortcut: '4' },
];
