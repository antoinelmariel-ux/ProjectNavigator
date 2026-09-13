import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointSampleProjectsProvider } from '../src/utils/sampleProjectsProvider.js';
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

test('listAllSampleProjects : convertit les lignes CN_SampleProjects et trie par SortOrder', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_SampleProjects')/items"));
      return makeResponse(200, {
        value: [
          {
            Id: 1,
            SampleId: 'sample_b',
            Title: 'Cas B',
            AnswersJson: '{"ProjectType":"lfb"}',
            SortOrder: 2000,
            RowVersion: 1,
            CreatedByEmail: 'b@lfb.fr',
            UpdatedAt: '2026-09-01T10:00:00.000Z'
          },
          {
            Id: 2,
            SampleId: 'sample_a',
            Title: 'Cas A',
            AnswersJson: '{"ProjectType":"partenaire"}',
            SortOrder: 1000,
            RowVersion: 3,
            CreatedByEmail: 'a@lfb.fr',
            UpdatedAt: '2026-09-02T10:00:00.000Z'
          }
        ]
      });
    },
    async () => {
      const provider = new SharePointSampleProjectsProvider();
      const entries = await provider.listAllSampleProjects();

      assert.deepEqual(entries.map((entry) => entry.sample.id), ['sample_a', 'sample_b']);
      assert.equal(entries[0].sample.name, 'Cas A');
      assert.deepEqual(entries[0].sample.answers, { ProjectType: 'partenaire' });
      assert.equal(entries[0].sample.createdBy, 'a@lfb.fr');
      assert.equal(entries[0].meta.rowVersion, 3);
      assert.equal(entries[0].meta.sortOrder, 1000);
    }
  );
});

test('listAllSampleProjects : une liste vide est un corpus vide, pas une erreur', async () => {
  await withFetch(
    () => makeResponse(200, { value: [] }),
    async () => {
      const provider = new SharePointSampleProjectsProvider();
      assert.deepEqual(await provider.listAllSampleProjects(), []);
    }
  );
});

test('saveSampleProject : projet type absent crée une ligne avec RowVersion=1', async () => {
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
      const provider = new SharePointSampleProjectsProvider();
      const sample = { id: 'sample_x', name: 'Étude clinique', answers: { ProjectType: 'lfb', q19: ['site'] } };
      const { sample: saved, meta } = await provider.saveSampleProject(sample, {
        sortOrder: 3000,
        userEmail: 'a@b.fr'
      });

      assert.equal(saved.id, 'sample_x');
      assert.equal(meta.sortOrder, 3000);

      const create = calls.find((c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?'));
      assert.ok(create, 'la création doit passer par POST /items');
      const sent = JSON.parse(create.init.body);
      assert.equal(sent.SampleId, 'sample_x');
      assert.equal(sent.Title, 'Étude clinique');
      assert.deepEqual(JSON.parse(sent.AnswersJson), sample.answers);
      assert.equal(sent.RowVersion, 1);
      assert.equal(sent.CreatedByEmail, 'a@b.fr');
    }
  );
});

test('saveSampleProject : conflit de RowVersion lève ConflictError sans écrire', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, {
          value: [{ Id: 7, SampleId: 'sample_a', RowVersion: 4, 'odata.etag': '"4"' }]
        });
      }
      throw new Error('ne doit jamais écrire en cas de conflit');
    },
    async () => {
      const provider = new SharePointSampleProjectsProvider();
      await assert.rejects(
        () => provider.saveSampleProject({ id: 'sample_a', name: 'A', answers: {} }, { expectedRowVersion: 2 }),
        ConflictError
      );
    }
  );
});

test('removeSampleProject : projet type inconnu ne déclenche aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'), 'pas besoin de digest si rien à supprimer');
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointSampleProjectsProvider();
      await provider.removeSampleProject('sample-inconnu');
    }
  );
});
