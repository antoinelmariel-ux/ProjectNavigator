export const STORAGE_KEY = 'complianceNavigatorState';
const MODULE_CACHE_PREFIX = 'module-cache:';
const ENABLE_PERSISTENCE = true;

const getLocalStorage = () => {
  if (!ENABLE_PERSISTENCE || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export const loadPersistedState = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Impossible de charger l’état sauvegardé :", error);
    return null;
  }
};

const isQuotaError = (error) => {
  if (!error) {
    return false;
  }
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const clearModuleCache = (storage) => {
  let cleared = 0;
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(MODULE_CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => {
      storage.removeItem(key);
      cleared += 1;
    });
  } catch {
    // Purge best-effort : si elle échoue, on laisse persistState renvoyer l’échec quota.
  }
  return cleared;
};

export const persistState = (state) => {
  const storage = getLocalStorage();
  if (!storage) {
    return { ok: false, reason: 'unavailable' };
  }

  let serialized;
  try {
    serialized = JSON.stringify(state);
  } catch (error) {
    console.warn("Impossible de sérialiser l’état :", error);
    return { ok: false, reason: 'serialize' };
  }

  try {
    storage.setItem(STORAGE_KEY, serialized);
    return { ok: true };
  } catch (error) {
    if (isQuotaError(error)) {
      // Le cache de transpilation des modules (module-cache:*) partage le même quota :
      // on le purge et on retente une fois avant d’abandonner.
      const cleared = clearModuleCache(storage);
      if (cleared > 0) {
        try {
          storage.setItem(STORAGE_KEY, serialized);
          return { ok: true, recovered: true };
        } catch (retryError) {
          console.warn('Sauvegarde impossible même après purge du cache :', retryError);
          return { ok: false, reason: 'quota' };
        }
      }
      console.warn('Sauvegarde impossible : quota de stockage dépassé.');
      return { ok: false, reason: 'quota' };
    }
    console.warn("Impossible de sauvegarder l’état :", error);
    return { ok: false, reason: 'error' };
  }
};
