import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointTeamsProvider } from '../src/utils/teamsProvider.js';
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

test('listAllTeams : convertit les lignes CN_Teams et trie par SortOrder', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_Teams')/items"));
      return makeResponse(200, {
        value: [
          { Id: 1, TeamId: 'pi', Title: 'PI', ContactsJson: '["dpi@lfb.fr"]', Expertise: 'texte', SortOrder: 2000, RowVersion: 1 },
          { Id: 2, TeamId: 'dpo', Title: 'DPO', ContactsJson: '["dpo@lfb.fr"]', Expertise: 'texte', SortOrder: 1000, RowVersion: 2 }
        ]
      });
    },
    async () => {
      const provider = new SharePointTeamsProvider();
      const entries = await provider.listAllTeams();
      assert.deepEqual(entries.map((entry) => entry.team.id), ['dpo', 'pi']);
      assert.deepEqual(entries[0].team.contacts, ['dpo@lfb.fr']);
      assert.equal(entries[0].meta.rowVersion, 2);
    }
  );
});

test('saveTeam : équipe absente crée une ligne, équipe existante met à jour (MERGE)', async () => {
  let created = false;

  await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      if (init.headers && init.headers['X-HTTP-Method'] === 'MERGE') {
        return makeResponse(204, '');
      }
      if (init.method === 'POST' && url.includes('/items') && !url.includes('?')) {
        created = true;
        return makeResponse(201, { Id: 3 });
      }
      return makeResponse(200, {
        value: created
          ? [{
            Id: 3,
            TeamId: 'dpo',
            Title: 'DPO',
            ContactsJson: '["dpo@lfb.fr"]',
            Expertise: 'texte',
            SortOrder: 1000,
            RowVersion: 1,
            'odata.etag': '"1"'
          }]
          : []
      });
    },
    async (calls) => {
      const provider = new SharePointTeamsProvider();
      const first = await provider.saveTeam(
        { id: 'dpo', name: 'DPO', contacts: ['dpo@lfb.fr'], expertise: 'texte' },
        { sortOrder: 1000, userEmail: 'a@b.fr' }
      );
      const second = await provider.saveTeam(
        { id: 'dpo', name: 'DPO', contacts: ['dpo@lfb.fr', 'x@y.fr'], expertise: 'texte' },
        { sortOrder: 1000, userEmail: 'a@b.fr' }
      );

      assert.equal(first.team.id, 'dpo');
      assert.deepEqual(second.team.contacts, ['dpo@lfb.fr', 'x@y.fr']);

      const creations = calls.filter(
        (c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?')
          && !(c.init.headers && c.init.headers['X-HTTP-Method'])
      );
      assert.equal(creations.length, 1, 'une seule création, la 2e écriture doit être une mise à jour (MERGE)');
    }
  );
});

test('saveTeam : conflit de RowVersion lève ConflictError sans écrire', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, {
          value: [{ Id: 4, TeamId: 'dpo', RowVersion: 5, 'odata.etag': '"5"' }]
        });
      }
      throw new Error('ne doit jamais écrire en cas de conflit');
    },
    async () => {
      const provider = new SharePointTeamsProvider();
      await assert.rejects(
        () => provider.saveTeam({ id: 'dpo', name: 'DPO' }, { expectedRowVersion: 1 }),
        ConflictError
      );
    }
  );
});

test('removeTeam : équipe inconnue ne déclenche aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'), 'pas besoin de digest si rien à supprimer');
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointTeamsProvider();
      await provider.removeTeam('team-inconnue');
    }
  );
});
