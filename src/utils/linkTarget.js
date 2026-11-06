// Arrivée par le lien d'un mail sur un message précis : on l'amène au centre de l'écran et on
// le cerne quelques secondes, le temps que l'œil le trouve après le défilement.
export const LINK_TARGET_CLASS = 'cn-link-target';
export const LINK_TARGET_ATTRIBUTE = 'data-cn-link-target';
const LINK_TARGET_DURATION_MS = 6000;

const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const revealLinkTarget = (element, { scroll = true } = {}) => {
  if (!element) {
    return;
  }
  if (scroll && typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }
  if (element.classList) {
    element.classList.add(LINK_TARGET_CLASS);
  }
  if (typeof element.setAttribute === 'function') {
    element.setAttribute(LINK_TARGET_ATTRIBUTE, 'true');
  }
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      element.classList?.remove(LINK_TARGET_CLASS);
      element.removeAttribute?.(LINK_TARGET_ATTRIBUTE);
    }, LINK_TARGET_DURATION_MS);
  }
};
