import { useEffect, useRef, useCallback } from 'react';

export default function useInactivity(onLogout, timeoutMs = 20 * 60 * 1000) {
  const timer = useRef(null);
  const reset = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(onLogout, timeoutMs);
  }, [onLogout, timeoutMs]);

  useEffect(() => {
    const events = ['mousedown','keydown','touchstart','scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset]);
}
