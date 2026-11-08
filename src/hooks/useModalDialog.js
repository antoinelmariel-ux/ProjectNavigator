import { useEffect, useRef } from '../react.js';

// Le comportement commun de toutes les fenêtres modales de l'app : chacune était construite à
// part, et selon la fenêtre Échap fermait ou non, le focus restait derrière le voile, Tab
// sortait de la fenêtre et le focus n'était pas rendu à la fermeture.
//
//   const dialogRef = useModalDialog({ isOpen, onClose });
//   <div role="dialog" aria-modal="true" ref={dialogRef}>…</div>
//
// - focus placé dans la fenêtre à l'ouverture (`initialFocusRef`, sinon `[autofocus]`/
//   `[data-autofocus]`, sinon le premier élément focusable), sauf si le focus y est déjà ;
// - Tab / Maj+Tab restent dans la fenêtre ;
// - Échap ferme la fenêtre du dessus seulement (pile des fenêtres ouvertes), et jamais quand
//   un élément interne (liste déroulante, éditeur) a déjà traité la touche ;
// - le focus revient à l'élément qui l'avait avant l'ouverture.

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const openDialogs = [];

const isVisible = (element) => {
  if (!element || typeof element.getClientRects !== 'function') {
    return false;
  }
  return element.getClientRects().length > 0;
};

export const getFocusableElements = (container) => {
  if (!container || typeof container.querySelectorAll !== 'function') {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => !element.closest('[inert]') && isVisible(element));
};

const focusElement = (element) => {
  if (!element || typeof element.focus !== 'function') {
    return;
  }
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

export const useModalDialog = ({
  isOpen = true,
  onClose = null,
  initialFocusRef = null,
  closeOnEscape = true
} = {}) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }
    const node = dialogRef.current;
    if (!node) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    openDialogs.push(node);

    const frame = window.requestAnimationFrame(() => {
      if (!node.isConnected || node.contains(document.activeElement)) {
        return;
      }
      const preferred = initialFocusRef?.current
        || node.querySelector('[autofocus], [data-autofocus]')
        || getFocusableElements(node)[0];
      if (preferred) {
        focusElement(preferred);
        return;
      }
      if (!node.hasAttribute('tabindex')) {
        node.setAttribute('tabindex', '-1');
      }
      focusElement(node);
    });

    const handleKeyDown = (event) => {
      if (openDialogs[openDialogs.length - 1] !== node) {
        return;
      }
      if (event.key === 'Escape') {
        if (event.defaultPrevented || !closeOnEscapeRef.current || typeof onCloseRef.current !== 'function') {
          return;
        }
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = getFocusableElements(node);
      if (focusable.length === 0) {
        event.preventDefault();
        focusElement(node);
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) {
        event.preventDefault();
        focusElement(event.shiftKey ? last : first);
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = openDialogs.lastIndexOf(node);
      if (index !== -1) {
        openDialogs.splice(index, 1);
      }
      if (previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') {
        const active = document.activeElement;
        if (!active || active === document.body || node.contains(active) || !active.isConnected) {
          focusElement(previouslyFocused);
        }
      }
    };
  }, [isOpen, initialFocusRef]);

  return dialogRef;
};
