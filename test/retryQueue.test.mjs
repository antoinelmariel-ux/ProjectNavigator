import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetryQueue } from '../src/utils/retryQueue.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('enqueue : traite les éléments et notifie « synced »', async () => {
  const processed = [];
  const statuses = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      processed.push(payload);
    },
    onStatusChange: (status) => statuses.push(status)
  });

  queue.enqueue({ id: 'a' });
  await wait(10);

  assert.deepEqual(processed, [{ id: 'a' }]);
  assert.ok(statuses.includes('synced'));
});

test('dédoublonnage par clé : la dernière valeur remplace la précédente, pas d’envoi en double', async () => {
  const processed = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      processed.push(payload);
      await wait(20);
    },
    getItemKey: (payload) => payload.key
  });

  // Le premier est déjà en cours de traitement (processItem attend 20ms) : les deux
  // suivants, avec la même clé, doivent fusionner en une seule ligne dans la file.
  queue.enqueue({ key: 'k1', value: 1 });
  queue.enqueue({ key: 'k1', value: 2 });
  queue.enqueue({ key: 'k1', value: 3 });
  await wait(60);

  assert.deepEqual(processed, [{ key: 'k1', value: 1 }, { key: 'k1', value: 3 }]);
});

test('sans clé : chaque élément est traité indépendamment (pas de fusion)', async () => {
  const processed = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      processed.push(payload);
    }
  });

  queue.enqueue({ n: 1 });
  queue.enqueue({ n: 2 });
  await wait(10);

  assert.deepEqual(processed, [{ n: 1 }, { n: 2 }]);
});

test('échec ponctuel : réessaie avec un délai puis réussit, sans perdre l’élément', async () => {
  let attempts = 0;
  const statuses = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('échec simulé');
      }
      return payload;
    },
    onStatusChange: (status, details) => statuses.push({ status, details })
  });

  queue.enqueue({ id: 'x' });
  await wait(1200);

  assert.equal(attempts, 2, 'un échec puis une réussite');
  assert.ok(statuses.some((entry) => entry.status === 'syncing' && entry.details.retryInMs === 1000));
  assert.ok(statuses.some((entry) => entry.status === 'synced'));
});

test('flush : ne fait rien sur une file vide (pas d’appel réseau superflu)', async () => {
  let calls = 0;
  const queue = createRetryQueue({
    processItem: async () => {
      calls += 1;
    }
  });

  queue.flush();
  await wait(10);

  assert.equal(calls, 0);
  assert.equal(queue.size(), 0);
});

test('flush : rejoue un élément resté en attente (hors-ligne), sans revoir l’état complet', async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const setNavigator = (value) => {
    Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
  };
  const processed = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      processed.push(payload);
    }
  });

  try {
    setNavigator({ onLine: false });
    queue.enqueue({ id: 'offline-item' });
    await wait(10);
    assert.deepEqual(processed, [], 'rien envoyé pendant la coupure');
    assert.equal(queue.size(), 1, 'reste en attente');

    setNavigator({ onLine: true });
    queue.flush();
    await wait(10);

    assert.deepEqual(processed, [{ id: 'offline-item' }]);
    assert.equal(queue.size(), 0);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalDescriptor);
    }
  }
});
