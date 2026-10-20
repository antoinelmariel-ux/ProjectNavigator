import test from 'node:test';
import assert from 'node:assert/strict';
import { persistState, loadPersistedState, STORAGE_KEY } from '../src/utils/storage.js';

let moduleInstance = 0;
// Le module garde son état (base ouverte, dernière écriture confirmée) : chaque cas IndexedDB
// en importe une instance neuve.
const importFreshStorage = () => import(`../src/utils/storage.js?case=${(moduleInstance += 1)}`);

class FakeStorage {
  constructor(limit = Infinity) {
    this.map = new Map();
    this.limit = limit;
  }
  get length() {
    return this.map.size;
  }
  key(index) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    const stringValue = String(value);
    const currentSize = Array.from(this.map.entries()).reduce(
      (total, [existingKey, existingValue]) =>
        total + existingKey.length + String(existingValue).length,
      0
    );
    const nextEntrySize = this.map.has(key)
      ? key.length + stringValue.length - (key.length + String(this.map.get(key)).length)
      : key.length + stringValue.length;
    if (currentSize + nextEntrySize > this.limit) {
      const error = new Error('quota');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.map.set(key, stringValue);
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

const withStorage = async (storage, fn, indexedDB) => {
  const previous = globalThis.window;
  globalThis.window = indexedDB ? { localStorage: storage, indexedDB } : { localStorage: storage };
  try {
    return await fn();
  } finally {
    globalThis.window = previous;
  }
};

const quotaError = () => {
  const error = new Error('quota');
  error.name = 'QuotaExceededError';
  return error;
};

// Juste ce que src/utils/indexedDbStore.js utilise, avec des callbacks asynchrones comme le vrai.
const createFakeIndexedDb = () => {
  const data = new Map();
  let created = false;
  const factory = { data, failPuts: false };
  const db = {
    objectStoreNames: { contains: () => created },
    createObjectStore: () => {
      created = true;
    },
    close: () => {},
    transaction: () => {
      const transaction = {
        objectStore: () => ({
          get: (key) => {
            const request = {};
            setTimeout(() => {
              request.result = data.get(key);
              request.onsuccess?.();
            });
            return request;
          },
          put: (value, key) => {
            setTimeout(() => {
              if (factory.failPuts) {
                transaction.error = quotaError();
                transaction.onabort?.();
                return;
              }
              data.set(key, value);
              transaction.oncomplete?.();
            });
          }
        })
      };
      return transaction;
    }
  };
  factory.open = () => {
    const request = {};
    setTimeout(() => {
      request.result = db;
      if (!created) {
        request.onupgradeneeded?.();
      }
      request.onsuccess?.();
    });
    return request;
  };
  return factory;
};

test('sans hydratation (ou sans IndexedDB), persistState écrit dans le localStorage comme avant', async () => {
  await withStorage(new FakeStorage(), async () => {
    const result = await persistState({ projects: [{ id: 'a' }] });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(loadPersistedState(), { projects: [{ id: 'a' }] });
  });
});

test('persistState : signale le dépassement de quota', async () => {
  await withStorage(new FakeStorage(10), async () => {
    const result = await persistState({ big: 'x'.repeat(100) });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'quota');
  });
});

test('persistState : purge le cache de modules puis réussit', async () => {
  const storage = new FakeStorage(120);
  storage.map.set('module-cache:./src/a.js', 'x'.repeat(80));
  await withStorage(storage, async () => {
    const result = await persistState({ v: 'hello' });
    assert.equal(result.ok, true);
    assert.equal(result.recovered, true);
    assert.equal(storage.getItem('module-cache:./src/a.js'), null);
    assert.ok(storage.getItem(STORAGE_KEY));
  });
});

test('persistState : renvoie unavailable si localStorage absent', async () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    assert.deepEqual(await persistState({}), { ok: false, reason: 'unavailable' });
  } finally {
    globalThis.window = previous;
  }
});

test('IndexedDB : l’état y est écrit, plus dans le localStorage', async () => {
  const storage = new FakeStorage();
  const idb = createFakeIndexedDb();
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    assert.equal(module.loadPersistedState(), null);

    const result = await module.persistState({ projects: [{ id: 'a' }] });
    assert.deepEqual(result, { ok: true });
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.deepEqual(JSON.parse(idb.data.get(STORAGE_KEY)), { projects: [{ id: 'a' }] });
    assert.deepEqual(module.loadPersistedState(), { projects: [{ id: 'a' }] });
    assert.deepEqual(await module.readPersistedState(), { projects: [{ id: 'a' }] });
  }, idb);
});

test('IndexedDB : un localStorage saturé n’empêche plus la sauvegarde', async () => {
  const storage = new FakeStorage(0);
  const idb = createFakeIndexedDb();
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    const result = await module.persistState({ big: 'x'.repeat(1000) });
    assert.equal(result.ok, true);
  }, idb);
});

test('IndexedDB : l’ancien état du localStorage est repris, puis libéré à la première écriture', async () => {
  const storage = new FakeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ projects: [{ id: 'ancien' }] }));
  const idb = createFakeIndexedDb();
  idb.data.set(STORAGE_KEY, JSON.stringify({ projects: [{ id: 'plus-ancien' }] }));
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    // Présente au démarrage, la clé localStorage est forcément la plus récente : copie de
    // secours d'une fermeture, ou état laissé par la version précédente de l'app.
    assert.deepEqual(module.loadPersistedState(), { projects: [{ id: 'ancien' }] });
    assert.ok(storage.getItem(STORAGE_KEY));

    await module.persistState({ projects: [{ id: 'ancien' }, { id: 'b' }] });
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.deepEqual(JSON.parse(idb.data.get(STORAGE_KEY)).projects.length, 2);
  }, idb);
});

test('IndexedDB : le flush de fermeture laisse une copie synchrone tant que l’écriture n’est pas confirmée', async () => {
  const storage = new FakeStorage();
  const idb = createFakeIndexedDb();
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    await module.persistState({ v: 1 });

    // Rien en attente : pas de copie, le quota du localStorage reste libre.
    assert.deepEqual(module.flushPersistedState({ v: 1 }), { ok: true });
    assert.equal(storage.getItem(STORAGE_KEY), null);

    const flushed = module.flushPersistedState({ v: 2 });
    assert.equal(flushed.ok, true);
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), { v: 2 });

    assert.deepEqual(await module.readPersistedState(), { v: 2 });
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.deepEqual(JSON.parse(idb.data.get(STORAGE_KEY)), { v: 2 });
  }, idb);
});

test('IndexedDB : une écriture confirmée plus ancienne ne retire pas la copie d’un flush plus récent', async () => {
  const storage = new FakeStorage();
  const idb = createFakeIndexedDb();
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    const pending = module.persistState({ v: 1 });
    module.flushPersistedState({ v: 2 });
    assert.equal((await pending).superseded, true);
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), { v: 2 });
    await module.readPersistedState();
    assert.equal(storage.getItem(STORAGE_KEY), null);
  }, idb);
});

test('IndexedDB : un échec d’écriture se replie sur le localStorage, puis signale le quota', async () => {
  const storage = new FakeStorage(200);
  const idb = createFakeIndexedDb();
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    idb.failPuts = true;

    const fallback = await module.persistState({ v: 'petit' });
    assert.equal(fallback.ok, true);
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), { v: 'petit' });

    const full = await module.persistState({ v: 'x'.repeat(500) });
    assert.deepEqual(full, { ok: false, reason: 'quota' });

    idb.failPuts = false;
    assert.equal((await module.persistState({ v: 'retour' })).ok, true);
    assert.equal(storage.getItem(STORAGE_KEY), null);
  }, idb);
});

test('sans IndexedDB, hydratePersistedState retombe sur le localStorage', async () => {
  const storage = new FakeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ v: 'local' }));
  await withStorage(storage, async () => {
    const module = await importFreshStorage();
    await module.hydratePersistedState();
    assert.deepEqual(module.loadPersistedState(), { v: 'local' });
    assert.deepEqual(await module.persistState({ v: 'suite' }), { ok: true });
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), { v: 'suite' });
    assert.deepEqual(module.flushPersistedState({ v: 'fin' }), { ok: true });
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), { v: 'fin' });
  });
});
