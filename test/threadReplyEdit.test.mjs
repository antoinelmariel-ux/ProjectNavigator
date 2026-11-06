import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThreadReplyEdit, canEditThreadReply } from '../src/utils/threadReplyEdit.js';

const REPLIES = [
  { id: 'r1', message: 'Question du porteur', authorEmail: 'owner@lfb.fr', createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 'r2', message: 'Réponse experte', authorEmail: 'Expert@lfb.fr', createdAt: '2026-11-02T10:00:00.000Z' },
  { id: 'r3', message: 'Précision', authorEmail: 'expert@lfb.fr', createdAt: '2026-11-02T11:00:00.000Z' }
];

test('l’auteur peut modifier sa réponse tant que l’autre n’a pas répondu', () => {
  assert.equal(canEditThreadReply(REPLIES, 'r2', 'expert@LFB.fr'), true);
  assert.equal(canEditThreadReply(REPLIES, 'r3', 'expert@lfb.fr'), true);
});

test('une réponse à laquelle quelqu’un d’autre a répondu n’est plus modifiable', () => {
  assert.equal(canEditThreadReply(REPLIES, 'r1', 'owner@lfb.fr'), false);
});

test('on ne modifie jamais la réponse de quelqu’un d’autre', () => {
  assert.equal(canEditThreadReply(REPLIES, 'r3', 'owner@lfb.fr'), false);
  assert.equal(canEditThreadReply(REPLIES, 'r3', ''), false);
  assert.equal(canEditThreadReply(REPLIES, 'inconnu', 'expert@lfb.fr'), false);
});

test('la modification garde id, auteur et date de création et ajoute editedAt', () => {
  const next = applyThreadReplyEdit(REPLIES, 'r3', {
    message: '  Précision corrigée ',
    userEmail: 'expert@lfb.fr',
    now: '2026-11-03T09:00:00.000Z'
  });
  assert.deepEqual(next[2], {
    ...REPLIES[2],
    message: 'Précision corrigée',
    editedAt: '2026-11-03T09:00:00.000Z'
  });
  assert.equal(next[0], REPLIES[0]);
  assert.equal(next[1], REPLIES[1]);
});

test('une modification refusée, vide ou identique ne produit rien', () => {
  assert.equal(applyThreadReplyEdit(REPLIES, 'r1', { message: 'x', userEmail: 'owner@lfb.fr' }), null);
  assert.equal(applyThreadReplyEdit(REPLIES, 'r3', { message: '   ', userEmail: 'expert@lfb.fr' }), null);
  assert.equal(applyThreadReplyEdit(REPLIES, 'r3', { message: 'Précision ', userEmail: 'expert@lfb.fr' }), null);
});

test('un texte vidé reste possible quand la réponse porte une pièce jointe', () => {
  const replies = [{ id: 'r1', message: 'Voir PJ', authorEmail: 'a@lfb.fr', attachments: [{ id: 'f1' }] }];
  const next = applyThreadReplyEdit(replies, 'r1', { message: '', userEmail: 'a@lfb.fr', now: 'T' });
  assert.equal(next[0].message, '');
  assert.equal(next[0].editedAt, 'T');
});
