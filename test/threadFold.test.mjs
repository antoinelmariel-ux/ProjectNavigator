import test from 'node:test';
import assert from 'node:assert/strict';
import { foldThreadMessages, THREAD_VISIBLE_TAIL } from '../src/utils/threadFold.js';

const messages = (count) => Array.from({ length: count }, (_, index) => ({ id: `reply-${index}` }));
const ids = (list) => list.map((message) => message.id);

test('un fil court reste entier', () => {
  const result = foldThreadMessages(messages(THREAD_VISIBLE_TAIL));
  assert.equal(result.hiddenCount, 0);
  assert.equal(result.visible.length, THREAD_VISIBLE_TAIL);
});

test('un fil long ne montre que les derniers messages', () => {
  const result = foldThreadMessages(messages(8));
  assert.equal(result.hiddenCount, 5);
  assert.deepEqual(ids(result.visible), ['reply-5', 'reply-6', 'reply-7']);
});

test('tous les messages nouveaux restent visibles, même au-delà des derniers', () => {
  const result = foldThreadMessages(messages(8), { isNewMessage: (message) => message.id >= 'reply-3' });
  assert.equal(result.hiddenCount, 3);
  assert.equal(ids(result.visible)[0], 'reply-3');
});

test('déplié, le fil est entier ; l’avis d’un comité reste épinglé en tête', () => {
  const list = [{ id: 'comment-committee' }, ...messages(6)];
  const folded = foldThreadMessages(list);
  assert.deepEqual(ids(folded.pinned), ['comment-committee']);
  assert.equal(folded.hiddenCount, 3);
  const expanded = foldThreadMessages(list, { isExpanded: true });
  assert.equal(expanded.hiddenCount, 0);
  assert.equal(expanded.visible.length, 6);
});
