import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTION_THREADS_KEY,
  addQuestionThread,
  countUnresolvedThreads,
  getQuestionThreads,
  getThreadsForQuestion,
  getThreadsForTeam,
  isThreadAwaitingAnswer,
  normalizeQuestionThreads,
  withQuestionThread,
  withThreadReply,
  withThreadResolution
} from '../src/utils/questionThreads.js';

const ask = (answers, overrides = {}) => {
  const thread = addQuestionThread(answers, {
    questionId: 'q3',
    teamId: 'dpo',
    message: 'Faut-il recueillir un consentement ?',
    authorEmail: 'porteur@lfb.fr',
    authorName: 'Porteur',
    at: '2026-05-01T09:00:00.000Z',
    ...overrides
  });
  return { thread, answers: withQuestionThread(answers, thread) };
};

test('une question ancrée porte la question du formulaire et l’équipe visée', () => {
  const { thread, answers } = ask({});

  assert.equal(thread.questionId, 'q3');
  assert.equal(thread.teamId, 'dpo');
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.messages[0].authorEmail, 'porteur@lfb.fr');
  assert.deepEqual(getThreadsForQuestion(answers, 'q3').map((entry) => entry.id), [thread.id]);
  assert.deepEqual(getThreadsForQuestion(answers, 'q9'), []);
  assert.deepEqual(getThreadsForTeam(answers, 'dpo').map((entry) => entry.id), [thread.id]);
});

test('une question vide n’est pas une question', () => {
  assert.equal(addQuestionThread({}, { questionId: 'q3', teamId: 'dpo', message: '   ' }), null);
  assert.equal(addQuestionThread({}, { questionId: '', teamId: 'dpo', message: 'Bonjour' }), null);
  assert.equal(addQuestionThread({}, { questionId: 'q3', teamId: '', message: 'Bonjour' }), null);
  // Rien à ajouter ne modifie rien.
  assert.deepEqual(withQuestionThread({ a: 1 }, null), { a: 1 });
});

test('une question reste « en attente » jusqu’à la première réponse', () => {
  const { thread, answers } = ask({});
  assert.equal(isThreadAwaitingAnswer(getQuestionThreads(answers)[0]), true);
  assert.equal(countUnresolvedThreads(answers), 1);

  const answered = withThreadReply(answers, thread.id, {
    message: 'Oui, via le formulaire type.',
    authorEmail: 'dpo@lfb.fr',
    at: '2026-05-02T09:00:00.000Z'
  });

  const [updated] = getQuestionThreads(answered);
  assert.equal(updated.messages.length, 2);
  assert.equal(isThreadAwaitingAnswer(updated), false);
  // Répondue n'est pas réglée : c'est le porteur qui décide que la réponse a suffi.
  assert.equal(countUnresolvedThreads(answered), 1);

  const resolved = withThreadResolution(answered, thread.id, {
    resolved: true,
    by: 'porteur@lfb.fr',
    at: '2026-05-03T09:00:00.000Z'
  });
  assert.equal(countUnresolvedThreads(resolved), 0);
  assert.equal(getQuestionThreads(resolved)[0].resolvedBy, 'porteur@lfb.fr');
  assert.equal(isThreadAwaitingAnswer(getQuestionThreads(resolved)[0]), false);

  // Et se rouvre si la réponse ne suffisait finalement pas.
  const reopened = withThreadResolution(resolved, thread.id, { resolved: false });
  assert.equal(countUnresolvedThreads(reopened), 1);
});

test('une réponse vide ou sur un fil inconnu ne touche à rien', () => {
  const { thread, answers } = ask({});
  assert.deepEqual(withThreadReply(answers, thread.id, { message: '  ' }), answers);
  assert.deepEqual(withThreadReply(answers, 'inconnu', { message: 'Bonjour' }), answers);
  assert.deepEqual(withThreadResolution(answers, 'inconnu', { resolved: true }), answers);
});

test('plusieurs questions coexistent, et le compte se filtre', () => {
  const first = ask({});
  const second = ask(first.answers, { questionId: 'q14', teamId: 'controle_pub', message: 'Quel visa faut-il ?' });

  assert.equal(getQuestionThreads(second.answers).length, 2);
  assert.equal(countUnresolvedThreads(second.answers), 2);
  assert.equal(countUnresolvedThreads(second.answers, (thread) => thread.teamId === 'dpo'), 1);
  assert.equal(countUnresolvedThreads(second.answers, (thread) => thread.questionId === 'q14'), 1);
  assert.equal(QUESTION_THREADS_KEY in second.answers, true);
});

test('les fils invalides sont ignorés plutôt que de casser l’affichage', () => {
  assert.deepEqual(normalizeQuestionThreads(undefined), []);
  assert.deepEqual(normalizeQuestionThreads('nope'), []);
  assert.deepEqual(normalizeQuestionThreads([{ id: 'x' }, { questionId: 'q', teamId: 't' }]), []);

  const [kept] = normalizeQuestionThreads([
    { id: 'x', questionId: 'q3', teamId: 'dpo', messages: [{ message: 'Bonjour' }, { message: '   ' }] }
  ]);
  assert.equal(kept.messages.length, 1);
  assert.equal(kept.messages[0].id, 'message-0');
});
