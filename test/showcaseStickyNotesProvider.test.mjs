import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointShowcaseStickyNotesProvider } from '../src/utils/showcaseStickyNotesProvider.js';
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

test('listNotes : reconstruit position, réponses et pièces jointes depuis AnchorJson/RepliesJson/AttachmentsJson', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_ShowcaseStickyNotes')/items"));
      return makeResponse(200, {
        value: [{
          StickyId: 'sticky-1',
          ProjectId: 'proj-1',
          ShowcaseSection: 'hero',
          AnchorJson: '{"scope":"display-full","sectionId":"hero","sectionX":0.4,"sectionY":0.2,"x":0.1,"y":0.2}',
          Content: 'À vérifier',
          Color: '#ffdd55',
          Resolved: false,
          RepliesJson: '[{"id":"r1","text":"ok","author":"Jean","authorEmail":"jean@b.fr","createdAt":"2026-01-01T00:00:00.000Z","attachments":[]}]',
          AttachmentsJson: '[]',
          RowVersion: '2',
          CreatedByEmail: 'jean@b.fr',
          UpdatedByEmail: 'jean@b.fr',
          UpdatedAt: '2026-01-02T00:00:00.000Z'
        }]
      });
    },
    async () => {
      const provider = new SharePointShowcaseStickyNotesProvider();
      const notes = await provider.listNotes('proj-1');

      assert.equal(notes.length, 1);
      const note = notes[0];
      assert.equal(note.id, 'sticky-1');
      assert.equal(note.scope, 'display-full');
      assert.equal(note.sectionId, 'hero');
      assert.equal(note.sectionX, 0.4);
      assert.equal(note.status, 'open');
      assert.equal(note.replies.length, 1);
      assert.equal(note.replies[0].author, 'Jean');
      assert.deepEqual(note.attachments, []);
      assert.equal(note.rowVersion, 2);
    }
  );
});

test('upsertNote : envoie la position, le statut clos et les réponses au format attendu', async () => {
  await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      if (url.includes('?')) {
        // Recherche par clé (StickyId) avant écriture : pas encore créé.
        return makeResponse(200, { value: [] });
      }
      assert.equal(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.equal(body.StickyId, 'sticky-2');
      assert.equal(body.Resolved, true);
      assert.equal(JSON.parse(body.AnchorJson).sectionId, 'benefits');
      assert.equal(JSON.parse(body.RepliesJson).length, 1);
      return makeResponse(201, { Id: 5 });
    },
    async () => {
      const provider = new SharePointShowcaseStickyNotesProvider();
      const saved = await provider.upsertNote({
        id: 'sticky-2',
        projectId: 'proj-1',
        scope: 'display-full',
        sectionId: 'benefits',
        sectionX: 0.5,
        sectionY: 0.5,
        text: 'Fermé',
        color: 'yellow',
        status: 'closed',
        replies: [{ id: 'r1', text: 'ok', author: 'Marie', authorEmail: 'marie@b.fr', createdAt: '2026-01-01T00:00:00.000Z', attachments: [] }],
        attachments: [],
        rowVersion: 1,
        sourceId: 'marie@b.fr'
      }, { userEmail: 'marie@b.fr' });

      assert.equal(saved.status, 'closed');
    }
  );
});
