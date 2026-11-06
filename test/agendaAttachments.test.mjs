import test from 'node:test';
import assert from 'node:assert/strict';
import { applySessionAction, normalizeSession, SESSION_STATUS_CANCELLED } from '../src/utils/committeeSessions.js';
import { buildParticipantAgenda } from '../src/utils/userCommitteePassages.js';
import {
  MAX_AGENDA_ATTACHMENTS,
  getStoredAgendaFilePaths,
  normalizeAgendaAttachments,
  normalizeAgendaLinkUrl
} from '../src/utils/agendaAttachments.js';

const now = new Date('2026-11-02T09:00:00');
const chair = { isChair: true, actorEmail: 'P@lfb.fr', now };
const baseSession = () => normalizeSession({
  id: 's1',
  committeeId: 'c1',
  startAt: new Date('2026-11-10T14:00:00').toISOString(),
  durationMinutes: 120,
  status: 'published',
  agenda: [
    { id: 't1', kind: 'topic', title: 'Point RGPD', presenterEmails: ['speaker@lfb.fr'], minutes: 10 },
    { id: 'p1', projectId: 'proj-1', minutes: 20 }
  ]
});

test('links are http(s) only, a bare host reads as https', () => {
  assert.equal(normalizeAgendaLinkUrl('intranet.lfb.fr/doc'), 'https://intranet.lfb.fr/doc');
  assert.equal(normalizeAgendaLinkUrl('http://x.fr/a'), 'http://x.fr/a');
  assert.equal(normalizeAgendaLinkUrl('javascript:alert(1)'), '');
  assert.equal(normalizeAgendaLinkUrl('file:///c:/a.pdf'), '');
  assert.equal(normalizeAgendaLinkUrl('  '), '');
});

test('normalization drops unsafe or duplicate entries and caps the list', () => {
  const list = normalizeAgendaAttachments([
    { id: 'a', type: 'link', url: 'https://x.fr/rapport.pdf' },
    { id: 'a', type: 'link', url: 'https://x.fr/other' },
    { id: 'b', type: 'file', url: 'javascript:alert(1)', name: 'evil' },
    { id: 'c', type: 'file', url: 'data:application/pdf;base64,AAA', name: 'local.pdf', size: 3 },
    null
  ]);
  assert.deepEqual(list.map((entry) => entry.id), ['a', 'c']);
  assert.equal(list[0].name, 'rapport.pdf');
  assert.equal(list[1].storage, 'inline');
  const many = Array.from({ length: MAX_AGENDA_ATTACHMENTS + 5 }, (_, index) => ({ id: `l${index}`, type: 'link', url: `https://x.fr/${index}` }));
  assert.equal(normalizeAgendaAttachments(many).length, MAX_AGENDA_ATTACHMENTS);
});

test('only a chair attaches, only to a topic, never on a cancelled session', () => {
  const session = baseSession();
  const link = { id: 'l1', type: 'link', url: 'https://x.fr/note', name: 'Note' };
  assert.equal(applySessionAction(session, { type: 'addPassageAttachment', passageId: 't1', attachment: link }, { now }).error, 'forbidden');
  assert.equal(applySessionAction(session, { type: 'addPassageAttachment', passageId: 'p1', attachment: link }, chair).error, 'notFound');
  assert.equal(applySessionAction(session, { type: 'addPassageAttachment', passageId: 't1', attachment: { type: 'link', url: 'javascript:x' } }, chair).error, 'invalid');
  assert.equal(
    applySessionAction({ ...session, status: SESSION_STATUS_CANCELLED }, { type: 'addPassageAttachment', passageId: 't1', attachment: link }, chair).error,
    'cancelled'
  );

  const added = applySessionAction(session, { type: 'addPassageAttachment', passageId: 't1', attachment: link }, chair);
  assert.equal(added.ok, true);
  const topic = added.session.agenda.find((passage) => passage.id === 't1');
  assert.equal(topic.attachments.length, 1);
  assert.equal(topic.attachments[0].addedBy, 'p@lfb.fr');
  assert.equal(topic.attachments[0].addedAt, now.toISOString());
  assert.equal(added.session.agenda.find((passage) => passage.id === 'p1').attachments.length, 0);

  assert.equal(applySessionAction(added.session, { type: 'removePassageAttachment', passageId: 't1', attachmentId: 'l1' }, { now }).error, 'forbidden');
  const removed = applySessionAction(added.session, { type: 'removePassageAttachment', passageId: 't1', attachmentId: 'l1' }, chair);
  assert.equal(removed.ok, true);
  assert.equal(removed.removed.id, 'l1');
  assert.equal(removed.session.agenda.find((passage) => passage.id === 't1').attachments.length, 0);
  assert.equal(applySessionAction(removed.session, { type: 'removePassageAttachment', passageId: 't1', attachmentId: 'l1' }, chair).error, 'notFound');
});

test('attachments survive a re-read of the session row and are refused past the cap', () => {
  let session = baseSession();
  for (let index = 0; index < MAX_AGENDA_ATTACHMENTS; index += 1) {
    session = applySessionAction(session, {
      type: 'addPassageAttachment',
      passageId: 't1',
      attachment: { id: `l${index}`, type: 'link', url: `https://x.fr/${index}` }
    }, chair).session;
  }
  const reread = normalizeSession(JSON.parse(JSON.stringify(session)));
  assert.equal(reread.agenda[0].attachments.length, MAX_AGENDA_ATTACHMENTS);
  assert.equal(applySessionAction(reread, {
    type: 'addPassageAttachment',
    passageId: 't1',
    attachment: { type: 'link', url: 'https://x.fr/extra' }
  }, chair).error, 'tooManyAttachments');
});

test('a presenter reads the attachments of their own topic in the participant agenda', () => {
  const session = applySessionAction(baseSession(), {
    type: 'addPassageAttachment',
    passageId: 't1',
    attachment: { id: 'f1', type: 'file', url: 'https://tenant.sharepoint.com/sites/cn/CN-Documents/a.pdf', path: '/sites/cn/CN-Documents/a.pdf', storage: 'sharepoint', name: 'a.pdf' }
  }, chair).session;
  const agenda = buildParticipantAgenda({ session, email: 'speaker@lfb.fr', now });
  const mine = agenda.slots.find((slot) => slot.entry);
  assert.equal(mine.entry.passage.attachments[0].name, 'a.pdf');
  assert.deepEqual(getStoredAgendaFilePaths(mine.entry.passage.attachments), ['/sites/cn/CN-Documents/a.pdf']);
  assert.equal(buildParticipantAgenda({ session, email: 'someone@lfb.fr', now }), null);
});
