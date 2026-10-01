// Üres állapot: rövid, kedves szöveg és egyszerű vonalas illusztráció.
import type { ReactNode } from 'react';

const ART = {
  journal: (
    <g>
      <rect x="22" y="14" width="76" height="92" rx="10" />
      <path d="M38 38h44M38 52h44M38 66h28" />
      <circle cx="84" cy="84" r="14" />
      <path d="M78 84l4 4 8-8" />
    </g>
  ),
  chart: (
    <g>
      <path d="M18 98h84" />
      <rect x="28" y="62" width="12" height="36" rx="4" />
      <rect x="50" y="44" width="12" height="54" rx="4" />
      <rect x="72" y="70" width="12" height="28" rx="4" />
      <path d="M24 40c14-14 28 4 42-10s24-8 30-14" />
    </g>
  ),
  moon: (
    <g>
      <path d="M74 22a34 34 0 1 0 24 52A28 28 0 0 1 74 22z" />
      <path d="M30 26l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
    </g>
  ),
  leaf: (
    <g>
      <path d="M28 92C28 52 52 24 96 22c0 44-28 70-68 70z" />
      <path d="M28 92c18-22 36-38 56-52" />
    </g>
  ),
};

export function EmptyState({
  art = 'journal',
  title,
  children,
  action,
}: {
  art?: keyof typeof ART;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted/60"
        aria-hidden
      >
        {ART[art]}
      </svg>
      <p className="font-serif text-xl font-semibold">{title}</p>
      {children && <div className="max-w-sm text-[15px] text-muted">{children}</div>}
      {action}
    </div>
  );
}
