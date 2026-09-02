import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointProjectMembersProvider } from '../src/utils/projectMembersProvider.js';
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

test('listMembers : convertit les lignes CN_ProjectMembers en membres applicatifs', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_ProjectMembers')/items"));
      assert.ok(url.includes("ProjectId%20eq%20'proj-1'"));
      return makeResponse(200, {
        value: [
          { EntryId: 'proj-1::a@b.com', ProjectId: 'proj-1', MemberEmail: 'a@b.com', Role: 'Owner', CanSubmit: true },
          { EntryId: 'proj-1::c@d.com', ProjectId: 'proj-1', MemberEmail: 'c@d.com', Role: 'Contributor', CanSubmit: false }
        ]
      });
    },
    async () => {
      const provider = new SharePointProjectMembersProvider();
      const members = await provider.listMembers('proj-1');
      assert.deepEqual(members, [
        { projectId: 'proj-1', email: 'a@b.com', role: 'Owner', canSubmit: true },
        { projectId: 'proj-1', email: 'c@d.com', role: 'Contributor', canSubmit: false }
      ]);
    }
  );
});

test('addMember : ajouter deux fois le même email met à jour la même ligne (pas de doublon)', async () => {
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
        return makeResponse(201, { Id: 9 });
      }
      // Recherche par clé (EntryId) avant écriture.
      return makeResponse(200, {
        value: created
          ? [{
            Id: 9,
            EntryId: 'proj-1::a@b.com',
            ProjectId: 'proj-1',
            MemberEmail: 'a@b.com',
            Role: 'Contributor',
            CanSubmit: true,
            'odata.etag': '"1"'
          }]
          : []
      });
    },
    async (calls) => {
      const provider = new SharePointProjectMembersProvider();
      const first = await provider.addMember('proj-1', 'a@b.com');
      const second = await provider.addMember('proj-1', 'A@B.com', { role: 'Compliance' });

      assert.equal(first.email, 'a@b.com');
      assert.equal(second.role, 'Compliance');

      const creations = calls.filter(
        (c) => c.init.method === 'POST' && c.url.includes('/items') && !c.url.includes('?')
          && !(c.init.headers && c.init.headers['X-HTTP-Method'])
      );
      assert.equal(creations.length, 1, 'une seule création, la 2e écriture doit être une mise à jour (MERGE)');
    }
  );
});

test('removeMember : sans ligne existante, ne fait aucune écriture', async () => {
  await withFetch(
    (url) => {
      assert.ok(!url.endsWith('/_api/contextinfo'), 'pas besoin de digest si rien à supprimer');
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointProjectMembersProvider();
      await provider.removeMember('proj-1', 'inconnu@b.com');
    }
  );
});
