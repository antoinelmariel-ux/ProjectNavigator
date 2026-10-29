import { useCallback, useEffect, useRef, useState } from '../react.js';

// Halo bref sur l'élément qui vient d'être modifié : il reste à sa place, ce halo dit « c'est
// bien celui-là qui a changé ».
export const useTransientHighlight = (durationMs = 1800) => {
  const [highlightedId, setHighlightedId] = useState(null);
  const timerRef = useRef(null);

  const flash = useCallback((id) => {
    setHighlightedId(id);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setHighlightedId(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return [highlightedId, flash];
};
