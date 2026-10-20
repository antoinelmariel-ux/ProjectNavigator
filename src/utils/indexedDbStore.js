// Magasin clé/valeur minimal au-dessus d'IndexedDB. `null` quand IndexedDB est absent, refusé
// (navigation privée de certains navigateurs, stratégie d'entreprise) ou bloqué au-delà de
// `timeoutMs` : l'appelant retombe alors sur le localStorage, et le montage de l'app n'attend
// jamais indéfiniment une base qui ne répondra pas.
const DEFAULT_TIMEOUT_MS = 3000;

const createStore = (db, storeName) => ({
  get: (key) =>
    new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  put: (key, value) =>
    new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transaction IndexedDB annulée'));
    })
});

export const openKeyValueStore = ({ dbName, storeName, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
  const factory = typeof window !== 'undefined' ? window.indexedDB : undefined;
  if (!factory || typeof factory.open !== 'function') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    };
    const timer = setTimeout(() => settle(null), timeoutMs);

    let request;
    try {
      request = factory.open(dbName, 1);
    } catch {
      settle(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      settle(createStore(db, storeName));
    };
    request.onerror = () => settle(null);
  });
};
