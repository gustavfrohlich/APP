// Javaslat a hét lezárásához. Mindig csak javaslat indoklással – a döntés a felhasználóé.
//
// Reakció:     legalább 2 mutató romlott, vagy bármelyik tünet legalább 2 ponttal nőtt
//              (illetve az alvásminőség legalább 2-vel csökkent).
// Bizonytalan: pontosan 1 mutató romlott, 2 pontnál kevesebbel.
// Átment:      egyébként.

import { article, capitalize, formatSigned, joinHu } from './format';
import { EPS } from './stats';
import type { WeekResult } from './types';
import { WORSEN_LABELS, type WeekComparison, type WorsenKey } from './weekly';

export const BIG_JUMP = 2;

export interface VerdictSuggestion {
  result: WeekResult;
  /** Egy mondatos összefoglaló. */
  summary: string;
  /** Részletes indoklás pontokba szedve. */
  reasons: string[];
  bigJumps: WorsenKey[];
}

export const RESULT_LABELS: Record<WeekResult, string> = {
  pass: 'Átment',
  reaction: 'Reakció',
  unsure: 'Bizonytalan',
};

/** Jelvény-szimbólumok – ugyanazok, mint az Excel Terv lapján („✓ Átment”). */
export const RESULT_SYMBOLS: Record<WeekResult, string> = { pass: '✓', reaction: '✗', unsure: '?' };

export function resultText(r: WeekResult): string {
  return `${RESULT_SYMBOLS[r]} ${RESULT_LABELS[r]}`;
}

/** „✓ Átment” / „Reakció” / „bizonytalan” → eredmény. */
export function parseResult(raw: unknown): WeekResult | undefined {
  const s = String(raw ?? '')
    .replace(/^[✓✗?✔✘×]\s*/, '')
    .trim()
    .toLowerCase();
  if (!s) return undefined;
  if (s.startsWith('átment') || s.startsWith('atment') || s === 'pass') return 'pass';
  if (s.startsWith('reakció') || s.startsWith('reakcio') || s === 'reaction') return 'reaction';
  if (s.startsWith('bizonytalan') || s === 'unsure') return 'unsure';
  return undefined;
}

function deltaText(key: WorsenKey, d: number): string {
  if (key === 'nightScore') return `${formatSigned(d, 2)} szórás`;
  return `${formatSigned(d, 1)} pont`;
}

export function bigJumpsOf(c: WeekComparison): WorsenKey[] {
  const out: WorsenKey[] = [];
  for (const [key, d] of Object.entries(c.deltas) as [WorsenKey, number][]) {
    if (key === 'nightScore') continue;
    if (key === 'sleepQuality' ? d <= -BIG_JUMP + EPS : d >= BIG_JUMP - EPS) out.push(key);
  }
  return out;
}

export function suggestVerdict(c: WeekComparison): VerdictSuggestion {
  if (c.status !== 'ok') {
    return {
      result: 'unsure',
      summary: 'Még nincs elég adat az összevetéshez.',
      reasons: ['A hétnek vagy a viszonyítási alapnak nincs kitöltött adata.'],
      bigJumps: [],
    };
  }
  const against =
    c.against === 'baseline'
      ? 'a kiinduló állapothoz'
      : `${article(String(c.against))} ${c.against}. héthez`;
  const reasons = c.worsened.map(
    (k) => `Romlott ${against} képest: ${WORSEN_LABELS[k]} (${deltaText(k, c.deltas[k]!)})`,
  );
  const bigJumps = bigJumpsOf(c);
  for (const k of bigJumps) {
    reasons.push(
      k === 'sleepQuality'
        ? 'Az alvásminőség legalább 2 ponttal csökkent.'
        : `${capitalize(article(WORSEN_LABELS[k]))} ${WORSEN_LABELS[k]} legalább 2 ponttal nőtt.`,
    );
  }
  const names = c.worsened.map((k) => WORSEN_LABELS[k]);

  if (c.worsened.length >= 2 || bigJumps.length > 0) {
    const jumpText = () => {
      const up = bigJumps.filter((k) => k !== 'sleepQuality').map((k) => WORSEN_LABELS[k]);
      const parts: string[] = [];
      if (up.length)
        parts.push(
          `${article(up[0]!)} ${joinHu(up.map((l, i) => (i === 0 ? l : `${article(l)} ${l}`)))} legalább 2 ponttal nőtt`,
        );
      if (bigJumps.includes('sleepQuality'))
        parts.push('az alvásminőség legalább 2 ponttal csökkent');
      return `${joinHu(parts)}.`;
    };
    const why =
      c.worsened.length >= 2
        ? `${c.worsened.length} mutató romlott (${joinHu(names)}).`
        : jumpText();
    return { result: 'reaction', summary: `Reakció valószínű: ${why}`, reasons, bigJumps };
  }
  if (c.worsened.length === 1) {
    return {
      result: 'unsure',
      summary: `Bizonytalan: egy mutató romlott kissé (${names[0]}).`,
      reasons,
      bigJumps,
    };
  }
  return {
    result: 'pass',
    summary: `Átment: egyik mutató sem romlott érdemben ${against} képest.`,
    reasons: reasons.length ? reasons : ['Minden figyelt mutató a küszöbön belül maradt.'],
    bigJumps,
  };
}
