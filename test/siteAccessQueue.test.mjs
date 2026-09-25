import test from 'node:test';
import assert from 'node:assert/strict';
import { queueSiteAccessRequest } from '../src/utils/siteAccessQueue.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';
import { resetSharePointContext } from '../src/utils/spContext.js';

const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(body ?? '')
});

const withSharePoint = async (fn) => {
  const previous = globalThis.window;
  const calls = [];
  globalThis.window = {
    location: {
      origin: 'https://entreprisedemo1.sharepoint.com',
      pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
      protocol: 'https:',
      hostname: 'entreprisedemo1.sharepoint.com'
    },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      if (String(url).endsWith('/_api/contextinfo')) {
        return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
      }
      return makeResponse(201, { Id: 7 });
    }
  };
  resetSpRestClient();
  resetSharePointContext();
  try {
    return await fn(calls);
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
    resetSharePointContext();
  }
};

test('aucune adresse : rien n’est mis en file', async () => {
  assert.deepEqual(await queueSiteAccessRequest({ email: '' }), { queued: false, reason: 'no-email' });
  assert.deepEqual(await queueSiteAccessRequest({}), { queued: false, reason: 'no-email' });
});

test('hors SharePoint : la demande n’est pas déposée', async () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    const result = await queueSiteAccessRequest({ email: 'claire.dubreuil@entreprise-demo.example' });
    assert.deepEqual(result, { queued: false, reason: 'mock' });
  } finally {
    globalThis.window = previous;
  }
});

test('sur SharePoint : un élément Pending est créé dans CN_SiteAccessRequests', async () => {
  await withSharePoint(async (calls) => {
    const result = await queueSiteAccessRequest({
      email: 'Claire.Dubreuil@entreprise-demo.example',
      displayName: 'Claire Dubreuil',
      context: 'Partage de projet : Mon projet'
    });

    assert.deepEqual(result, { queued: true });

    const write = calls.find((call) => call.url.includes("getbytitle('CN_SiteAccessRequests')/items"));
    assert.ok(write, 'la file doit être ciblée');
    assert.equal(write.init.method, 'POST');

    const item = JSON.parse(write.init.body);
    assert.equal(item.Status, 'Pending');
    assert.equal(item.TargetEmail, 'claire.dubreuil@entreprise-demo.example');
    assert.equal(item.Title, 'claire.dubreuil@entreprise-demo.example');
    assert.equal(item.DisplayName, 'Claire Dubreuil');
    assert.equal(item.Context, 'Partage de projet : Mon projet');
    assert.equal(item.RequestedByEmail, '');
  });
});

test('sans nom affiché : DisplayName retombe sur l’e-mail', async () => {
  await withSharePoint(async (calls) => {
    await queueSiteAccessRequest({ email: 'marc.lefevre@entreprise-demo.example' });
    const write = calls.find((call) => call.url.includes('/items'));
    const item = JSON.parse(write.init.body);
    assert.equal(item.DisplayName, 'marc.lefevre@entreprise-demo.example');
    assert.equal(item.Context, '');
  });
});
