import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointFaqProvider } from '../src/utils/faqProvider.js';
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

test('listAllFaqEntries : convertit les lignes CN_Faq, trie par SortOrder, publiée par défaut', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_Faq')/items"));
      return makeResponse(200, {
        value: [
          { Id: 1, FaqId: 'faq_b', Title: 'B', QuestionJson: '{"fr":"B ?"}', AnswerJson: '{"fr":"<p>b</p>"}', IsPublished: false, SortOrder: 2000, RowVersion: 1 },
          { Id: 2, FaqId: 'faq_a', Title: 'A', QuestionJson: '{"fr":"A ?","en":"A?"}', AnswerJson: '{"fr":"a"}', CategoryJson: '{"fr":"Général"}', IsPublished: true, SortOrder: 1000, RowVersion: 3 }
        ]
      });
    },
    async () => {
      const provider = new SharePointFaqProvider();
      const entries = await provider.listAllFaqEntries();
      assert.deepEqual(entries.map((e) => e.entry.id), ['faq_a', 'faq_b']);
      assert.deepEqual(entries[0].entry.question, { fr: 'A ?', en: 'A?' });
      assert.deepEqual(entries[0].entry.category, { fr: 'Général' });
      assert.deepEqual(entries[1].entry.category, {});
      assert.equal(entries[0].entry.isPublished, true);
      assert.equal(entries[1].entry.isPublished, false);
      assert.equal(entries[0].meta.rowVersion, 3);
    }
  );
});

test('listAllFaqEntries : liste vide = FAQ vide, pas une erreur', async () => {
  await withFetch(
    () => makeResponse(200, { value: [] }),
    async () => {
      assert.deepEqual(await new SharePointFaqProvider().listAllFaqEntries(), []);
    }
  );
});

test('saveFaqEntry : crée une ligne avec RowVersion=1 et le texte traduit sérialisé', async () => {
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
      const entry = { id: 'faq_x', question: { fr: 'Pourquoi ?', en: 'Why?' }, answer: { fr: '<p>Parce que</p>' }, category: { fr: 'Général' }, isPublished: true };
      const { entry: saved, meta } = await new SharePointFaqProvider().saveFaqEntry(entry, { sortOrder: 3000, userEmail: 'a@b.fr' });
      assert.equal(saved.id, 'faq_x');
      assert.equal(meta.sortOrder, 3000);
      const create = calls.find((c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?'));
      assert.ok(create);
      const sent = JSON.parse(create.init.body);
      assert.equal(sent.FaqId, 'faq_x');
      assert.equal(sent.Title, 'Why?');
      assert.deepEqual(JSON.parse(sent.QuestionJson), entry.question);
      assert.deepEqual(JSON.parse(sent.CategoryJson), { fr: 'Général' });
      assert.equal(sent.IsPublished, true);
      assert.equal(sent.RowVersion, 1);
    }
  );
});

test('saveFaqEntry : conflit de RowVersion lève ConflictError sans écrire', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, { value: [{ Id: 7, FaqId: 'faq_a', RowVersion: 4, 'odata.etag': '"4"' }] });
      }
      throw new Error('ne doit jamais écrire en cas de conflit');
    },
    async () => {
      await assert.rejects(
        () => new SharePointFaqProvider().saveFaqEntry({ id: 'faq_a', question: {}, answer: {} }, { expectedRowVersion: 2 }),
        ConflictError
      );
    }
  );
});

test('removeFaqEntry : entrée inconnue ne déclenche aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'));
      return makeResponse(200, { value: [] });
    },
    async () => {
      await new SharePointFaqProvider().removeFaqEntry('inconnue');
    }
  );
});
