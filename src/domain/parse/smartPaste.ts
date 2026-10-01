// Okos beillesztés: egy szövegből felismeri az éjszakai óraadatokat.
//
// Példák:
//   „Alvás 7:56, Ébren 11 perc, Mély 0:42, REM 2:05, HRV 84, Pulzus 51,5”
//   „Sleep: 7:56 | Awake: 11m | Deep: 0:42 | REM: 2:05 | HRV: 84 ms | RHR: 51.5 bpm”
//   Fejléc + adatsor tabulátorral (az óra exportjából vagy Excelből másolva).

import type { WatchMetric } from '../metrics';
import { parseDuration } from './duration';
import { parseDecimal } from './number';

export type WatchValues = Partial<Record<WatchMetric, number>>;

const LABELS: { metric: WatchMetric; re: RegExp }[] = [
  { metric: 'awakeMin', re: /^(ébren(?:\s*éjjel)?|awake|ébrenlét)$/i },
  { metric: 'deepMin', re: /^(mély(?:alvás)?|deep)$/i },
  { metric: 'remMin', re: /^(rem)$/i },
  { metric: 'hrvNight', re: /^(hrv(?:\s*\(ms\))?|hrv\s*éjjel)$/i },
  {
    metric: 'rhrNight',
    re: /^(pulzus|rhr(?:\s*\(bpm\))?|nyugalmi\s*pulzus|resting\s*heart\s*rate|hr)$/i,
  },
  { metric: 'sleepMin', re: /^(alvás(?:idő)?|sleep|alvásidő|total\s*sleep|asleep)$/i },
];

function metricForLabel(label: string): WatchMetric | undefined {
  const l = label.trim().replace(/[:=]$/, '').trim();
  return LABELS.find((x) => x.re.test(l))?.metric;
}

function valueFor(metric: WatchMetric, raw: string): number | undefined {
  if (metric === 'hrvNight' || metric === 'rhrNight') return parseDecimal(raw);
  return parseDuration(raw);
}

function parseTable(text: string): WatchValues | undefined {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return undefined;
  const sep = lines[0]!.includes('\t') ? '\t' : lines[0]!.includes(';') ? ';' : undefined;
  if (!sep) return undefined;
  const header = lines[0]!.split(sep);
  const row = lines[lines.length - 1]!.split(sep);
  const out: WatchValues = {};
  header.forEach((h, i) => {
    const metric = metricForLabel(h);
    const cell = row[i];
    if (metric && cell !== undefined && out[metric] === undefined) {
      const v = valueFor(metric, cell);
      if (v !== undefined) out[metric] = v;
    }
  });
  return Object.keys(out).length ? out : undefined;
}

const PAIR_RE =
  /(ébren(?:\s*éjjel)?|ébrenlét|awake|mélyalvás|mély|deep|rem|hrv|pulzus|rhr|nyugalmi\s*pulzus|alvásidő|alvás|sleep|asleep)\s*[:=]?\s*(\d+(?:[.,:]\d+)?(?:\s*(?:h|ó)\s*\d+)?(?:\s*(?:perc|mins?|ms|bpm|m|p|h|ó)(?![a-záéíóöőúüű]))?)/gi;

export function parseSmartPaste(text: string): WatchValues {
  const table = parseTable(text);
  if (table) return table;
  const out: WatchValues = {};
  for (const m of text.matchAll(PAIR_RE)) {
    const metric = metricForLabel(m[1]!);
    if (!metric || out[metric] !== undefined) continue;
    const v = valueFor(metric, m[2]!.trim());
    if (v !== undefined) out[metric] = v;
  }
  return out;
}
