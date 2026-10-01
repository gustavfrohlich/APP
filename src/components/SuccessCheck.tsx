// Visszafogott siker-animáció: kirajzolódó pipa egy körben (konfetti nincs).
import { m } from 'framer-motion';

export function SuccessCheck({
  color = 'var(--good)',
  size = 56,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      <m.circle
        cx="28"
        cy="28"
        r="25"
        fill="none"
        stroke={color}
        strokeWidth="3"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <m.path
        d="M17 29 l7.5 7.5 L39.5 21"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.35, ease: 'easeOut' }}
      />
    </svg>
  );
}
