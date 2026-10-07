// Sur une page SharePoint, ce n'est pas la fenêtre qui défile mais un conteneur interne de la
// page : window.scrollTo / window.scrollY n'y font rien. On défile donc le premier ancêtre
// défilable du conteneur de l'app, et la fenêtre seulement s'il n'y en a pas (harnais de dev).
let appRoot = null;

export const setAppScrollRoot = (element) => {
  appRoot = element || null;
};

const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

const isScrollableElement = (element) => {
  if (!element || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return false;
  }
  const { overflowY } = window.getComputedStyle(element);
  return SCROLLABLE_OVERFLOW.test(overflowY) && element.scrollHeight > element.clientHeight;
};

export const findScrollParent = (element) => {
  if (typeof document === 'undefined') {
    return null;
  }
  for (let node = element?.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) {
      return null;
    }
    if (isScrollableElement(node)) {
      return node;
    }
  }
  return null;
};

export const getAppScrollContainer = () => findScrollParent(appRoot);

export const getAppScrollTop = () => {
  const container = getAppScrollContainer();
  if (container) {
    return container.scrollTop;
  }
  return typeof window === 'undefined' ? 0 : window.scrollY || window.pageYOffset || 0;
};

export const scrollAppTo = ({ top = 0, left = 0, behavior = 'auto' } = {}) => {
  if (typeof window === 'undefined') {
    return;
  }
  const container = getAppScrollContainer();
  const target = container || window;
  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ top, left, behavior });
  }
};

// Position de défilement qui amène le haut de `element` à `offset` px du haut de la zone visible.
export const getAppScrollTopForElement = (element, offset = 0) => {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return getAppScrollTop();
  }
  const container = getAppScrollContainer();
  const containerTop = container ? container.getBoundingClientRect().top : 0;
  return Math.max(0, element.getBoundingClientRect().top - containerTop + getAppScrollTop() - offset);
};
