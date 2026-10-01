import type { Tone } from '@/domain/deviation';

export const TONE_TEXT: Record<Tone, string> = {
  good: 'text-good',
  neutral: 'text-muted',
  bad: 'text-bad',
};

export const TONE_FILL: Record<Tone, string> = {
  good: 'bg-good-fill text-good',
  neutral: 'bg-surface-2 text-muted',
  bad: 'bg-bad-fill text-bad',
};
