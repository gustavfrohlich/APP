// Böngészőben tárolt, nézőnkénti kényelmi beállítások (pl. összecsukott navigáció).
// Ezek sosem egészségügyi adatok; ha a tároló nem elérhető, csendben kimaradnak.

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* privát mód vagy tiltott tároló – nem baj */
  }
}
