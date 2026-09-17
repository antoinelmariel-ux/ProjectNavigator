import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canQuestionHaveDoubt,
  getOpenQuestionDoubts,
  getQuestionDoubtText,
  getQuestionDoubts,
  hasQuestionDoubt,
  withoutQuestionDoubt,
  withQuestionDoubt
} from '../src/utils/questionDoubts.js';

test('un doute est une note séparée, jamais la réponse elle-même', () => {
  const answers = { audience: 'Grand public' };
  const withDoubt = withQuestionDoubt(answers, 'audience', 'Pas sûr du périmètre');

  assert.equal(withDoubt.audience, 'Grand public');
  assert.equal(hasQuestionDoubt(withDoubt, 'audience'), true);
  assert.equal(getQuestionDoubtText(withDoubt, 'audience'), 'Pas sûr du périmètre');
  assert.equal(hasQuestionDoubt(withDoubt, 'other'), false);
});

test('décocher le doute efface la note entièrement', () => {
  const withDoubt = withQuestionDoubt({}, 'audience', 'Pas sûr');
  const cleared = withoutQuestionDoubt(withDoubt, 'audience');

  assert.equal(hasQuestionDoubt(cleared, 'audience'), false);
  assert.deepEqual(getQuestionDoubts(cleared), {});

  // Sans doute existant, effacer ne change rien : la même référence est renvoyée.
  const untouched = {};
  assert.equal(withoutQuestionDoubt(untouched, 'audience'), untouched);
});

test('le doute n’est proposé que là où l’incertitude reste exploitable', () => {
  assert.equal(canQuestionHaveDoubt({ type: 'choice' }), true);
  assert.equal(canQuestionHaveDoubt({ type: 'number' }), true);
  assert.equal(canQuestionHaveDoubt({ type: 'long_text' }), false);
  assert.equal(canQuestionHaveDoubt({ type: 'text' }), false);
  assert.equal(canQuestionHaveDoubt({ type: 'long_text', allowUnknownAnswer: true }), true);
});

test('getOpenQuestionDoubts ne liste que les doutes rattachés à une question existante', () => {
  const questions = [{ id: 'audience', question: 'Public ?' }];
  let answers = withQuestionDoubt({}, 'audience', 'Pas sûr');
  answers = withQuestionDoubt(answers, 'removed-question', 'Orphelin');

  assert.deepEqual(getOpenQuestionDoubts(answers, questions), [
    { questionId: 'audience', question: questions[0], text: 'Pas sûr' }
  ]);
  assert.deepEqual(getOpenQuestionDoubts({}, questions), []);
});
