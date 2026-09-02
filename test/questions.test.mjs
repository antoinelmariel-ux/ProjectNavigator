import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowQuestion,
  normalizeQuestionOptions,
  buildExtraCheckboxQuestionId,
  getConditionQuestionEntries,
  withActivityScope,
  ACTIVITY_SCOPE_QUESTION_ID
} from '../src/utils/questions.js';

test('shouldShowQuestion : une question sans condition est toujours affichée', () => {
  assert.equal(shouldShowQuestion({ id: 'q1' }, {}), true);
  assert.equal(shouldShowQuestion({ id: 'q1', conditions: [] }, {}), true);
});

test('shouldShowQuestion : condition "equals" respectée / non respectée', () => {
  const question = {
    id: 'q2',
    conditions: [{ question: 'pays', operator: 'equals', value: 'France' }]
  };
  assert.equal(shouldShowQuestion(question, { pays: 'France' }), true);
  assert.equal(shouldShowQuestion(question, { pays: 'Belgique' }), false);
  assert.equal(shouldShowQuestion(question, {}), false);
});

test('shouldShowQuestion : réponse tableau avec includes', () => {
  const question = {
    id: 'q3',
    conditions: [{ question: 'partenaires', operator: 'equals', value: 'externe' }]
  };
  assert.equal(shouldShowQuestion(question, { partenaires: ['interne', 'externe'] }), true);
  assert.equal(shouldShowQuestion(question, { partenaires: ['interne'] }), false);
});

test('shouldShowQuestion : logique "any" (au moins une condition vraie)', () => {
  const question = {
    id: 'q4',
    conditionGroups: [
      {
        logic: 'any',
        conditions: [
          { question: 'a', operator: 'equals', value: 'oui' },
          { question: 'b', operator: 'equals', value: 'oui' }
        ]
      }
    ]
  };
  assert.equal(shouldShowQuestion(question, { a: 'non', b: 'oui' }), true);
  assert.equal(shouldShowQuestion(question, { a: 'non', b: 'non' }), false);
});

test('shouldShowQuestion : opérateurs numériques gt/lte', () => {
  const gt = { id: 'q5', conditions: [{ question: 'montant', operator: 'gt', value: 1000 }] };
  assert.equal(shouldShowQuestion(gt, { montant: 1500 }), true);
  assert.equal(shouldShowQuestion(gt, { montant: 500 }), false);
});

test('normalizeQuestionOptions : filtre les labels vides et ajoute l’option "Autre"', () => {
  const options = normalizeQuestionOptions({
    options: [{ label: 'A' }, { label: '' }, { label: 'B' }],
    otherOption: { enabled: true, label: 'Autre' }
  });
  const labels = options.map((option) => option.label);
  assert.deepEqual(labels, ['A', 'B', 'Autre']);
  assert.equal(options.find((option) => option.isOther)?.label, 'Autre');
});

test('buildExtraCheckboxQuestionId : suffixe stable, chaîne vide si id invalide', () => {
  assert.equal(buildExtraCheckboxQuestionId('q1'), 'q1__extra_checkbox');
  assert.equal(buildExtraCheckboxQuestionId(null), '');
});

test('getConditionQuestionEntries : expose le périmètre d’activité comme pseudo-question à choix multiple', () => {
  const entries = getConditionQuestionEntries([{ id: 'q1', question: 'Pays ?' }], 'fr');
  const scopeEntry = entries.find((entry) => entry.id === ACTIVITY_SCOPE_QUESTION_ID);
  assert.ok(scopeEntry, 'le pseudo-champ périmètre d’activité doit être présent');
  assert.equal(scopeEntry.type, 'multi_choice');
  assert.equal(scopeEntry.options.length, 7);
  assert.ok(scopeEntry.options.some((option) => option.value === 'france'));
});

test('withActivityScope : injecte le périmètre sans modifier les réponses d’origine', () => {
  const answers = { pays: 'France' };
  const withScope = withActivityScope(answers, ['france', 'uk']);
  assert.deepEqual(withScope[ACTIVITY_SCOPE_QUESTION_ID], ['france', 'uk']);
  assert.equal(withScope.pays, 'France');
  assert.ok(!(ACTIVITY_SCOPE_QUESTION_ID in answers), 'l’objet de réponses original ne doit pas être modifié');
});

test('shouldShowQuestion : condition basée sur le périmètre d’activité (equals/not_equals)', () => {
  const question = {
    id: 'q6',
    conditions: [{ question: ACTIVITY_SCOPE_QUESTION_ID, operator: 'equals', value: 'france' }]
  };
  const answersWithFrance = withActivityScope({}, ['worldwide', 'france']);
  const answersWithoutFrance = withActivityScope({}, ['uk']);
  assert.equal(shouldShowQuestion(question, answersWithFrance), true);
  assert.equal(shouldShowQuestion(question, answersWithoutFrance), false);

  const notFranceQuestion = {
    id: 'q7',
    conditions: [{ question: ACTIVITY_SCOPE_QUESTION_ID, operator: 'not_equals', value: 'france' }]
  };
  assert.equal(shouldShowQuestion(notFranceQuestion, answersWithFrance), false);
  assert.equal(shouldShowQuestion(notFranceQuestion, answersWithoutFrance), true);
});
