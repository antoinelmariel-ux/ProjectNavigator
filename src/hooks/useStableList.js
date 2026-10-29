import { useEffect, useMemo, useRef, useState } from '../react.js';
import { mergeLeavingItems, reconcileStableOrder } from '../utils/stableOrder.js';
import { prefersReducedMotion } from '../utils/motionPreference.js';

// `items` arrive déjà triés. Tant que `resetKey` ne change pas (onglet, filtre, tri, recherche),
// les éléments déjà affichés gardent leur place même si le tri les ferait bouger après une
// action de l'utilisateur. Avec `animateLeave`, un élément qui disparaît reste affiché le temps
// de son animation de sortie (`isLeaving(id)`), sauf en mouvement réduit.
export const useStableList = (items, { getId, resetKey = '', animateLeave = false, leaveDurationMs = 280 }) => {
  const committedRef = useRef({ resetKey, ids: [], itemsById: new Map() });
  const leavingRef = useRef(new Map());
  const timersRef = useRef(new Map());
  const [leavingVersion, setLeavingVersion] = useState(0);

  const computed = useMemo(() => {
    const committed = committedRef.current;
    const isReset = committed.resetKey !== resetKey;
    const previousIds = isReset ? [] : committed.ids;
    const real = reconcileStableOrder(items, previousIds, getId);
    const realIds = real.map(getId);
    const realIdSet = new Set(realIds);

    if (isReset) {
      leavingRef.current.clear();
    }
    realIdSet.forEach((id) => leavingRef.current.delete(id));

    if (animateLeave && !isReset && !prefersReducedMotion()) {
      previousIds.forEach((id) => {
        if (!realIdSet.has(id) && !leavingRef.current.has(id) && committed.itemsById.has(id)) {
          leavingRef.current.set(id, committed.itemsById.get(id));
        }
      });
    }

    const leavingItems = Array.from(leavingRef.current.values());
    const display = leavingItems.length > 0
      ? mergeLeavingItems(real, isReset ? [] : previousIds, leavingItems, getId)
      : real;

    return { real, realIds, display };
    // `leavingVersion` relance le calcul quand un élément a fini de sortir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, resetKey, animateLeave, leavingVersion]);

  useEffect(() => {
    committedRef.current = {
      resetKey,
      ids: computed.realIds,
      itemsById: new Map(computed.real.map((item) => [getId(item), item]))
    };
    leavingRef.current.forEach((_, id) => {
      if (timersRef.current.has(id)) {
        return;
      }
      const timerId = window.setTimeout(() => {
        timersRef.current.delete(id);
        leavingRef.current.delete(id);
        setLeavingVersion((version) => version + 1);
      }, leaveDurationMs);
      timersRef.current.set(id, timerId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, resetKey, leaveDurationMs]);

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  const isLeaving = (id) => leavingRef.current.has(id);

  return { items: computed.display, isLeaving };
};
