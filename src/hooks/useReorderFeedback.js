import { useCallback, useLayoutEffect, useRef, useState } from '../react.js';
import { prefersReducedMotion } from '../utils/motionPreference.js';

const FLIP_DURATION_MS = 220;

// Quand un clic sur une flèche déplace une carte, trois choses évitent la sensation qu'elle a
// disparu : elle glisse jusqu'à sa nouvelle place (FLIP), le bouton cliqué garde le focus et reste
// à l'écran (la carte peut être haute), et la nouvelle position est annoncée aux lecteurs d'écran.
//
// Usage : poser `ref={containerRef}` sur le conteneur de la liste, `data-reorder-key` sur chaque
// carte et `data-reorder-action="up|down"` sur ses boutons, puis appeler
// `prepareMove(clé, { announce })` juste avant de changer l'ordre. Deux listes imbriquées
// (modèles, puis sections d'un modèle) prennent chacune un `scope` : les attributs deviennent
// `data-reorder-<scope>-key` / `-action`, et déplacer la carte extérieure n'anime pas deux fois
// les cartes qu'elle contient.
export const useReorderFeedback = (scope = '') => {
  const prefix = scope ? `data-reorder-${scope}` : 'data-reorder';
  const keyAttribute = `${prefix}-key`;
  const actionAttribute = `${prefix}-action`;
  const containerRef = useRef(null);
  const pendingRef = useRef(null);
  const [announcement, setAnnouncement] = useState('');

  const prepareMove = useCallback((itemKey, { position, total, announce } = {}) => {
    const container = containerRef.current;
    if (!container || itemKey === undefined || itemKey === null) {
      return;
    }
    const tops = new Map();
    container.querySelectorAll(`[${keyAttribute}]`).forEach((element) => {
      tops.set(element.getAttribute(keyAttribute), element.getBoundingClientRect().top);
    });
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    pendingRef.current = {
      itemKey: String(itemKey),
      tops,
      action: active && container.contains(active) ? active.getAttribute(actionAttribute) : null
    };
    if (typeof announce === 'string' && announce.length > 0) {
      setAnnouncement(announce);
    } else if (position && total) {
      setAnnouncement(`${position} / ${total}`);
    }
  }, [keyAttribute, actionAttribute]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    const container = containerRef.current;
    if (!pending || !container) {
      return;
    }
    pendingRef.current = null;

    const reduceMotion = prefersReducedMotion();
    let movedElement = null;
    container.querySelectorAll(`[${keyAttribute}]`).forEach((element) => {
      const key = element.getAttribute(keyAttribute);
      if (key === pending.itemKey) {
        movedElement = element;
      }
      const previousTop = pending.tops.get(key);
      if (reduceMotion || previousTop === undefined || typeof element.animate !== 'function') {
        return;
      }
      const delta = previousTop - element.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) {
        element.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: FLIP_DURATION_MS, easing: 'ease' }
        );
      }
    });

    if (!movedElement) {
      return;
    }
    movedElement.classList.remove('cn-moved');
    // eslint-disable-next-line no-unused-expressions
    movedElement.offsetWidth;
    movedElement.classList.add('cn-moved');
    window.setTimeout(() => movedElement.classList.remove('cn-moved'), 1300);
    if (pending.action) {
      const button = movedElement.querySelector(`[${actionAttribute}="${pending.action}"]:not([disabled])`)
        || movedElement.querySelector(`[${actionAttribute}]:not([disabled])`);
      if (button && document.activeElement !== button) {
        button.focus({ preventScroll: true });
      }
    }
    if (typeof movedElement.scrollIntoView === 'function') {
      const isTallerThanViewport = movedElement.getBoundingClientRect().height > window.innerHeight * 0.8;
      movedElement.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: isTallerThanViewport ? 'start' : 'nearest'
      });
    }
  });

  return { containerRef, prepareMove, announcement };
};
