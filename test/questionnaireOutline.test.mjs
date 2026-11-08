import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTLINE_STATE_ANSWERED,
  OUTLINE_STATE_MISSED,
  OUTLINE_STATE_UNANSWERED,
  OUTLINE_STATE_UPCOMING,
  countMissedMandatoryQuestions,
  getOutlineQuestionState
} from '../src/utils/questionnaireOutline.js';

const questions = [
  { id: 'q1', required: true },
  { id: 'q2', required: false },
  { id: 'q3', required: true },
  { id: 'q4', required: true }
];

const stateOf = (index, { currentIndex, visited = [], answers = {} }) => getOutlineQuestionState({
  question: questions[index],
  index,
  currentIndex,
  visitedIds: new Set(visited),
  answers
});

test('sommaire : au démarrage, aucune question obligatoire n’est signalée manquante', () => {
  assert.equal(countMissedMandatoryQuestions({ questions, currentIndex: 0, visitedIds: new Set(['q1']), answers: {} }), 0);
  assert.equal(stateOf(0, { currentIndex: 0, visited: ['q1'] }), OUTLINE_STATE_UPCOMING);
  assert.equal(stateOf(2, { currentIndex: 0, visited: ['q1'] }), OUTLINE_STATE_UPCOMING);
});

test('sommaire : une question obligatoire dépassée sans réponse est manquante', () => {
  assert.equal(stateOf(0, { currentIndex: 2 }), OUTLINE_STATE_MISSED);
  assert.equal(stateOf(1, { currentIndex: 2 }), OUTLINE_STATE_UNANSWERED);
  assert.equal(countMissedMandatoryQuestions({ questions, currentIndex: 2, visitedIds: new Set(), answers: {} }), 1);
});

test('sommaire : une question déjà vue reste manquante après un retour en arrière', () => {
  assert.equal(stateOf(3, { currentIndex: 0, visited: ['q1', 'q4'] }), OUTLINE_STATE_MISSED);
});

test('sommaire : une question répondue est répondue, quelle que soit sa position', () => {
  assert.equal(stateOf(3, { currentIndex: 0, answers: { q4: 'oui' } }), OUTLINE_STATE_ANSWERED);
});
