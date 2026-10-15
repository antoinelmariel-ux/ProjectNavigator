import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointComplianceCommentsProvider } from '../src/utils/complianceCommentsProvider.js';
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

test('listComments : regroupe les lignes plates en {teams, committees} avec réponses triées', async () => {
  await withFetch(
    () =>
      makeResponse(200, {
        value: [
          {
            CommentId: 'proj-1::team:legal',
            ProjectId: 'proj-1',
            SectionKey: 'team:legal',
            Message: 'Merci de préciser',
            CommentType: 'root',
            ThreadId: 'proj-1::team:legal',
            Status: 'pending_information',
            Resolved: false,
            AttachmentsJson: '[]',
            CreatedByEmail: 'legal@b.fr',
            UpdatedByEmail: 'legal@b.fr',
            UpdatedAt: '2026-01-01T00:00:00.000Z'
          },
          {
            CommentId: 'reply-2',
            ProjectId: 'proj-1',
            SectionKey: 'team:legal',
            Message: 'Deuxième réponse',
            CommentType: 'reply',
            ThreadId: 'proj-1::team:legal',
            Status: '',
            Resolved: false,
            AttachmentsJson: '[]',
            CreatedByEmail: 'owner@b.fr',
            UpdatedByEmail: 'owner@b.fr',
            UpdatedAt: '2026-01-03T00:00:00.000Z'
          },
          {
            CommentId: 'reply-1',
            ProjectId: 'proj-1',
            SectionKey: 'team:legal',
            Message: 'Première réponse',
            CommentType: 'reply',
            ThreadId: 'proj-1::team:legal',
            Status: '',
            Resolved: false,
            AttachmentsJson: '[]',
            CreatedByEmail: 'owner@b.fr',
            UpdatedByEmail: 'owner@b.fr',
            UpdatedAt: '2026-01-02T00:00:00.000Z'
          },
          {
            CommentId: 'proj-1::committee:committee-default',
            ProjectId: 'proj-1',
            SectionKey: 'committee:committee-default',
            Message: 'Validé',
            CommentType: 'root',
            ThreadId: 'proj-1::committee:committee-default',
            Status: 'validated',
            Resolved: true,
            AttachmentsJson: '[]',
            CreatedByEmail: 'comite@b.fr',
            UpdatedByEmail: 'comite@b.fr',
            UpdatedAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      }),
    async () => {
      const provider = new SharePointComplianceCommentsProvider();
      const result = await provider.listComments('proj-1');

      assert.equal(result.teams.legal.comment, 'Merci de préciser');
      assert.equal(result.teams.legal.status, 'pending_information');
      assert.equal(result.teams.legal.replies.length, 2);
      // Triées chronologiquement malgré l’ordre d’arrivée des lignes.
      assert.equal(result.teams.legal.replies[0].message, 'Première réponse');
      assert.equal(result.teams.legal.replies[1].message, 'Deuxième réponse');

      assert.equal(result.committees['committee-default'].status, 'validated');
      assert.equal(result.committees['committee-default'].replies.length, 0);
    }
  );
});

test('listAllComments : répartit les lignes de plusieurs projets en une seule requête', async () => {
  await withFetch(
    (url) => {
      // getAll() ne filtre pas par ProjectId : une seule requête pour tous les projets.
      assert.ok(!url.includes('$filter'));
      return makeResponse(200, {
        value: [
          {
            CommentId: 'proj-1::team:legal',
            ProjectId: 'proj-1',
            SectionKey: 'team:legal',
            Message: 'Projet 1',
            CommentType: 'root',
            ThreadId: 'proj-1::team:legal',
            Status: 'validated',
            Resolved: true,
            AttachmentsJson: '[]',
            CreatedByEmail: 'legal@b.fr',
            UpdatedByEmail: 'legal@b.fr',
            UpdatedAt: '2026-01-01T00:00:00.000Z'
          },
          {
            CommentId: 'proj-2::committee:committee-default',
            ProjectId: 'proj-2',
            SectionKey: 'committee:committee-default',
            Message: 'Projet 2',
            CommentType: 'root',
            ThreadId: 'proj-2::committee:committee-default',
            Status: 'rejected',
            Resolved: true,
            AttachmentsJson: '[]',
            CreatedByEmail: 'comite@b.fr',
            UpdatedByEmail: 'comite@b.fr',
            UpdatedAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      });
    },
    async () => {
      const provider = new SharePointComplianceCommentsProvider();
      const byProject = await provider.listAllComments();

      assert.deepEqual(Object.keys(byProject).sort(), ['proj-1', 'proj-2']);
      assert.equal(byProject['proj-1'].teams.legal.comment, 'Projet 1');
      assert.equal(byProject['proj-2'].committees['committee-default'].comment, 'Projet 2');
    }
  );
});

test('upsertComment : publie la ligne racine puis une ligne par réponse', async () => {
  const writes = [];

  await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      if (init.headers && init.headers['X-HTTP-Method'] === 'MERGE') {
        return makeResponse(204, '');
      }
      if (init.method === 'POST' && url.includes('/items') && !url.includes('?')) {
        writes.push(JSON.parse(init.body));
        return makeResponse(201, { Id: writes.length });
      }
      // Recherche par clé avant écriture : toujours « pas encore créé » dans ce test.
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointComplianceCommentsProvider();
      await provider.upsertComment('proj-1', 'team', 'legal', {
        comment: 'Merci de préciser',
        status: 'pending_information',
        attachments: [],
        replies: [
          {
            id: 'reply-1',
            message: 'Voilà la précision',
            authorName: 'Marie',
            authorEmail: 'marie@b.fr',
            createdAt: '2026-01-02T00:00:00.000Z',
            attachments: []
          }
        ]
      }, { userEmail: 'legal@b.fr' });

      assert.equal(writes.length, 2);
      const [root, reply] = writes;
      assert.equal(root.CommentId, 'proj-1::team:legal');
      assert.equal(root.CommentType, 'root');
      assert.equal(root.ThreadId, 'proj-1::team:legal');
      assert.equal(root.Status, 'pending_information');
      assert.equal(root.Resolved, false);
      assert.equal(root.CreatedByEmail, 'legal@b.fr');

      assert.equal(reply.CommentId, 'reply-1');
      assert.equal(reply.CommentType, 'reply');
      assert.equal(reply.ThreadId, 'proj-1::team:legal');
      assert.equal(reply.CreatedByEmail, 'marie@b.fr');
      assert.equal(reply.Message, 'Voilà la précision');
    }
  );
});

test('upsertComment : seul « pending_information » est considéré non résolu', async () => {
  const cases = [
    ['validated', true],
    ['validated_with_conditions', true],
    ['rejected', true],
    ['not_concerned', true],
    ['pending_information', false],
    ['', false]
  ];

  for (const [status, expectedResolved] of cases) {
    await withFetch(
      (url, init) => {
        if (url.endsWith('/_api/contextinfo')) {
          return digestResponse();
        }
        if (init.method === 'POST' && url.includes('/items') && !url.includes('?')) {
          const body = JSON.parse(init.body);
          assert.equal(body.Resolved, expectedResolved, `statut « ${status} »`);
          return makeResponse(201, { Id: 1 });
        }
        return makeResponse(200, { value: [] });
      },
      async () => {
        const provider = new SharePointComplianceCommentsProvider();
        await provider.upsertComment('proj-1', 'committee', 'committee-default', {
          comment: 'ok',
          status,
          attachments: [],
          replies: []
        }, { userEmail: 'comite@b.fr' });
      }
    );
  }
});
