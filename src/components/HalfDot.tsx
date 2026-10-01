// Kör két félkörrel: bal fele a reggeli, jobb fele az esti check-in állapota.

export function HalfDot({
  morning,
  evening,
  size = 28,
  missed,
}: {
  morning: 'todo' | 'partial' | 'done';
  evening: 'todo' | 'partial' | 'done';
  size?: number;
  missed?: boolean;
}) {
  const r = size / 2 - 1.5;
  const c = size / 2;
  const fill = (s: string, color: string) =>
    s === 'done'
      ? color
      : s === 'partial'
        ? `color-mix(in oklab, ${color} 40%, var(--surface))`
        : 'var(--surface)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <path
        d={`M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r} Z`}
        fill={fill(morning, 'var(--night)')}
      />
      <path
        d={`M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} Z`}
        fill={fill(evening, 'var(--day)')}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={missed ? 'var(--muted)' : 'var(--line)'}
        strokeWidth="1.5"
        strokeDasharray={missed ? '3 2.5' : undefined}
      />
    </svg>
  );
}
