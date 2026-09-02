import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointUserProfileProvider } from '../src/utils/userProfileProvider.js';
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

test('getProfile : aucune ligne existante renvoie null', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.includes("getbytitle('CN_UserProfiles')/items"));
      return makeResponse(200, { value: [] });
    },
    async () => {
      const provider = new SharePointUserProfileProvider();
      const profile = await provider.getProfile('a@b.com');
      assert.equal(profile, null);
    }
  );
});

test('getProfile : convertit la ligne CN_UserProfiles en profil applicatif', async () => {
  await withFetch(
    () => makeResponse(200, {
      value: [{
        UserEmail: 'a@b.com',
        ActivityScopeJson: '["france","uk"]',
        PreferredLanguage: 'fr',
        HasCompletedOnboarding: true
      }]
    }),
    async () => {
      const provider = new SharePointUserProfileProvider();
      const profile = await provider.getProfile('A@B.com');
      assert.deepEqual(profile, {
        email: 'a@b.com',
        activityScope: ['france', 'uk'],
        preferredLanguage: 'fr',
        hasCompletedOnboarding: true
      });
    }
  );
});

test('saveProfile : une écriture partielle ne réinitialise pas hasCompletedOnboarding', async () => {
  let updated = false;

  await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      if (init.headers && init.headers['X-HTTP-Method'] === 'MERGE') {
        updated = true;
        return makeResponse(204, '');
      }
      // Recherche par clé (UserEmail), avant et pendant l'upsert.
      return makeResponse(200, {
        value: [{
          Id: 5,
          UserEmail: 'a@b.com',
          ActivityScopeJson: '["france"]',
          PreferredLanguage: 'en',
          HasCompletedOnboarding: true,
          'odata.etag': '"1"'
        }]
      });
    },
    async () => {
      const provider = new SharePointUserProfileProvider();
      const saved = await provider.saveProfile('a@b.com', { activityScope: ['france', 'uk'], preferredLanguage: 'fr' });

      assert.equal(updated, true);
      assert.deepEqual(saved.activityScope, ['france', 'uk']);
      assert.equal(saved.preferredLanguage, 'fr');
      assert.equal(saved.hasCompletedOnboarding, true, 'le champ absent du patch doit être conservé');
    }
  );
});
