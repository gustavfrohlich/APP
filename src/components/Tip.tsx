import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

interface TipProps {
  label: ReactNode;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactNode;
}

/** Tooltip, amely a billentyűparancsot is mutatja. */
export function Tip({ label, shortcut, side = 'top', children }: TipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={8}
          className="z-[100] flex items-center gap-2 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-bg shadow-lg select-none"
        >
          {label}
          {shortcut && (
            <span className="rounded border border-white/20 px-1 text-[11px] text-bg/80">
              {shortcut}
            </span>
          )}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
