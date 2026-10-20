import { isImpersonating } from './impersonation.js';
import { openKeyValueStore } from './indexedDbStore.js';

// L'état complet vit dans IndexedDB. Le localStorage est limité à quelques Mo par site, et sur
// SharePoint ce site est le tenant entier, partagé avec SharePoint et tous ses web parts : une
// fois saturé, plus aucune sauvegarde ne passait. La clé localStorage historique ne sert plus que
// de filet : écrite de façon synchrone au pagehide/démontage tant qu'une écriture IndexedDB n'est
// pas confirmée (une écriture asynchrone peut mourir avec l'onglet), retirée dès qu'elle l'est.
// Quand elle est présente au démarrage, elle est donc toujours la plus récente.
export const STORAGE_KEY = 'complianceNavigatorState';
const DB_NAME = 'complianceNavigator';
const DB_STORE_NAME = 'state';
const MODULE_CACHE_PREFIX = 'module-cache:';
const ENABLE_PERSISTENCE = true;

// 'pending' tant que hydratePersistedState n'a pas tourné (tests unitaires, appel anticipé) :
// on lit et écrit alors le localStorage comme avant. 'localStorage' quand IndexedDB est indisponible.
let backend = 'pending';
let store = null;
let snapshot = null;
let writeSeq = 0;
let committedSeq = 0;
let committedSerialized = null;
let localCopySeq = null;
let writeChain = Promise.resolve();

const getLocalStorage = () => {
  if (!ENABLE_PERSISTENCE || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
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
    // Purge best-effort : si elle échoue, on laisse writeLocalCopy renvoyer l’échec quota.
  }
  return cleared;
};

const readLocalCopy = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const removeLocalCopy = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Une copie restée en place sera relue (et retirée) au prochain démarrage.
  }
};

const writeLocalCopy = (serialized) => {
  const storage = getLocalStorage();
  if (!storage) {
    return { ok: false, reason: 'unavailable' };
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

const serialize = (state) => {
  try {
    return JSON.stringify(state);
  } catch (error) {
    console.warn("Impossible de sérialiser l’état :", error);
    return null;
  }
};

const parse = (raw) => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Impossible de charger l’état sauvegardé :", error);
    return null;
  }
};

const readStoredRaw = async () => {
  await writeChain;
  let stored = null;
  if (store) {
    try {
      const value = await store.get(STORAGE_KEY);
      stored = typeof value === 'string' ? value : null;
    } catch (error) {
      console.warn('Lecture IndexedDB impossible :', error);
    }
  }
  const localCopy = readLocalCopy();
  return localCopy !== null ? localCopy : stored;
};

// À attendre avant le premier rendu : App.jsx lit l'état de façon synchrone (loadPersistedState)
// dans ses initialiseurs, il faut donc qu'il soit déjà en mémoire.
export const hydratePersistedState = async () => {
  if (!store) {
    store = await openKeyValueStore({ dbName: DB_NAME, storeName: DB_STORE_NAME });
  }
  backend = store ? 'indexeddb' : 'localStorage';
  snapshot = await readStoredRaw();
  // Copie de secours ou clé héritée de l'ancien stockage : la prochaine écriture IndexedDB
  // réussie la rend inutile, et c'est elle qui libère la place qu'elle prend.
  localCopySeq = readLocalCopy() !== null ? writeSeq : null;
};

// Relit ce qui est réellement stocké (pas la copie en mémoire), une fois les écritures en
// cours terminées.
export const readPersistedState = async () => parse(await readStoredRaw());

export const loadPersistedState = () => parse(backend === 'indexeddb' ? snapshot : readLocalCopy());

const commit = async (serialized, seq) => {
  if (seq !== writeSeq) {
    return { ok: true, superseded: true };
  }
  if (serialized !== committedSerialized) {
    try {
      await store.put(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Écriture IndexedDB impossible, repli sur le localStorage :', error);
      const fallback = writeLocalCopy(serialized);
      if (fallback.ok) {
        localCopySeq = seq;
      }
      return fallback;
    }
    committedSerialized = serialized;
  }
  committedSeq = seq;
  if (localCopySeq !== null && localCopySeq <= seq) {
    removeLocalCopy();
    localCopySeq = null;
  }
  return { ok: true };
};

const enqueueCommit = (serialized) => {
  writeSeq += 1;
  const seq = writeSeq;
  snapshot = serialized;
  const run = writeChain.then(() => commit(serialized, seq));
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return { seq, run };
};

// Sauvegarde courante (debouncée par App.jsx). Résout quand l'écriture est confirmée.
export const persistState = (state) => {
  // L'onglet de simulation partage ce stockage avec la session réelle de l'administrateur :
  // écrire ici écraserait son état. On renvoie `ok` volontairement, sinon App.jsx afficherait
  // la bannière « sauvegarde impossible » alors que rien n'est cassé.
  if (isImpersonating()) {
    return Promise.resolve({ ok: true, skipped: 'simulation' });
  }

  const serialized = serialize(state);
  if (serialized === null) {
    return Promise.resolve({ ok: false, reason: 'serialize' });
  }

  if (backend !== 'indexeddb') {
    return Promise.resolve(writeLocalCopy(serialized));
  }
  return enqueueCommit(serialized).run;
};

// Sauvegarde synchrone pour pagehide et le démontage du web part : l'écriture IndexedDB est
// lancée, mais rien ne garantit qu'elle aboutira avant la fermeture de l'onglet, d'où la copie
// dans le localStorage tant qu'elle n'est pas confirmée.
export const flushPersistedState = (state) => {
  if (isImpersonating()) {
    return { ok: true, skipped: 'simulation' };
  }

  const serialized = serialize(state);
  if (serialized === null) {
    return { ok: false, reason: 'serialize' };
  }

  if (backend !== 'indexeddb') {
    return writeLocalCopy(serialized);
  }
  if (serialized === committedSerialized && committedSeq === writeSeq) {
    return { ok: true };
  }

  const { seq } = enqueueCommit(serialized);
  const result = writeLocalCopy(serialized);
  if (result.ok) {
    localCopySeq = seq;
  }
  return result;
};
