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
