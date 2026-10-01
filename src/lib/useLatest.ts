import { useLayoutEffect, useRef } from 'react';

/** Mindig a legutóbbi értékre mutató ref (eseménykezelőkhöz és időzítőkhöz). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
