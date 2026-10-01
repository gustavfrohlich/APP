// Időtartam-felismerés percekre.
//
// Elfogadott alakok: „7:56”, „0:11”, „756” (→ 7:56), „11” (→ 0:11), „7h56”, „7h 56m”, „7ó56p”,
// „11m”, „11 perc”, „45 min”, „7.9” / „7,9” (tizedes óra), „1h”.
// Csak számjegyeknél a két utolsó jegy a perc, az előttük lévők az óra.

export function parseDuration(input: string | number | null | undefined): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === 'number')
    return Number.isFinite(input) && input >= 0 ? Math.round(input) : undefined;
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return undefined;

  // ó:pp vagy ó:pp:mm
  let m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (m) {
    const min = Number(m[2]);
    if (min >= 60) return undefined;
    return Number(m[1]) * 60 + min + (m[3] ? Math.round(Number(m[3]) / 60) : 0);
  }

  // óra és/vagy perc betűjellel: 7h56, 7h 56m, 7 ó 56 p, 1h, 11m, 11 perc, 45 min
  m =
    /^(?:(\d+(?:[.,]\d+)?)\s*(?:h|ó|óra|hr|hrs|hours?)\s*)?(?:(\d+)\s*(?:m|p|perc|min|mins|minutes?)?)?$/.exec(
      s,
    );
  if (m && (m[1] !== undefined || m[2] !== undefined) && /[a-zó]/.test(s)) {
    const h = m[1] ? Number(m[1].replace(',', '.')) : 0;
    const min = m[2] ? Number(m[2]) : 0;
    if (m[1] && m[2] && min >= 60) return undefined;
    return Math.round(h * 60 + min);
  }

  // tizedes óra: 7.9 vagy 7,9
  m = /^(\d{1,2})[.,](\d+)$/.exec(s);
  if (m) return Math.round(Number(`${m[1]}.${m[2]}`) * 60);

  // csak számjegyek: maszk (756 → 7:56, 11 → 0:11)
  if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) return Number(s);
    const h = Number(s.slice(0, -2));
    const min = Number(s.slice(-2));
    if (min >= 60) return undefined;
    return h * 60 + min;
  }
  return undefined;
}

/**
 * Élő maszk gépelés közben: csak számjegyek (és az általunk beszúrt kettőspont) esetén
 * „756” → „7:56”. Más alakot („7h56”, „7.9”) érintetlenül hagy.
 */
export function maskDurationInput(raw: string): string {
  if (!/^[\d:]*$/.test(raw) || (raw.match(/:/g)?.length ?? 0) > 1) return raw;
  const digits = raw.replace(':', '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
}
