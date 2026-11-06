import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_GROUPED_MESSAGES,
  MAX_GROUPED_TEXT_LENGTH,
  NOTIFICATION_FLOW_DELAY_MINUTES,
  NOTIFICATION_GROUP_WINDOW_MS,
  appendGroupedMessage,
  buildNotificationGroupKey,
  canJoinNotificationGroup
} from '../src/utils/notificationGrouping.js';
import { NOTIFICATION_TYPES, buildNotification } from '../src/utils/notificationTemplates.js';

const base = {
  type: NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_OWNER,
  projectId: 'p-1',
  target: 'team:legal',
  to: ['porteur@lfb.fr'],
  cc: ['co@lfb.fr']
};

test('même fil, mêmes destinataires : même clé, quel que soit l’ordre ou la casse des adresses', () => {
  const key = buildNotificationGroupKey(base);
  assert.match(key, /^grp-[0-9a-f]{16}$/);
  assert.equal(buildNotificationGroupKey({ ...base, to: ['Porteur@LFB.fr'] }), key);
  assert.equal(
    buildNotificationGroupKey({ ...base, to: ['b@lfb.fr', 'a@lfb.fr'] }),
    buildNotificationGroupKey({ ...base, to: ['a@lfb.fr', 'b@lfb.fr'] })
  );
});

test('autre type, autre projet, autre fil ou autres destinataires : autre clé', () => {
  const key = buildNotificationGroupKey(base);
  assert.notEqual(buildNotificationGroupKey({ ...base, type: NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_TEAM }), key);
  assert.notEqual(buildNotificationGroupKey({ ...base, projectId: 'p-2' }), key);
  assert.notEqual(buildNotificationGroupKey({ ...base, target: 'committee:legal' }), key);
  assert.notEqual(buildNotificationGroupKey({ ...base, to: ['autre@lfb.fr'] }), key);
  assert.notEqual(buildNotificationGroupKey({ ...base, cc: [] }), key);
});

test('la fenêtre de regroupement laisse une minute de marge au flux', () => {
  assert.equal(NOTIFICATION_GROUP_WINDOW_MS, (NOTIFICATION_FLOW_DELAY_MINUTES - 1) * 60 * 1000);
  const now = Date.parse('2026-11-06T10:10:00Z');
  const message = { text: 'Encore une précision' };
  assert.equal(canJoinNotificationGroup({ createdAt: '2026-11-06T10:07:00Z', messages: [], message, now }), true);
  assert.equal(canJoinNotificationGroup({ createdAt: '2026-11-06T10:05:30Z', messages: [], message, now }), false);
  assert.equal(canJoinNotificationGroup({ createdAt: 'pas une date', messages: [], message, now }), false);
});

test('une ligne trop chargée n’accepte plus de message : le suivant en ouvre une autre', () => {
  const now = Date.parse('2026-11-06T10:01:00Z');
  const createdAt = '2026-11-06T10:00:00Z';
  const full = Array.from({ length: MAX_GROUPED_MESSAGES }, (_, index) => ({ id: `m${index}`, text: 'x' }));
  assert.equal(canJoinNotificationGroup({ createdAt, messages: full, message: { text: 'y' }, now }), false);
  const long = [{ id: 'm1', text: 'x'.repeat(MAX_GROUPED_TEXT_LENGTH - 5) }];
  assert.equal(canJoinNotificationGroup({ createdAt, messages: long, message: { text: 'y'.repeat(10) }, now }), false);
  assert.equal(canJoinNotificationGroup({ createdAt, messages: long, message: { text: 'y' }, now }), true);
});

test('un message déjà présent n’est pas recopié', () => {
  const first = { id: 'm1', text: 'Un', actorName: 'A' };
  const messages = appendGroupedMessage([], first);
  assert.equal(appendGroupedMessage(messages, first).length, 1);
  assert.deepEqual(appendGroupedMessage(messages, { id: 'm2', text: 'Deux' }).map((entry) => entry.text), ['Un', 'Deux']);
});

test('mail regroupé : tous les messages dans l’ordre, avec auteur et heure, lien vers le premier', () => {
  const { subject, body } = buildNotification({
    type: NOTIFICATION_TYPES.SYNTHESIS_COMMENT_REPLY,
    projectName: 'Campagne',
    actorName: 'Laure',
    actorEmail: 'laure@lfb.fr',
    appUrl: 'https://x/app?focusMessage=r1',
    messages: [
      { actorName: 'Laure', actorEmail: 'laure@lfb.fr', text: 'Premier', at: '2026-11-06T10:00:00Z' },
      { actorName: 'Laure', actorEmail: 'laure@lfb.fr', text: 'Deuxième', at: '2026-11-06T10:02:00Z' },
      { actorName: 'Paul', actorEmail: 'paul@lfb.fr', text: 'Troisième', at: '2026-11-06T10:03:00Z' }
    ]
  });
  assert.match(subject, /\(3 messages\)$/);
  assert.ok(body.includes('3 new messages'));
  const positions = ['Premier', 'Deuxième', 'Troisième', 'Do not reply to this email.', 'Hello,'].map((text) => body.indexOf(text));
  positions.forEach((position) => assert.ok(position > -1));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'dans l’ordre, avant l’avertissement');
  assert.ok(body.includes('focusMessage=r1'));
  assert.ok(body.includes('laure@lfb.fr, paul@lfb.fr'), 'tous les auteurs dans le tableau');
});

test('un seul message : le mail est exactement celui d’avant', () => {
  const input = {
    type: NOTIFICATION_TYPES.SHOWCASE_COMMENT,
    projectName: 'Campagne',
    actorName: 'Laure',
    excerpt: 'Un post-it',
    occurredAt: '2026-11-06T10:00:00Z'
  };
  assert.deepEqual(
    buildNotification({ ...input, messages: [{ actorName: 'Laure', text: 'Un post-it', at: '2026-11-06T10:00:00Z' }] }),
    buildNotification(input)
  );
});
