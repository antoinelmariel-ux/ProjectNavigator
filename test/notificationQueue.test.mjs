import test from 'node:test';
import assert from 'node:assert/strict';
import { queueNotification } from '../src/utils/notificationQueue.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';

const makeResponse = (status, body, headers = {}) => {
  const normalized = { 'content-type': 'application/json;odata=nometadata' };
  Object.entries(headers).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = value;
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => {
        const key = String(name).toLowerCase();
        return key in normalized ? normalized[key] : null;
      }
    },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? ''))
  };
};

const withSharePoint = async (fn) => {
  const previous = globalThis.window;
  const calls = [];
  globalThis.window = {
    location: {
      origin: 'https://lfb1.sharepoint.com',
      pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
      protocol: 'https:',
      hostname: 'lfb1.sharepoint.com'
    },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      if (url.endsWith('/_api/contextinfo')) {
        return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
      }
      return makeResponse(201, { Id: 5 });
    }
  };
  resetSpRestClient();
  try {
    return await fn(calls);
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
  }
};

test('aucun destinataire : rien n’est mis en file', async () => {
  const result = await queueNotification({ subject: 'x', body: 'y', to: [], cc: [] });
  assert.deepEqual(result, { queued: false, reason: 'no-recipient' });
});

test('hors SharePoint : la notification est seulement journalisée', async () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  const previousInfo = console.info;
  let logged = null;
  console.info = (...args) => {
    logged = args;
  };
  try {
    const result = await queueNotification({ subject: 'Sujet', body: 'Corps', to: ['a@b.fr'] });
    assert.deepEqual(result, { queued: false, reason: 'mock' });
    assert.ok(logged && String(logged[0]).includes('mode simulé'));
  } finally {
    console.info = previousInfo;
    globalThis.window = previous;
  }
});

test('sur SharePoint : un élément Pending est créé dans CN_NotificationsQueue', async () => {
  await withSharePoint(async (calls) => {
    const result = await queueNotification({
      subject: '[Project Navigator] Mon projet - Projet soumis pour analyse',
      body: '<p>Bonjour</p>',
      to: ['equipe1@lfb.fr', 'equipe2@lfb.fr'],
      cc: ['porteur@lfb.fr'],
      projectId: 'p-1',
      actionType: 'Projet soumis pour analyse'
    });

    assert.deepEqual(result, { queued: true });

    const write = calls.find((call) => call.url.includes("getbytitle('CN_NotificationsQueue')/items"));
    assert.ok(write, 'la file doit être ciblée');
    assert.equal(write.init.method, 'POST');

    const item = JSON.parse(write.init.body);
    assert.equal(item.Status, 'Pending');
    assert.equal(item.ToEmails, 'equipe1@lfb.fr;equipe2@lfb.fr');
    assert.equal(item.CcEmails, 'porteur@lfb.fr');
    assert.equal(item.ProjectId, 'p-1');
    assert.equal(item.NotificationType, 'Projet soumis pour analyse');
    assert.equal(item.Title, '[Project Navigator] Mon projet - Projet soumis pour analyse');
    assert.equal(item.Body, '<p>Bonjour</p>');
  });
});

test('un corps démesuré est tronqué avant écriture', async () => {
  await withSharePoint(async (calls) => {
    await queueNotification({
      subject: 'x',
      body: 'a'.repeat(50000),
      to: ['a@b.fr']
    });
    const write = calls.find((call) => call.url.includes('/items'));
    assert.equal(JSON.parse(write.init.body).Body.length, 30000);
  });
});
