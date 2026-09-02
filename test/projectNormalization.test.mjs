import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProjectEntry,
  normalizeProjectsCollection
} from '../src/utils/projectNormalization.js';

test('normalizeProjectEntry : entrée vide → objet valide avec valeurs par défaut', () => {
  const entry = normalizeProjectEntry({});
  assert.equal(entry.status, 'submitted');
  assert.equal(typeof entry.totalQuestions, 'number');
  assert.equal(typeof entry.answeredQuestions, 'number');
  assert.ok(entry.answeredQuestions <= (entry.totalQuestions || entry.answeredQuestions));
});

test('normalizeProjectEntry : conserve le statut fourni', () => {
  assert.equal(normalizeProjectEntry({ status: 'draft' }).status, 'draft');
});

test('normalizeProjectEntry : answeredQuestions ne dépasse jamais totalQuestions', () => {
  const entry = normalizeProjectEntry({ answeredQuestions: 999, totalQuestions: 5 });
  assert.ok(entry.answeredQuestions <= entry.totalQuestions);
});

test('normalizeProjectEntry : lastQuestionIndex borné dans [0, total-1]', () => {
  const entry = normalizeProjectEntry({ totalQuestions: 3, lastQuestionIndex: 42 });
  assert.equal(entry.lastQuestionIndex, 2);
  const negative = normalizeProjectEntry({ totalQuestions: 3, lastQuestionIndex: -5 });
  assert.equal(negative.lastQuestionIndex, 0);
});

test('normalizeProjectsCollection : null si l’entrée n’est pas un tableau', () => {
  assert.equal(normalizeProjectsCollection(null), null);
  assert.equal(normalizeProjectsCollection('x'), null);
});

test('normalizeProjectsCollection : normalise chaque élément', () => {
  const collection = normalizeProjectsCollection([{}, { status: 'draft' }]);
  assert.equal(collection.length, 2);
  assert.equal(collection[1].status, 'draft');
});
