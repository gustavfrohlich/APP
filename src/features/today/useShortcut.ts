import { useEffect, useRef } from 'react';
import { isTypingTarget } from '@/lib/platform';

/** Egybetűs gyorsbillentyű (pl. R, E), ha nem szövegmezőben vagyunk és nincs nyitott párbeszédablak. */
export function useLetterShortcut(letter: string, handler: () => void, enabled = true) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key.toLowerCase() !== letter.toLowerCase()) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [letter, enabled]);
}
