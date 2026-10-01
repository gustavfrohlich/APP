import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

const loadFeatures = () => import('./motionFeatures').then((m) => m.default);

/** Framer Motion lustán betöltött funkciókkal; „prefers-reduced-motion” esetén minden animáció kikapcsol. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
