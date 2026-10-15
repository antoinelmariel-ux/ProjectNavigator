import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuery,
  buildUrl,
  odataQuote,
  resetSpRestClient,
  retryDelayMs,
  spGet,
  spGetAll,
  spPost
} from '../src/utils/spRestClient.js';

const WEB = 'https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV';

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

test('odataQuote : double les apostrophes', () => {
  assert.equal(odataQuote("Projet d'essai"), "Projet d''essai");
  assert.equal(odataQuote(null), '');
});

test('buildQuery : encode les paramètres OData et ignore les vides', () => {
  assert.equal(buildQuery({}), '');
  // encodeURIComponent laisse l'apostrophe telle quelle : SharePoint l'accepte dans un littéral OData.
  assert.equal(
    buildQuery({ select: 'Id,Title', filter: "ProjectId eq 'a b'", top: 5000 }),
    "?$select=Id%2CTitle&$filter=ProjectId%20eq%20'a%20b'&$top=5000"
  );
});

test('buildUrl : préfixe les chemins relatifs, laisse les URL absolues', async () => {
  await withFetch(
    () => makeResponse(200, {}),
    async () => {
      assert.equal(buildUrl('/_api/web'), `${WEB}/_api/web`);
      assert.equal(buildUrl('https://autre/x'), 'https://autre/x');
    }
  );
});

test('spGet : renvoie le JSON analysé', async () => {
  await withFetch(
    () => makeResponse(200, { value: [{ Id: 1 }] }),
    async (calls) => {
      const payload = await spGet('/_api/web/lists');
      assert.deepEqual(payload, { value: [{ Id: 1 }] });
      assert.equal(calls[0].url, `${WEB}/_api/web/lists`);
      assert.equal(calls[0].init.credentials, 'same-origin');
      assert.equal(calls[0].init.headers.Accept, 'application/json;odata=nometadata');
    }
  );
});

test('spGet : une page de connexion HTML lève SessionExpiredError', async () => {
  await withFetch(
    () => makeResponse(200, '<html><body>Sign in</body></html>', { 'content-type': 'text/html' }),
    async () => {
      await assert.rejects(() => spGet('/_api/web'), { name: 'SessionExpiredError' });
    }
  );
});

test('spGet : un 401 lève SessionExpiredError', async () => {
  await withFetch(
    () => makeResponse(401, ''),
    async () => {
      await assert.rejects(() => spGet('/_api/web'), { name: 'SessionExpiredError' });
    }
  );
});

test('écriture : obtient un digest puis le réutilise', async () => {
  await withFetch(
    (url) => (url.endsWith('/_api/contextinfo') ? digestResponse() : makeResponse(201, { Id: 7 })),
    async (calls) => {
      await spPost('/_api/web/lists/getbytitle(\'CN_Projects\')/items', { Title: 'A' });
      await spPost('/_api/web/lists/getbytitle(\'CN_Projects\')/items', { Title: 'B' });

      const digestCalls = calls.filter((c) => c.url.endsWith('/_api/contextinfo'));
      assert.equal(digestCalls.length, 1, 'le digest doit être mis en cache');

      const write = calls.find((c) => c.url.includes('/items'));
      assert.equal(write.init.headers['X-RequestDigest'], 'DIGEST-1');
      assert.equal(write.init.method, 'POST');
      assert.equal(JSON.parse(write.init.body).Title, 'A');
    }
  );
});

test('écriture : un 403 renouvelle le digest et rejoue une fois', async () => {
  let writeAttempts = 0;
  await withFetch(
    (url) => {
      if (url.endsWith('/_api/contextinfo')) {
        return digestResponse();
      }
      writeAttempts += 1;
      return writeAttempts === 1
        ? makeResponse(403, { error: { message: 'The security validation for this page is invalid' } })
        : makeResponse(201, { Id: 9 });
    },
    async (calls) => {
      const created = await spPost('/_api/web/lists/getbytitle(\'X\')/items', { Title: 'A' });
      assert.deepEqual(created, { Id: 9 });
      assert.equal(writeAttempts, 2);
      assert.equal(calls.filter((c) => c.url.endsWith('/_api/contextinfo')).length, 2);
    }
  );
});

test('412 : lève ConflictError', async () => {
  await withFetch(
    (url) =>
      url.endsWith('/_api/contextinfo')
        ? digestResponse()
        : makeResponse(412, { error: { message: 'Precondition Failed' } }),
    async () => {
      await assert.rejects(() => spPost('/_api/web/lists/getbytitle(\'X\')/items', {}), {
        name: 'ConflictError'
      });
    }
  );
});

test('erreur SharePoint : message et statut remontés', async () => {
  await withFetch(
    () => makeResponse(404, { error: { code: '-1, ListNotFound', message: { value: 'Liste absente' } } }),
    async () => {
      await assert.rejects(() => spGet('/_api/web/lists/getbytitle(\'Nope\')'), (error) => {
        assert.equal(error.name, 'SharePointError');
        assert.equal(error.status, 404);
        assert.equal(error.message, 'Liste absente');
        assert.equal(error.code, '-1, ListNotFound');
        return true;
      });
    }
  );
});

test('429 : respecte Retry-After puis rejoue', async () => {
  let attempts = 0;
  await withFetch(
    () => {
      attempts += 1;
      return attempts === 1
        ? makeResponse(429, '', { 'Retry-After': '0' })
        : makeResponse(200, { value: [] });
    },
    async () => {
      const payload = await spGet('/_api/web/lists');
      assert.deepEqual(payload, { value: [] });
      assert.equal(attempts, 2);
    }
  );
});

test('retryDelayMs : Retry-After prioritaire, sinon repli exponentiel', () => {
  const withHeader = (value) => ({ headers: { get: () => value } });
  assert.equal(retryDelayMs(withHeader('4'), 0), 5000);
  assert.equal(retryDelayMs(withHeader(null), 0), 1000);
  assert.equal(retryDelayMs(withHeader(null), 3), 8000);
  assert.equal(retryDelayMs(withHeader('9999'), 0), 30000);
});

test('spGetAll : suit odata.nextLink et concatène les pages', async () => {
  await withFetch(
    (url) =>
      url.includes('page=2')
        ? makeResponse(200, { value: [{ Id: 2 }] })
        : makeResponse(200, {
            value: [{ Id: 1 }],
            'odata.nextLink': `${WEB}/_api/web/lists/items?page=2`
          }),
    async (calls) => {
      const items = await spGetAll('/_api/web/lists/items');
      assert.deepEqual(items, [{ Id: 1 }, { Id: 2 }]);
      assert.equal(calls.length, 2);
    }
  );
});
