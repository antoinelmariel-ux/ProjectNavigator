import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOCUS_MESSAGE_OPINION,
  appendNotificationFocus,
  buildComplianceChangeMessage,
  combineComplianceChangeMessages,
  describeComplianceEntryChange,
  getNotificationFocusView,
  normalizeNotificationFocus,
  readNotificationFocus
} from '../src/utils/notificationLinks.js';

const BASE_URL = 'https://lfb1.sharepoint.com/sites/PN/SitePages/App.aspx?projectId=p-1&view=synthesis';
const STATUS_LABELS = { validated: 'Validated', rejected: 'Rejected' };

test('un lien porte la cible et se relit à l’identique', () => {
  const url = appendNotificationFocus(BASE_URL, { kind: 'team', id: 'legal:fr', message: 'reply-1' });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('projectId'), 'p-1');
  assert.equal(parsed.searchParams.get('view'), 'synthesis');
  assert.deepEqual(readNotificationFocus(parsed.search), { kind: 'team', id: 'legal:fr', message: 'reply-1' });
});

test('une cible invalide laisse l’URL telle quelle', () => {
  assert.equal(appendNotificationFocus(BASE_URL, { kind: 'project', id: 'x' }), BASE_URL);
  assert.equal(appendNotificationFocus(BASE_URL, { kind: 'team', id: '  ' }), BASE_URL);
  assert.equal(appendNotificationFocus(BASE_URL, null), BASE_URL);
  assert.equal(appendNotificationFocus('', { kind: 'team', id: 't' }), '');
});

test('la relecture ignore les cibles bricolées', () => {
  assert.equal(readNotificationFocus('?focusKind=admin&focusId=x'), null);
  assert.equal(readNotificationFocus('?focusKind=team'), null);
  assert.equal(readNotificationFocus(`?focusKind=team&focusId=${'a'.repeat(300)}`), null);
  assert.deepEqual(readNotificationFocus('?focusKind=note&focusId=n1'), { kind: 'note', id: 'n1' });
});

test('écran ouvert selon la cible', () => {
  assert.equal(getNotificationFocusView({ kind: 'team', id: 't' }), 'synthesis');
  assert.equal(getNotificationFocusView({ kind: 'committee', id: 'c' }), 'synthesis');
  assert.equal(getNotificationFocusView({ kind: 'note', id: 'n' }), 'showcase');
  assert.equal(getNotificationFocusView({ kind: 'x', id: 'n' }), null);
  assert.equal(normalizeNotificationFocus({ kind: 'team', id: 't', message: '' }).message, undefined);
});

test('une réponse ajoutée au fil : son texte, et le lien vers elle', () => {
  const previousEntry = { status: 'validated', comment: 'Avis initial', replies: [{ id: 'r1', message: 'Ancienne' }] };
  const nextEntry = { ...previousEntry, replies: [...previousEntry.replies, { id: 'r2', message: '  Nouvelle réponse  ' }] };
  assert.deepEqual(describeComplianceEntryChange(previousEntry, nextEntry), {
    newReplies: [nextEntry.replies[1]],
    opinionChanged: false
  });
  const result = buildComplianceChangeMessage({ kind: 'team', id: 't1', previousEntry, nextEntry, statusLabels: STATUS_LABELS });
  assert.equal(result.text, 'Nouvelle réponse');
  assert.deepEqual(result.focus, { kind: 'team', id: 't1', message: 'r2' });
});

test('un avis rendu : statut puis commentaire, et le lien vers l’avis', () => {
  const result = buildComplianceChangeMessage({
    kind: 'committee',
    id: 'c1',
    previousEntry: undefined,
    nextEntry: { status: 'rejected', comment: 'Hors charte.' },
    statusLabels: STATUS_LABELS
  });
  assert.equal(result.text, 'Status: Rejected\nHors charte.');
  assert.deepEqual(result.focus, { kind: 'committee', id: 'c1', message: FOCUS_MESSAGE_OPINION });
});

test('un statut changé sans commentaire est repris tel quel', () => {
  const result = buildComplianceChangeMessage({
    kind: 'team',
    id: 't1',
    previousEntry: { status: '' },
    nextEntry: { status: 'validated' },
    statusLabels: STATUS_LABELS
  });
  assert.equal(result.text, 'Status: Validated');
});

test('avis et réponse dans la même écriture : les deux, lien vers l’avis', () => {
  const result = buildComplianceChangeMessage({
    kind: 'team',
    id: 't1',
    previousEntry: { status: '', comment: '' },
    nextEntry: { status: 'validated', comment: 'OK', replies: [{ id: 'r9', message: 'Précision' }] },
    statusLabels: STATUS_LABELS
  });
  assert.equal(result.text, 'Status: Validated\nOK\n\nPrécision');
  assert.equal(result.focus.message, FOCUS_MESSAGE_OPINION);
});

test('plusieurs périmètres : un paragraphe titré par périmètre, lien vers le premier', () => {
  const combined = combineComplianceChangeMessages([
    { text: 'Status: Validated', focus: { kind: 'team', id: 't1', message: 'opinion' }, label: 'Juridique' },
    { text: '', focus: { kind: 'team', id: 't2' }, label: 'Vide' },
    { text: 'Réponse', focus: { kind: 'committee', id: 'c1', message: 'r1' }, label: 'Comité' }
  ]);
  assert.equal(combined.text, 'Juridique\nStatus: Validated\n\nComité\nRéponse');
  assert.deepEqual(combined.focus, { kind: 'team', id: 't1', message: 'opinion' });

  const single = combineComplianceChangeMessages([{ text: 'Seul', focus: null, label: 'X' }]);
  assert.equal(single.text, 'Seul');
  assert.deepEqual(combineComplianceChangeMessages([]), { text: '', focus: null });
});
