import test from 'node:test';
import assert from 'node:assert/strict';
import { SharePointCommitteeSessionsProvider } from '../src/utils/committeeSessionsProvider.js';
import { applySessionAction } from '../src/utils/committeeSessions.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';

const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json;odata=nometadata' : null) },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? ''))
});

const withFetch = async (handler, fn) => {
  const previous = globalThis.window;
  globalThis.window = {
    location: {
      origin: 'https://lfb1.sharepoint.com',
      pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
      protocol: 'https:',
      hostname: 'lfb1.sharepoint.com'
    },
    fetch: async (url, init = {}) => handler(url, init)
  };
  resetSpRestClient();
  try {
    return await fn();
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
  }
};

const row = (agenda, version) => ({
  Id: 7,
  'odata.etag': `"${version}"`,
  SessionId: 's1',
  CommitteeId: 'c1',
  StartAt: '2026-12-10T13:00:00.000Z',
  DurationMinutes: 60,
  Status: 'published',
  AgendaJson: JSON.stringify(agenda),
  AttendanceJson: '{}',
  RowVersion: version
});

test('mutateSession : un conflit d’écriture rejoue l’inscription sur la séance relue, et la refuse si elle est devenue pleine', async () => {
  const reads = [
    row([{ id: 'x', projectId: 'x', minutes: 20 }], 1),
    row([{ id: 'x', projectId: 'x', minutes: 20 }, { id: 'y', projectId: 'y', minutes: 30 }], 2)
  ];
  let readIndex = 0;
  let merges = 0;

  const result = await withFetch(
    (url, init) => {
      if (url.endsWith('/_api/contextinfo')) {
        return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
      }
      if (init.headers && init.headers['X-HTTP-Method'] === 'MERGE') {
        merges += 1;
        return makeResponse(412, { error: { message: { value: 'etag' } } });
      }
      const current = reads[Math.min(readIndex, reads.length - 1)];
      readIndex += 1;
      return makeResponse(200, { value: [current] });
    },
    () => new SharePointCommitteeSessionsProvider().mutateSession('s1', (session) => applySessionAction(
      session,
      { type: 'book', projectId: 'p1', passageId: 'p-p1' },
      { actorEmail: 'owner@lfb.fr', now: new Date('2026-11-02T09:00:00Z'), defaultPassageMinutes: 20 }
    ))
  );

  assert.equal(merges, 1);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'full');
});
