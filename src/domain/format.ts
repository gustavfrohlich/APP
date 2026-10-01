// Magyar formázás: „7:56”, „72,5 ms”, „csütörtök, okt. 8.”, „−0,4”.

import { format } from 'date-fns';
import { hu } from 'date-fns/locale/hu';
import { toLocalDate, weekdayIndex } from './dates';
import { METRICS, type NumericMetric } from './metrics';
import type { ISODate } from './types';

export const MINUS = '−';

/** Percek → „7:56” (negatívnál „−0:16”). */
export function formatDuration(min: number | undefined): string {
  if (min === undefined || !Number.isFinite(min)) return '–';
  const sign = min < 0 ? MINUS : '';
  const total = Math.round(Math.abs(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** Tizedesvesszős szám, a megadott tizedesjegyig (a felesleges nullák nélkül, ha `trim`). */
export function formatNumber(x: number | undefined, decimals = 1, trim = true): string {
  if (x === undefined || !Number.isFinite(x)) return '–';
  const fixed = x.toFixed(decimals);
  const s = trim && decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return s.replace('-', MINUS).replace('.', ',');
}

/** Előjeles szám: „+12”, „−0,4”, „0”. */
export function formatSigned(x: number | undefined, decimals = 1): string {
  if (x === undefined || !Number.isFinite(x)) return '–';
  const rounded = Number(x.toFixed(decimals));
  if (rounded === 0) return formatNumber(0, decimals);
  return (rounded > 0 ? '+' : '') + formatNumber(rounded, decimals);
}

/** Előjeles időtartam-eltérés: 60 perc alatt „+9 perc”, fölötte „+1:05”. */
export function formatDurationDelta(min: number | undefined): string {
  if (min === undefined || !Number.isFinite(min)) return '–';
  const r = Math.round(min);
  if (r === 0) return '0 perc';
  const sign = r > 0 ? '+' : MINUS;
  if (Math.abs(r) < 60) return `${sign}${Math.abs(r)} perc`;
  return `${sign}${formatDuration(Math.abs(r))}`;
}

/** Egy mutató értéke a saját formátumában (mértékegység nélkül). */
export function formatMetric(metric: NumericMetric, x: number | undefined): string {
  const def = METRICS[metric];
  if (def.kind === 'duration') return formatDuration(x);
  return formatNumber(x, def.decimals);
}

/** Egy mutató értéke mértékegységgel: „72,5 ms”, „7:56”, „0:21”. */
export function formatMetricWithUnit(metric: NumericMetric, x: number | undefined): string {
  const def = METRICS[metric];
  if (x === undefined) return '–';
  if (def.kind === 'duration') return formatDuration(x);
  if (def.kind === 'scale') return formatNumber(x, def.decimals);
  return `${formatNumber(x, def.decimals)} ${def.unit}`;
}

/** Egy mutató eltérése előjellel és mértékegységgel: „+12 ms”, „−9 perc”, „+1,5”. */
export function formatMetricDelta(metric: NumericMetric, delta: number | undefined): string {
  const def = METRICS[metric];
  if (delta === undefined) return '–';
  if (def.kind === 'duration') return formatDurationDelta(delta);
  if (def.kind === 'scale') return formatSigned(delta, 1);
  return `${formatSigned(delta, def.unit === 'ms' ? 0 : 1)} ${def.unit}`;
}

export const WEEKDAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] as const;

export function weekdayShort(iso: ISODate): string {
  return WEEKDAY_SHORT[weekdayIndex(iso)]!;
}

/** „csütörtök, okt. 8.” */
export function formatDateLong(iso: ISODate): string {
  return format(toLocalDate(iso), 'EEEE, MMM d.', { locale: hu });
}

/** „okt. 8.” */
export function formatDateShort(iso: ISODate): string {
  return format(toLocalDate(iso), 'MMM d.', { locale: hu });
}

/** „2026. október” */
export function formatMonth(iso: ISODate): string {
  return format(toLocalDate(iso), 'yyyy. LLLL', { locale: hu });
}

/** „2026. okt. 8.” */
export function formatDateFull(iso: ISODate): string {
  return format(toLocalDate(iso), 'yyyy. MMM d.', { locale: hu });
}

/** „okt. 5. – okt. 11.” */
export function formatRange(from: ISODate, to: ISODate): string {
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}

/** Magyar névelő: „az” magánhangzó (és számjegyből olvasva „egy”, „öt”…) előtt. */
export function article(word: string): 'a' | 'az' {
  const w = word.trim().toLowerCase();
  if (/^[aáeéiíoóöőuúüű]/.test(w)) return 'az';
  if (/^(1|5|50|500)(\D|$)/.test(w)) return 'az';
  return 'a';
}

/** Felsorolás magyarul: „a, b és c”. */
export function joinHu(items: string[], conj = 'és'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
