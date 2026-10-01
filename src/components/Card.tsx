import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn('card p-5 md:p-6', className)} {...rest}>
      {children}
    </section>
  );
}

export function CardLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('label-caps mb-3', className)}>{children}</div>;
}
