import { isImpersonating } from '../utils/impersonation.js';

export const LANGUAGE_STORAGE_KEY = 'complianceNavigatorLanguage';

const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export const loadStoredLanguage = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const storeLanguage = (code) => {
  // La langue de la personne simulée ne doit pas devenir celle de l'administrateur au
  // prochain chargement de son propre onglet.
  if (isImpersonating()) {
    return;
  }

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Best-effort : une préférence de langue non sauvegardée n'empêche pas l'usage de l'app.
  }
};
