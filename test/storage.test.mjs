import test from 'node:test';
import assert from 'node:assert/strict';
import { persistState, loadPersistedState, STORAGE_KEY } from '../src/utils/storage.js';

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

const withStorage = (storage, fn) => {
  const previous = globalThis.window;
  globalThis.window = { localStorage: storage };
  try {
    return fn();
  } finally {
    globalThis.window = previous;
  }
};

test('persistState + loadPersistedState : aller-retour', () => {
  withStorage(new FakeStorage(), () => {
    const result = persistState({ projects: [{ id: 'a' }] });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(loadPersistedState(), { projects: [{ id: 'a' }] });
  });
});

test('persistState : signale le dépassement de quota', () => {
  withStorage(new FakeStorage(10), () => {
    const result = persistState({ big: 'x'.repeat(100) });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'quota');
  });
});

test('persistState : purge le cache de modules puis réussit', () => {
  const storage = new FakeStorage(120);
  storage.map.set('module-cache:./src/a.js', 'x'.repeat(80));
  withStorage(storage, () => {
    const result = persistState({ v: 'hello' });
    assert.equal(result.ok, true);
    assert.equal(result.recovered, true);
    assert.equal(storage.getItem('module-cache:./src/a.js'), null);
    assert.ok(storage.getItem(STORAGE_KEY));
  });
});

test('persistState : renvoie unavailable si localStorage absent', () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    assert.deepEqual(persistState({}), { ok: false, reason: 'unavailable' });
  } finally {
    globalThis.window = previous;
  }
});
