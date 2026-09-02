import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointRestProvider, dataProvider } from '../src/utils/dataProvider.js';
import { SharePointInspirationProvider } from '../src/utils/inspirationDataProvider.js';
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

test('hors SharePoint, le fournisseur par défaut reste le mock synchrone', () => {
  assert.equal(typeof dataProvider.listProjectsSync, 'function');
  assert.ok(dataProvider.listProjectsSync().length >= 0);
});

test('SharePointRestProvider : listProjects convertit les lignes en projets', async () => {
  await withFetch(
    () =>
      makeResponse(200, {
        value: [
          {
            Id: 3,
            ProjectId: 'p-1',
            Title: 'Étude clinique',
            Status: 'Submitted',
            OwnerEmail: 'a@lfb.fr',
            AnswersJson: '{"q1":"oui"}',
            AnalysisJson: '{"riskScore":6}',
            ProgressAnswered: 4,
            ProgressTotal: 10,
            SubmissionDate: '2026-08-01T09:00:00Z',
            LastAutosaveAt: '2026-08-02T09:00:00Z',
            RowVersion: 2,
            UpdatedByEmail: 'b@lfb.fr'
          }
        ]
      }),
    async () => {
      const projects = await new SharePointRestProvider().listProjects();
      assert.equal(projects.length, 1);
      assert.deepEqual(projects[0], {
        id: 'p-1',
        projectName: 'Étude clinique',
        status: 'submitted',
        answers: { q1: 'oui' },
        analysis: { riskScore: 6 },
        answeredQuestions: 4,
        totalQuestions: 10,
        lastUpdated: '2026-08-02T09:00:00Z',
        submittedAt: '2026-08-01T09:00:00Z',
        ownerEmail: 'a@lfb.fr',
        rowVersion: 2,
        lastModifiedBy: 'b@lfb.fr'
      });
    }
  );
});

test('SharePointRestProvider : upsertProject sérialise les réponses et renvoie le contrat attendu', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET') {
        return makeResponse(200, { value: [] });
      }
      return makeResponse(201, { Id: 21 });
    },
    async (calls) => {
      const result = await new SharePointRestProvider().upsertProject(
        {
          id: 'p-new',
          projectName: 'Nouveau projet',
          status: 'draft',
          answers: { q1: 'non' },
          analysis: null,
          answeredQuestions: 1,
          totalQuestions: 8
        },
        { userEmail: 'moi@lfb.fr' }
      );

      const write = calls.find((call) => call.init.method === 'POST' && call.url.includes('/items'));
      const body = JSON.parse(write.init.body);
      assert.equal(body.AnswersJson, '{"q1":"non"}');
      assert.equal(body.Status, 'Draft');
      assert.equal(body.OwnerEmail, 'moi@lfb.fr');
      assert.equal(body.RowVersion, 1);

      assert.equal(result.project.id, 'p-new');
      assert.deepEqual(result.project.answers, { q1: 'non' });
      assert.equal(result.updatedBy, 'moi@lfb.fr');
      assert.equal(result.etag, 'W/"p-new-1"');
    }
  );
});

test('SharePointRestProvider : le conflit expose un projet applicatif, pas une ligne brute', async () => {
  await withFetch(
    (url, init) => {
      assert.equal(init.method, 'GET');
      return makeResponse(200, {
        value: [
          {
            'odata.etag': 'W/"4"',
            Id: 3,
            ProjectId: 'p-1',
            Title: 'Version serveur',
            Status: 'Draft',
            AnswersJson: '{"q1":"serveur"}',
            RowVersion: 5
          }
        ]
      });
    },
    async () => {
      await assert.rejects(
        () =>
          new SharePointRestProvider().upsertProject(
            { id: 'p-1', projectName: 'Ma version', answers: {} },
            { expectedRowVersion: 2 }
          ),
        (error) => {
          assert.equal(error.name, 'ConflictError');
          assert.equal(error.serverRecord.projectName, 'Version serveur');
          assert.deepEqual(error.serverRecord.answers, { q1: 'serveur' });
          assert.equal(error.serverRecord.rowVersion, 5);
          return true;
        }
      );
    }
  );
});

test('SharePointRestProvider : id manquant rejeté avant tout appel réseau', async () => {
  await withFetch(
    () => {
      throw new Error('aucun appel ne doit partir');
    },
    async () => {
      await assert.rejects(() => new SharePointRestProvider().upsertProject({}), /id manquant/);
    }
  );
});

test('SharePointInspirationProvider : listInspirations lit CN_Inspirations', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_Inspirations')"));
      return makeResponse(200, {
        value: [
          {
            Id: 1,
            InspirationId: 'i-1',
            Title: 'Campagne',
            Visibility: 'Shared',
            InspirationJson: '{"labName":"Labo X","documents":[]}',
            RowVersion: 1,
            CreatedByEmail: 'a@lfb.fr',
            UpdatedAt: '2026-08-02T09:00:00Z'
          }
        ]
      });
    },
    async () => {
      const inspirations = await new SharePointInspirationProvider().listInspirations();
      assert.equal(inspirations.length, 1);
      assert.equal(inspirations[0].id, 'i-1');
      assert.equal(inspirations[0].labName, 'Labo X');
      assert.equal(inspirations[0].visibility, 'shared');
    }
  );
});
