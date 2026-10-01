/** A sor első fókuszálható eleme (a rádiócsoportban a kijelölt/tabolható gomb). */
export function focusFirstIn(el: HTMLElement | null | undefined): void {
  if (!el) return;
  // Előbb a kifejezetten megjelölt elem, utána az első fókuszálható (dokumentum-sorrendben).
  const target =
    el.querySelector<HTMLElement>('[data-autofocus]') ??
    el.querySelector<HTMLElement>(
      '[role="radio"][tabindex="0"], input:not([type="hidden"]), textarea, button:not([tabindex="-1"]), [tabindex="0"]',
    );
  target?.focus({ preventScroll: true });
  el.scrollIntoView({
    block: 'nearest',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}
