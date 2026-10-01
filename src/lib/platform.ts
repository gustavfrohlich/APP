export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad/i.test(platform);
}

/** A módosítóbillentyű neve a gyorsbillentyű-tippekben. */
export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/** Ctrl (Windows/Linux) vagy Cmd (Mac) lenyomva? */
export function hasMod(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return isMac() ? e.metaKey : e.ctrlKey;
}

/** Igaz, ha a fókusz szövegbeviteli mezőben van (ott a betűs gyorsbillentyűk nem élnek). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range'].includes(type);
  }
  return false;
}
