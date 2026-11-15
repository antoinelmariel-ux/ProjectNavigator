import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharePointProjectSearchConfigStore } from '../src/utils/projectSearchConfigProvider.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';

const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json;odata=nometadata' : null) },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? ''))
});

const digest = () => makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });

const withFetch = async (handler, fn) => {
  const previous = globalThis.window;
  const calls = [];
  const storage = new Map();
  globalThis.window = {
    location: { origin: 'https://x.sharepoint.com', pathname: '/sites/PN/CN-App/index.aspx', protocol: 'https:', hostname: 'x.sharepoint.com' },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value))
    },
    fetch: async (url, init = {}) => {
      calls.push({ url: decodeURIComponent(url), init });
      return handler(decodeURIComponent(url), init);
    }
  };
  resetSpRestClient();
  try {
    return await fn(calls, storage);
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
  }
};

const config = { columns: [{ id: 'a', kind: 'builtin', builtinId: 'owner' }], charts: [] };
const missingColumn = () => makeResponse(400, { 'odata.error': { code: '-1', message: { value: "Column 'ProjectSearchConfigJson' does not exist." } } });

test('lit la configuration dans la colonne du profil, sans toucher aux autres colonnes', async () => {
  await withFetch(() => makeResponse(200, { value: [{ Id: 7, UserEmail: 'a@b.fr', ProjectSearchConfigJson: JSON.stringify(config) }] }), async (calls) => {
    const store = createSharePointProjectSearchConfigStore();
    const result = await store.load('A@b.fr');
    assert.equal(result.storage, 'profile');
    assert.equal(result.config.columns[0].builtinId, 'owner');
    assert.match(calls[0].url, /\$select=Id,UserEmail,ProjectSearchConfigJson&/);
    assert.match(calls[0].url, /UserEmail eq 'a@b.fr'/);
  });
});

test('colonne absente : repli sur le navigateur, sans réessayer SharePoint ensuite', async () => {
  await withFetch(() => missingColumn(), async (calls, storage) => {
    const store = createSharePointProjectSearchConfigStore();
    const loaded = await store.load('a@b.fr');
    assert.equal(loaded.storage, 'local');
    assert.equal(loaded.reason, 'missingColumn');
    assert.equal(store.isColumnAvailable(), false);
    const saved = await store.save('a@b.fr', config);
    assert.equal(saved.storage, 'local');
    assert.equal(calls.length, 1);
    assert.match(storage.get('complianceNavigatorProjectSearchConfig'), /owner/);
  });
});

test('écrit par MERGE sur la ligne de profil existante, sous IF-MATCH', async () => {
  await withFetch((url, init) => {
    if (url.endsWith('/_api/contextinfo')) return digest();
    if (init.method === 'GET') return makeResponse(200, { value: [{ Id: 7, UserEmail: 'a@b.fr', 'odata.etag': '"3"' }] });
    return makeResponse(204, '');
  }, async (calls) => {
    const store = createSharePointProjectSearchConfigStore();
    const saved = await store.save('a@b.fr', config);
    assert.equal(saved.storage, 'profile');
    const merge = calls.find((call) => call.init.headers?.['X-HTTP-Method'] === 'MERGE');
    assert.ok(merge.url.endsWith('/items(7)'));
    assert.equal(merge.init.headers['IF-MATCH'], '"3"');
    const body = JSON.parse(merge.init.body);
    assert.deepEqual(Object.keys(body).sort(), ['ProjectSearchConfigJson', 'UpdatedAt']);
  });
});

test('aucun profil : rien n’est créé, la configuration reste dans le navigateur', async () => {
  await withFetch(() => makeResponse(200, { value: [] }), async (calls) => {
    const store = createSharePointProjectSearchConfigStore();
    const saved = await store.save('a@b.fr', config);
    assert.equal(saved.storage, 'local');
    assert.equal(calls.some((call) => call.init.method === 'POST'), false);
  });
});
