import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointCommitteesProvider } from '../src/utils/committeesProvider.js';
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

test('listAllCommittees : convertit les lignes CN_Committees et trie par SortOrder', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_Committees')/items"));
      return makeResponse(200, {
        value: [
          {
            Id: 1,
            CommitteeId: 'comite_b',
            Title: 'Comité B',
            PayloadJson: '{"name":"Comité B","emails":["b@lfb.fr"],"commentRequired":false}',
            SortOrder: 2000,
            RowVersion: 1
          },
          {
            Id: 2,
            CommitteeId: 'comite_a',
            Title: 'Comité A',
            PayloadJson: '{"name":"Comité A","presidentEmail":"a@lfb.fr"}',
            SortOrder: 1000,
            RowVersion: 3
          }
        ]
      });
    },
    async () => {
      const provider = new SharePointCommitteesProvider();
      const entries = await provider.listAllCommittees();

      assert.deepEqual(entries.map((entry) => entry.committee.id), ['comite_a', 'comite_b']);
      assert.equal(entries[0].committee.name, 'Comité A');
      assert.equal(entries[0].committee.presidentEmail, 'a@lfb.fr');
      assert.deepEqual(entries[1].committee.emails, ['b@lfb.fr']);
      assert.equal(entries[1].committee.commentRequired, false);
      assert.equal(entries[0].meta.rowVersion, 3);
      assert.equal(entries[0].meta.sortOrder, 1000);
    }
  );
});

test('listAllCommittees : l’identifiant de la ligne prime sur celui du JSON', async () => {
  await withFetch(
    () => makeResponse(200, {
      value: [{ Id: 1, CommitteeId: 'cle', PayloadJson: '{"id":"autre","name":"X"}', SortOrder: 1, RowVersion: 1 }]
    }),
    async () => {
      const [entry] = await new SharePointCommitteesProvider().listAllCommittees();
      assert.equal(entry.committee.id, 'cle');
    }
  );
});

test('listAllCommittees : une liste vide ne lève pas d’erreur', async () => {
  await withFetch(
    () => makeResponse(200, { value: [] }),
    async () => {
      assert.deepEqual(await new SharePointCommitteesProvider().listAllCommittees(), []);
    }
  );
});

test('saveCommittee : comité absent crée une ligne avec RowVersion=1 et le comité en PayloadJson', async () => {
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
      const provider = new SharePointCommitteesProvider();
      const committee = { id: 'comite_x', name: 'Comité éthique', emails: ['a@b.fr'] };
      const { committee: saved, meta } = await provider.saveCommittee(committee, {
        sortOrder: 3000,
        userEmail: 'admin@b.fr'
      });

      assert.equal(saved.id, 'comite_x');
      assert.equal(meta.sortOrder, 3000);

      const create = calls.find((c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?'));
      assert.ok(create, 'la création doit passer par POST /items');
      const sent = JSON.parse(create.init.body);
      assert.equal(sent.CommitteeId, 'comite_x');
      assert.equal(sent.Title, 'Comité éthique');
      assert.deepEqual(JSON.parse(sent.PayloadJson), committee);
      assert.equal(sent.RowVersion, 1);
      assert.equal(sent.CreatedByEmail, 'admin@b.fr');
    }
  );
});

test('saveCommittee : conflit de RowVersion lève ConflictError sans écrire', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, {
          value: [{ Id: 7, CommitteeId: 'comite_a', RowVersion: 4, 'odata.etag': '"4"' }]
        });
      }
      throw new Error('ne doit jamais écrire en cas de conflit');
    },
    async () => {
      await assert.rejects(
        () => new SharePointCommitteesProvider().saveCommittee(
          { id: 'comite_a', name: 'A' },
          { expectedRowVersion: 2 }
        ),
        ConflictError
      );
    }
  );
});

test('removeCommittee : comité inconnu ne déclenche aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'), 'pas besoin de digest si rien à supprimer');
      return makeResponse(200, { value: [] });
    },
    async () => {
      await new SharePointCommitteesProvider().removeCommittee('inconnu');
    }
  );
});
