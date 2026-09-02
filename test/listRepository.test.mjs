import test from 'node:test';
import assert from 'node:assert/strict';
import { createListRepository } from '../src/utils/listRepository.js';
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

const withFetch = async (handler, fn) => {
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
      return handler(url, init, calls);
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

const existingRow = {
  'odata.etag': 'W/"5"',
  Id: 12,
  ProjectId: 'p-1',
  Title: 'Projet',
  Status: 'Draft',
  AnswersJson: '{"q1":"oui"}',
  RowVersion: 3
};

test('getAll : cible la bonne liste et convertit les lignes', async () => {
  await withFetch(
    () => makeResponse(200, { value: [existingRow] }),
    async (calls) => {
      const repo = createListRepository('projects');
      const records = await repo.getAll();

      assert.ok(calls[0].url.includes("getbytitle('CN_Projects')/items"));
      assert.ok(calls[0].url.includes('%24select=Id%2C') || calls[0].url.includes('$select=Id%2C'));
      assert.equal(records.length, 1);
      assert.equal(records[0].spItemId, 12);
      assert.deepEqual(records[0].AnswersJson, { q1: 'oui' });
    }
  );
});

test('upsertByKey : crée l’élément absent avec RowVersion 1', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, { value: [] });
      }
      return makeResponse(201, { Id: 40 });
    },
    async (calls) => {
      const repo = createListRepository('projects');
      const saved = await repo.upsertByKey({
        ProjectId: 'p-nouveau',
        Title: 'Nouveau',
        AnswersJson: { q1: 'non' },
        RowVersion: 9
      });

      const write = calls.find((c) => c.init.method === 'POST' && c.url.includes('/items'));
      const body = JSON.parse(write.init.body);
      assert.equal(body.RowVersion, 1, 'une création repart toujours de la version 1');
      assert.equal(body.AnswersJson, '{"q1":"non"}');
      assert.equal(saved.spItemId, 40);
      assert.deepEqual(saved.AnswersJson, { q1: 'non' });
    }
  );
});

test('upsertByKey : incrémente RowVersion et verrouille avec IF-MATCH', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, { value: [existingRow] });
      }
      return makeResponse(204, null);
    },
    async (calls) => {
      const repo = createListRepository('projects');
      const saved = await repo.upsertByKey(
        { ProjectId: 'p-1', Title: 'Projet modifié', AnswersJson: { q1: 'non' } },
        { expectedRowVersion: 3 }
      );

      const write = calls.find((c) => c.url.includes('/items(12)'));
      assert.equal(write.init.headers['X-HTTP-Method'], 'MERGE');
      assert.equal(write.init.headers['IF-MATCH'], 'W/"5"');
      assert.equal(JSON.parse(write.init.body).RowVersion, 4);
      assert.equal(saved.RowVersion, 4);
      assert.equal(saved.Title, 'Projet modifié');
    }
  );
});

test('upsertByKey : version attendue différente → ConflictError sans écriture', async () => {
  await withFetch(
    (url, init) => {
      assert.equal(init.method, 'GET', 'aucune écriture ne doit partir');
      return makeResponse(200, { value: [existingRow] });
    },
    async () => {
      const repo = createListRepository('projects');
      await assert.rejects(
        () => repo.upsertByKey({ ProjectId: 'p-1', Title: 'X' }, { expectedRowVersion: 2 }),
        (error) => {
          assert.equal(error.name, 'ConflictError');
          assert.equal(error.serverRecord.RowVersion, 3);
          assert.deepEqual(error.serverRecord.AnswersJson, { q1: 'oui' });
          return true;
        }
      );
    }
  );
});

test('findByKey : filtre OData avec apostrophe échappée', async () => {
  await withFetch(
    () => makeResponse(200, { value: [] }),
    async (calls) => {
      const repo = createListRepository('projects');
      const found = await repo.findByKey("p'1");
      assert.equal(found, null);
      assert.ok(decodeURIComponent(calls[0].url).includes("ProjectId eq 'p''1'"));
      assert.equal(calls[0].init.headers.Accept, 'application/json;odata=minimalmetadata');
    }
  );
});

test('createListRepository : liste inconnue rejetée', () => {
  assert.throws(() => createListRepository('inexistante'), /Schéma de liste inconnu/);
});
