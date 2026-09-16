import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBMISSION_KIND_ANSWER_KEY,
  SUBMISSION_KIND_FINAL,
  SUBMISSION_KIND_PRELIMINARY,
  getSubmissionKind,
  isPreliminarySubmission,
  isProjectOpenForEditing,
  normalizeSubmissionKind,
  withSubmissionKind
} from '../src/utils/submissionKind.js';

test('une soumission antérieure à la fonctionnalité est une soumission finale', () => {
  assert.equal(normalizeSubmissionKind(undefined), SUBMISSION_KIND_FINAL);
  assert.equal(normalizeSubmissionKind('nawak'), SUBMISSION_KIND_FINAL);
  assert.equal(getSubmissionKind({ status: 'submitted', answers: {} }), SUBMISSION_KIND_FINAL);
  assert.equal(isPreliminarySubmission({ status: 'submitted', answers: {} }), false);
});

test('le type de soumission voyage dans les réponses du projet', () => {
  const answers = withSubmissionKind({ a: 1 }, SUBMISSION_KIND_PRELIMINARY);
  assert.equal(answers[SUBMISSION_KIND_ANSWER_KEY], SUBMISSION_KIND_PRELIMINARY);
  assert.equal(answers.a, 1);
  assert.equal(isPreliminarySubmission({ status: 'submitted', answers }), true);
  // Un brouillon n'est pas une soumission, quel que soit le contenu des réponses.
  assert.equal(isPreliminarySubmission({ status: 'draft', answers }), false);
});

test('un projet envoyé pour avis préliminaire reste modifiable, une validation le fige', () => {
  const preliminaryAnswers = withSubmissionKind({}, SUBMISSION_KIND_PRELIMINARY);
  const finalAnswers = withSubmissionKind({}, SUBMISSION_KIND_FINAL);

  assert.equal(isProjectOpenForEditing({ status: 'draft' }), true);
  assert.equal(isProjectOpenForEditing({ status: 'cancelled' }), true);
  assert.equal(isProjectOpenForEditing({ status: 'submitted', answers: preliminaryAnswers }), true);
  assert.equal(isProjectOpenForEditing({ status: 'submitted', answers: finalAnswers }), false);
  assert.equal(isProjectOpenForEditing({ status: 'submitted', answers: {} }), false);
});
