import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExitUrl,
  buildImpersonationUrl,
  getSimulatedUser,
  isImpersonating,
  readImpersonationRequest,
  startImpersonation,
  stopImpersonation
} from '../src/utils/impersonation.js';
import { persistState, STORAGE_KEY } from '../src/utils/storage.js';
import { savePersistedMockMap, loadPersistedMockMap } from '../src/utils/mockProviderPersistence.js';
import { spPost } from '../src/utils/spRestClient.js';
import { createRetryQueue } from '../src/utils/retryQueue.js';

const APP_URL = 'https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/CN-App/index.aspx';

class FakeStorage {
  constructor() {
    this.map = new Map();
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
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

const withStorage = (fn) => {
  const previous = globalThis.window;
  const storage = new FakeStorage();
  globalThis.window = { localStorage: storage };
  try {
    return fn(storage);
  } finally {
    globalThis.window = previous;
    stopImpersonation();
  }
};

test('readImpersonationRequest ne retient qu’une adresse e-mail valide', () => {
  assert.equal(readImpersonationRequest('?viewAs=Marie.Durand@LFB.fr'), 'marie.durand@lfb.fr');
  assert.equal(readImpersonationRequest('viewAs=marie.durand@lfb.fr'), 'marie.durand@lfb.fr');
  assert.equal(readImpersonationRequest('?viewAs=pas-un-email'), '');
  assert.equal(readImpersonationRequest('?autre=1'), '');
  assert.equal(readImpersonationRequest(''), '');
});

test('buildImpersonationUrl et buildExitUrl ajoutent puis retirent le paramètre', () => {
  const url = buildImpersonationUrl('Marie.Durand@lfb.fr', `${APP_URL}?vue=liste`);
  assert.equal(readImpersonationRequest(new URL(url).search), 'marie.durand@lfb.fr');
  assert.ok(url.includes('vue=liste'));

  const exitUrl = buildExitUrl(url);
  assert.equal(readImpersonationRequest(new URL(exitUrl).search), '');
  assert.ok(exitUrl.includes('vue=liste'));
});

test('buildImpersonationUrl refuse une adresse invalide', () => {
  assert.equal(buildImpersonationUrl('pas-un-email', APP_URL), '');
});

test('startImpersonation expose une identité simulée et stopImpersonation la retire', () => {
  try {
    assert.equal(isImpersonating(), false);
    assert.equal(startImpersonation({ email: 'Marie.Durand@lfb.fr' }), true);
    assert.equal(isImpersonating(), true);
    assert.equal(getSimulatedUser().mail, 'marie.durand@lfb.fr');
    assert.equal(getSimulatedUser().isSiteAdmin, false);
  } finally {
    stopImpersonation();
  }
  assert.equal(isImpersonating(), false);
});

test('startImpersonation refuse une adresse invalide', () => {
  assert.equal(startImpersonation({ email: 'pas-un-email' }), false);
  assert.equal(isImpersonating(), false);
});

test('une simulation n’écrit jamais dans le localStorage partagé', () => {
  withStorage((storage) => {
    assert.equal(persistState({ projects: [] }).ok, true);
    assert.ok(storage.getItem(STORAGE_KEY));
    storage.removeItem(STORAGE_KEY);

    startImpersonation({ email: 'marie.durand@lfb.fr' });
    const result = persistState({ projects: [{ id: 'p1' }] });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, 'simulation');
    assert.equal(storage.getItem(STORAGE_KEY), null);

    savePersistedMockMap('complianceNavigatorShowcaseDrafts', new Map([['p1', { title: 'x' }]]));
    assert.equal(loadPersistedMockMap('complianceNavigatorShowcaseDrafts').size, 0);
  });
});

test('une simulation bloque toute écriture SharePoint', async () => {
  try {
    startImpersonation({ email: 'marie.durand@lfb.fr' });
    await assert.rejects(
      () => spPost("/_api/web/lists/getbytitle('CN_Projects')/items", { Title: 'Test' }),
      { name: 'ReadOnlySimulationError' }
    );
  } finally {
    stopImpersonation();
  }
});

test('une écriture bloquée par la simulation n’est pas réessayée', async () => {
  const attempts = [];
  const statuses = [];
  const queue = createRetryQueue({
    processItem: async (payload) => {
      attempts.push(payload);
      const error = new Error('simulation');
      error.name = 'ReadOnlySimulationError';
      throw error;
    },
    onStatusChange: (status) => statuses.push(status)
  });

  queue.enqueue({ id: 'p1' });
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(attempts.length, 1);
  assert.equal(statuses[statuses.length - 1], 'error');
});
