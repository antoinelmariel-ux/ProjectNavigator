import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointRulesProvider } from '../src/utils/rulesProvider.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';
import { ConflictError } from '../src/utils/errors.js';

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

const digestResponse = () =>
  makeResponse(200, { FormDigestValue: 'DIGEST-1', FormDigestTimeoutSeconds: 1800 });

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
      return handler(url, init, calls.length);
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

test('listAllRules : convertit les lignes CN_Rules et trie par SortOrder', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_Rules')/items"));
      return makeResponse(200, {
        value: [
          { Id: 1, RuleId: 'rule2', Title: 'B', PayloadJson: '{"name":"B","teams":["dpo"]}', SortOrder: 2000, RowVersion: 1 },
          { Id: 2, RuleId: 'rule1', Title: 'A', PayloadJson: '{"name":"A","teams":["pi"]}', SortOrder: 1000, RowVersion: 3 }
        ]
      });
    },
    async () => {
      const provider = new SharePointRulesProvider();
      const entries = await provider.listAllRules();
      assert.deepEqual(entries.map((entry) => entry.rule.id), ['rule1', 'rule2']);
      assert.equal(entries[0].rule.name, 'A');
      assert.equal(entries[0].meta.rowVersion, 3);
      assert.equal(entries[0].meta.sortOrder, 1000);
    }
  );
});

test('saveRule : règle absente crée une ligne avec RowVersion=1', async () => {
  await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      if (init.method === 'GET') {
        return makeResponse(200, { value: [] });
      }
      return makeResponse(201, { Id: 5 });
    },
    async (calls) => {
      const provider = new SharePointRulesProvider();
      const rule = { id: 'rule9', name: { fr: 'Nouvelle règle' }, teams: ['dpo'] };
      const { rule: saved, meta } = await provider.saveRule(rule, { sortOrder: 3000, userEmail: 'a@b.fr' });

      assert.equal(saved.id, 'rule9');
      assert.equal(meta.sortOrder, 3000);

      const create = calls.find((c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?'));
      assert.ok(create, 'la création doit passer par POST /items');
      const body = JSON.parse(create.init.body);
      assert.equal(body.RuleId, 'rule9');
      assert.equal(body.Title, 'Nouvelle règle');
      assert.deepEqual(JSON.parse(body.PayloadJson), rule);
      assert.equal(body.RowVersion, 1);
    }
  );
});

test('saveRule : conflit de RowVersion lève ConflictError sans écrire', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, {
          value: [{ Id: 7, RuleId: 'rule1', RowVersion: 4, 'odata.etag': '"4"' }]
        });
      }
      throw new Error('ne doit jamais écrire en cas de conflit');
    },
    async () => {
      const provider = new SharePointRulesProvider();
      await assert.rejects(
        () => provider.saveRule({ id: 'rule1', name: 'A' }, { expectedRowVersion: 2 }),
        ConflictError
      );
    }
  );
});

test('removeRule : règle inconnue ne déclenche aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'), 'pas besoin de digest si rien à supprimer');
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointRulesProvider();
      await provider.removeRule('rule-inconnue');
    }
  );
});
