import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInvitationId,
  computeSessionInvitations,
  getInvitationFingerprint,
  getInvitationSyncState
} from '../src/utils/committeeInvitations.js';
import { applySessionAction } from '../src/utils/committeeSessions.js';
import { SharePointCommitteeInvitationsProvider } from '../src/utils/committeeInvitationsProvider.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';

const now = new Date('2026-11-02T09:00:00Z');
const committee = { id: 'c1', name: 'Comité Éthique', presidentEmail: 'p@lfb.fr' };
const projectsById = new Map([
  ['p1', { id: 'p1', projectName: 'Projet A', ownerEmail: 'Owner@lfb.fr', sharedWith: ['co@lfb.fr'] }],
  ['p2', { id: 'p2', projectName: 'Projet <B>', ownerEmail: 'b@lfb.fr' }]
]);
const session = (overrides = {}) => ({
  id: 's1',
  committeeId: 'c1',
  startAt: '2026-11-10T13:00:00.000Z',
  durationMinutes: 60,
  status: 'published',
  location: 'https://teams.microsoft.com/l/meetup-join/abc',
  agenda: [
    { id: 'x1', projectId: 'p1', minutes: 20, guests: ['guest@lfb.fr', 'owner@lfb.fr'] },
    { id: 'x2', projectId: 'p2', minutes: 20 }
  ],
  ...overrides
});
const compute = (before, after) => computeSessionInvitations({
  before,
  after,
  committee,
  projectsById,
  buildProjectUrl: (id) => `https://app/?projectId=${id}`,
  now
});

test('une invitation par passage, sur toute la séance, au porteur, aux co-porteurs et aux invités', () => {
  const [first, second] = compute(null, session());
  assert.equal(first.id, buildInvitationId('s1', 'x1'));
  assert.equal(first.status, 'active');
  assert.deepEqual(first.attendees, ['owner@lfb.fr', 'co@lfb.fr', 'guest@lfb.fr']);
  assert.equal(first.startAt, '2026-11-10T13:00:00.000Z');
  assert.equal(first.endAt, '2026-11-10T14:00:00.000Z');
  assert.equal(first.subject, '[Comité Éthique] Presentation of Projet A');
  assert.match(first.bodyHtml, /keep the whole session free/);
  assert.match(first.bodyHtml, /https:\/\/teams\.microsoft\.com/);
  assert.match(second.bodyHtml, /Projet &lt;B&gt;/);
});

test('réordonner ou changer une durée ne change aucune invitation', () => {
  const before = session();
  const reordered = applySessionAction(before, { type: 'reorder', passageId: 'x2', direction: 'up' }, { isChair: true, now }).session;
  const resized = applySessionAction(reordered, { type: 'setMinutes', passageId: 'x1', minutes: 30 }, { isChair: true, now }).session;
  const fingerprints = (value) => compute(null, value).map(getInvitationFingerprint).sort();
  assert.deepEqual(fingerprints(resized), fingerprints(before));
});

test('une désinscription annule l’invitation du passage, et seulement celle-là', () => {
  const before = session();
  const after = applySessionAction(before, { type: 'unbook', passageId: 'x2' }, { now }).session;
  const changes = compute(before, after);
  assert.deepEqual(changes.map((entry) => [entry.passageId, entry.status]), [['x1', 'active'], ['x2', 'cancelled']]);
});

test('une séance annulée ou repassée en brouillon annule toutes ses invitations ; une séance passée n’en touche aucune', () => {
  const before = session();
  const cancelled = applySessionAction(before, { type: 'cancel' }, { isChair: true, now }).session;
  assert.deepEqual(compute(before, cancelled).map((entry) => entry.status), ['cancelled', 'cancelled']);
  assert.deepEqual(compute(null, session({ status: 'draft' })).map((entry) => entry.status), ['cancelled', 'cancelled']);
  assert.deepEqual(compute(null, session({ startAt: '2026-10-01T13:00:00.000Z' })), []);
});

test('déplacer la séance change le créneau de chaque invitation', () => {
  const before = session();
  const moved = applySessionAction(before, { type: 'update', patch: { startAt: '2026-11-12T13:00:00.000Z' } }, { isChair: true, now }).session;
  const changes = compute(before, moved);
  assert.deepEqual(changes.map((entry) => entry.startAt), ['2026-11-12T13:00:00.000Z', '2026-11-12T13:00:00.000Z']);
});

test('état de synchronisation : en attente tant que le flux n’a pas traité la dernière révision', () => {
  assert.equal(getInvitationSyncState({ revision: 2, processedRevision: 1 }), 'pending');
  assert.equal(getInvitationSyncState({ revision: 2, processedRevision: 2 }), 'done');
  assert.equal(getInvitationSyncState({ revision: 2, processedRevision: 2, syncState: 'error' }), 'error');
});

const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json;odata=nometadata' : null) },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? ''))
});

const withFetch = async (handler, fn) => {
  const previous = globalThis.window;
  globalThis.window = {
    location: { origin: 'https://lfb1.sharepoint.com', pathname: '/sites/PN/CN-App/index.aspx', protocol: 'https:', hostname: 'lfb1.sharepoint.com' },
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

test('syncInvitation : n’écrit que ce qui a changé, et incrémente la révision qui déclenche le flux', async () => {
  const [invitation] = compute(null, session());
  const existingRow = {
    Id: 4,
    'odata.etag': '"3"',
    InvitationId: invitation.id,
    Status: 'active',
    Subject: invitation.subject,
    BodyHtml: invitation.bodyHtml,
    StartAt: invitation.startAt,
    EndAt: invitation.endAt,
    Location: invitation.location,
    Attendees: invitation.attendees.join(';'),
    Revision: 2,
    ProcessedRevision: 2
  };
  const writes = [];
  const handler = (row) => (url, init) => {
    if (url.endsWith('/_api/contextinfo')) {
      return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
    }
    if (init.method === 'POST') {
      writes.push({ merge: init.headers?.['X-HTTP-Method'] === 'MERGE', body: JSON.parse(init.body) });
      return makeResponse(init.headers?.['X-HTTP-Method'] === 'MERGE' ? 204 : 201, { Id: 9 });
    }
    return makeResponse(200, { value: row ? [row] : [] });
  };

  const unchanged = await withFetch(handler(existingRow), () => new SharePointCommitteeInvitationsProvider().syncInvitation(invitation));
  assert.equal(unchanged.written, false);
  assert.equal(writes.length, 0);

  const moved = { ...invitation, startAt: '2026-11-12T13:00:00.000Z', endAt: '2026-11-12T14:00:00.000Z' };
  const result = await withFetch(handler(existingRow), () => new SharePointCommitteeInvitationsProvider().syncInvitation(moved));
  assert.equal(result.written, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].merge, true);
  assert.equal(writes[0].body.Revision, 3);
  assert.equal(writes[0].body.StartAt, '2026-11-12T13:00:00.000Z');
  assert.equal('OutlookEventId' in writes[0].body, false);
  assert.equal('ProcessedRevision' in writes[0].body, false);

  writes.length = 0;
  const neverCreated = await withFetch(handler(null), () => new SharePointCommitteeInvitationsProvider().syncInvitation({ ...invitation, status: 'cancelled' }));
  assert.equal(neverCreated.written, false);
  assert.equal(writes.length, 0);

  const created = await withFetch(handler(null), () => new SharePointCommitteeInvitationsProvider().syncInvitation(invitation));
  assert.equal(created.written, true);
  assert.equal(writes[0].body.Revision, 1);
  assert.equal(writes[0].body.ProcessedRevision, 0);
  assert.equal(writes[0].body.Attendees, 'owner@lfb.fr;co@lfb.fr;guest@lfb.fr');
});

test('un passage dont le projet est introuvable n’est ni invité ni annulé', () => {
  const before = session({ agenda: [...session().agenda, { id: 'x3', projectId: 'unknown', minutes: 20 }] });
  const after = applySessionAction(before, { type: 'setGuests', passageId: 'x1', guests: ['new@lfb.fr'] }, { now }).session;
  assert.deepEqual(compute(before, after).map((entry) => entry.passageId), ['x1', 'x2']);
});

test('un sujet hors projet invite ses intervenants, et seulement s’il en a', () => {
  const before = session();
  const withoutPresenter = applySessionAction(before, { type: 'addTopic', passageId: 't1', title: 'Point RGPD', minutes: 10 }, { isChair: true, now }).session;
  assert.deepEqual(compute(before, withoutPresenter).map((entry) => entry.passageId), ['x1', 'x2']);

  const withPresenter = applySessionAction(withoutPresenter, {
    type: 'updateTopic',
    passageId: 't1',
    patch: { presenterEmails: ['DPO@lfb.fr'] }
  }, { isChair: true, now }).session;
  const topicInvitation = compute(withoutPresenter, withPresenter).find((entry) => entry.passageId === 't1');
  assert.equal(topicInvitation.status, 'active');
  assert.deepEqual(topicInvitation.attendees, ['dpo@lfb.fr']);
  assert.equal(topicInvitation.subject, '[Comité Éthique] Agenda item: Point RGPD');
  assert.equal(topicInvitation.startAt, '2026-11-10T13:00:00.000Z');
  assert.equal(topicInvitation.projectId, '');

  const presenterRemoved = applySessionAction(withPresenter, { type: 'updateTopic', passageId: 't1', patch: { presenterEmails: [] } }, { isChair: true, now }).session;
  assert.equal(compute(withPresenter, presenterRemoved).find((entry) => entry.passageId === 't1').status, 'cancelled');

  const topicRemoved = applySessionAction(withPresenter, { type: 'unbook', passageId: 't1' }, { isChair: true, now }).session;
  assert.equal(compute(withPresenter, topicRemoved).find((entry) => entry.passageId === 't1').status, 'cancelled');
});
