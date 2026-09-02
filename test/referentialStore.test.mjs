import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENTIAL_FILES,
  buildReferentialPayload,
  describeSize,
  diagnoseInstallation,
  flattenReferentials,
  loadReferentials,
  publishAllReferentials,
  resetReferentialStore
} from '../src/utils/referentialStore.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';
import { sharepointConfig } from '../src/config/sharepointConfig.js';

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
  resetReferentialStore();
  try {
    return await fn(calls);
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
    resetReferentialStore();
  }
};

test('buildReferentialPayload : un fichier par référentiel, réglages regroupés', () => {
  const payload = buildReferentialPayload({
    questions: [{ id: 'q1' }],
    riskLevelRules: [],
    riskWeights: { a: 1 },
    showcaseThemes: [],
    adminEmails: ['a@b.fr'],
    onboardingTourConfig: { steps: [] },
    validationCommitteeConfig: {},
    inspirationFormFields: [],
    projectFilters: { fields: [] },
    inspirationFilters: { fields: [] },
    projects: 'ne doit pas être publié'
  });

  assert.deepEqual(Object.keys(payload).sort(), Object.keys(REFERENTIAL_FILES).sort());
  assert.deepEqual(payload.settings.adminEmails, ['a@b.fr']);
  assert.ok(!('projects' in payload));
  assert.ok(!('projects' in payload.settings));
});

test('flattenReferentials : redéploie settings.json en tranches applicatives', () => {
  const slices = flattenReferentials({
    questions: [{ id: 'q1' }],
    settings: { adminEmails: ['a@b.fr'], onboardingTourConfig: { steps: [] } }
  });

  assert.deepEqual(slices.questions, [{ id: 'q1' }]);
  assert.deepEqual(slices.adminEmails, ['a@b.fr']);
  assert.deepEqual(slices.onboardingTourConfig, { steps: [] });
  assert.ok(!('settings' in slices));
});

test('aller-retour build → flatten', () => {
  const state = {
    questions: [{ id: 'q1' }],
    riskLevelRules: [],
    riskWeights: {},
    showcaseThemes: [],
    adminEmails: ['x@y.fr'],
    onboardingTourConfig: { a: 1 },
    validationCommitteeConfig: { b: 2 },
    inspirationFormFields: [],
    projectFilters: {},
    inspirationFilters: {}
  };
  assert.deepEqual(flattenReferentials(buildReferentialPayload(state)), state);
});

test('describeSize : longueur des tableaux, nombre de clés des objets', () => {
  assert.equal(describeSize([1, 2, 3]), 3);
  assert.equal(describeSize({ a: 1, b: 2 }), 2);
  assert.equal(describeSize('texte'), 0);
});

test('loadReferentials : fichier absent listé, fichier présent analysé', async () => {
  await withFetch(
    (url) => {
      if (url.includes('questions.json') && url.endsWith('/$value')) {
        return makeResponse(200, '[{"id":"q1"}]', { ETag: '"{GUID},3"' });
      }
      return makeResponse(404, { error: { message: 'File Not Found.' } });
    },
    async () => {
      const { data, slices, missing, errors } = await loadReferentials();
      assert.deepEqual(data.questions, [{ id: 'q1' }]);
      assert.deepEqual(slices.questions, [{ id: 'q1' }]);
      assert.equal(errors.length, 0);
      assert.ok(missing.includes('risk-level-rules.json'));
      assert.ok(missing.includes('settings.json'));
      assert.ok(!missing.includes('questions.json'));
    }
  );
});

test('loadReferentials : un JSON corrompu est signalé sans bloquer les autres', async () => {
  await withFetch(
    (url) => {
      if (url.includes('settings.json') && url.endsWith('/$value')) {
        return makeResponse(200, '{ pas du json', { ETag: '"1"' });
      }
      if (url.includes('questions.json') && url.endsWith('/$value')) {
        return makeResponse(200, '[]', { ETag: '"1"' });
      }
      return makeResponse(404, { error: { message: 'File Not Found.' } });
    },
    async () => {
      const { data, errors } = await loadReferentials();
      assert.deepEqual(data.questions, []);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].file, 'settings.json');
      assert.match(errors[0].message, /pas un JSON valide/);
    }
  );
});

test('publishAllReferentials : crée les fichiers absents via Files/add', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET' && url.endsWith('/$value')) {
        return makeResponse(404, { error: { message: 'File Not Found.' } });
      }
      if (init.method === 'GET') {
        return makeResponse(200, { 'odata.etag': '"{GUID},1"' });
      }
      return makeResponse(200, {});
    },
    async (calls) => {
      const results = await publishAllReferentials({
        questions: [{ id: 'q1' }, { id: 'q2' }],
        riskLevelRules: [],
        riskWeights: {},
        showcaseThemes: [],
        adminEmails: ['a@b.fr']
      });

      assert.ok(results.every((entry) => entry.status === 'published'));
      const questions = results.find((entry) => entry.key === 'questions');
      assert.equal(questions.count, 2);

      const add = calls.find((call) => call.url.includes("Files/add(url='questions.json'"));
      assert.ok(add, 'la création doit passer par Files/add');
      assert.equal(add.init.headers['Content-Type'], 'application/json;charset=utf-8');
      assert.deepEqual(JSON.parse(add.init.body), [{ id: 'q1' }, { id: 'q2' }]);
      assert.ok(add.url.includes(`${sharepointConfig.libraries.config}`));
    }
  );
});

test('publishAllReferentials : écrase avec IF-MATCH quand l’etag est connu', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET' && url.endsWith('/$value')) {
        return makeResponse(200, '[]', { ETag: '"{GUID},7"' });
      }
      if (init.method === 'GET') {
        return makeResponse(200, { 'odata.etag': '"{GUID},8"' });
      }
      return makeResponse(200, {});
    },
    async (calls) => {
      await loadReferentials();
      await publishAllReferentials({ questions: [{ id: 'q1' }] });

      const put = calls.find(
        (call) => call.init.headers && call.init.headers['X-HTTP-Method'] === 'PUT'
      );
      assert.ok(put, 'une mise à jour doit utiliser PUT');
      assert.equal(put.init.headers['IF-MATCH'], '"{GUID},7"');
      assert.ok(put.url.includes('questions.json'));
    }
  );
});

test('publishAllReferentials : un échec est rapporté sans interrompre les autres', async () => {
  await withFetch(
    (url, init) => {
      if (init.method === 'GET' && url.endsWith('/$value')) {
        return makeResponse(404, { error: { message: 'File Not Found.' } });
      }
      if (init.method === 'GET') {
        return makeResponse(200, { 'odata.etag': '"1"' });
      }
      if (url.includes("Files/add(url='risk-level-rules.json'")) {
        return makeResponse(403, { error: { message: 'Accès refusé' } });
      }
      return makeResponse(200, {});
    },
    async () => {
      const results = await publishAllReferentials({ questions: [], riskLevelRules: [] });
      const riskLevelRules = results.find((entry) => entry.key === 'riskLevelRules');
      assert.equal(riskLevelRules.status, 'error');
      assert.match(riskLevelRules.message, /Accès refusé/);
      assert.equal(results.find((entry) => entry.key === 'questions').status, 'published');
    }
  );
});

test('diagnoseInstallation : signale listes, bibliothèques et fichiers manquants', async () => {
  const presentTitles = [
    ...Object.values(sharepointConfig.lists),
    'CN-App',
    'CN-Config'
  ].map((Title) => ({ Title }));

  await withFetch(
    (url) => {
      if (url.includes('/_api/web/lists?')) {
        return makeResponse(200, { value: presentTitles });
      }
      if (url.includes('/Files?')) {
        return makeResponse(200, { value: [{ Name: 'questions.json' }] });
      }
      return makeResponse(404, {});
    },
    async () => {
      const diagnostic = await diagnoseInstallation();
      assert.equal(diagnostic.ok, false);
      assert.deepEqual(diagnostic.missing, ['CN-Documents']);
      assert.ok(diagnostic.lists.every((entry) => entry.present));
      assert.equal(diagnostic.files.find((entry) => entry.name === 'questions.json').present, true);
      assert.equal(diagnostic.files.find((entry) => entry.name === 'risk-level-rules.json').present, false);
    }
  );
});
