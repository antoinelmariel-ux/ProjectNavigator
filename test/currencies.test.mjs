import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCurrencyRatesSnapshot,
  convertThresholdToUnits,
  findUnitsWithoutRate,
  normalizeCurrencyTable,
  resetCurrencyContext,
  setCurrencyQuestionDefaults,
  setCurrencyTable
} from '../src/utils/currencies.js';
import { evaluateRule } from '../src/utils/rules.js';
import { shouldShowOption, shouldShowQuestion } from '../src/utils/questions.js';
import { sanitizeRuleCondition } from '../src/utils/ruleConditions.js';
import { recordSubmission } from '../src/utils/submissionHistory.js';

const TABLE = [
  { unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1 },
  { unit: 'K$', code: 'USD', multiplier: 1000, rate: 0.9 },
  { unit: 'MXN', code: 'MXN', multiplier: 1, rate: null }
];

const budgetQuestion = {
  id: 'budget',
  type: 'number',
  numberUnit: 'K€',
  numberUnitOptions: ['K$', 'MXN']
};

const ruleOver = (threshold, valueUnit) => ({
  conditionGroups: [{
    logic: 'all',
    conditions: [{ type: 'question', question: 'budget', operator: 'gt', value: threshold, ...(valueUnit ? { valueUnit } : {}) }]
  }]
});

const setup = () => {
  resetCurrencyContext();
  setCurrencyTable(TABLE);
  setCurrencyQuestionDefaults([budgetQuestion]);
};

test('un montant est converti dans la devise du seuil avant comparaison', () => {
  setup();
  // 120 K$ = 108 K€ : au-dessus de 100 K€, pas au-dessus de 110 K€.
  const answers = { budget: '120', budget__number_unit: 'K$' };
  assert.equal(evaluateRule(ruleOver(100, 'K€'), answers).triggered, true);
  assert.equal(evaluateRule(ruleOver(110, 'K€'), answers).triggered, false);
});

test('une unité jamais choisie dans le sélecteur vaut l\'unité par défaut de la question', () => {
  setup();
  assert.equal(evaluateRule(ruleOver(100, 'K$'), { budget: '95' }).triggered, true);
  assert.equal(evaluateRule(ruleOver(100, 'K$'), { budget: '85' }).triggered, false);
});

test('un taux manquant empêche la condition de se déclencher', () => {
  setup();
  const answers = { budget: '999999', budget__number_unit: 'MXN' };
  assert.equal(evaluateRule(ruleOver(1, 'K€'), answers).triggered, false);
  assert.equal(evaluateRule(ruleOver(1, 'MXN'), { budget: '10', budget__number_unit: 'K€' }).triggered, false);
  assert.equal(evaluateRule(ruleOver(1, 'ZZZ'), { budget: '10', budget__number_unit: 'K€' }).triggered, false);
});

test('une condition sans devise de seuil compare toujours le nombre brut', () => {
  setup();
  const answers = { budget: '120', budget__number_unit: 'MXN' };
  assert.equal(evaluateRule(ruleOver(100), answers).triggered, true);
});

test('la devise du seuil survit à la normalisation des conditions', () => {
  assert.equal(sanitizeRuleCondition({ question: 'budget', operator: 'gt', value: 5, valueUnit: ' K€ ' }).valueUnit, 'K€');
  assert.equal('valueUnit' in sanitizeRuleCondition({ question: 'budget', operator: 'gt', value: 5 }), false);
});

test('la visibilité d\'une question utilise la même conversion', () => {
  setup();
  const question = {
    id: 'q',
    conditions: [{ question: 'budget', operator: 'gt', value: 100, valueUnit: 'K€' }]
  };
  assert.equal(shouldShowQuestion(question, { budget: '120', budget__number_unit: 'K$' }), true);
  assert.equal(shouldShowQuestion(question, { budget: '80', budget__number_unit: 'K$' }), false);
  assert.equal(shouldShowQuestion(question, { budget: '500', budget__number_unit: 'MXN' }), false);
});

test('les taux figés à l\'envoi priment sur la table courante', () => {
  setup();
  const sent = recordSubmission({ budget: '120', budget__number_unit: 'K$' }, {
    currencyRates: buildCurrencyRatesSnapshot()
  });
  setCurrencyTable([
    { unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1 },
    { unit: 'K$', code: 'USD', multiplier: 1000, rate: 0.5 }
  ]);
  assert.equal(evaluateRule(ruleOver(100, 'K€'), sent).triggered, true);
  assert.equal(evaluateRule(ruleOver(100, 'K€'), { budget: '120', budget__number_unit: 'K$' }).triggered, false);
});

test('une unité absente de l\'instantané retombe sur la table courante', () => {
  setup();
  const sent = recordSubmission({ budget: '120', budget__number_unit: 'K$' }, {
    currencyRates: { 'K€': 1000 }
  });
  assert.equal(evaluateRule(ruleOver(100, 'K€'), sent).triggered, true);
});

test('le renvoi suivant rafraîchit l\'instantané', () => {
  setup();
  const first = recordSubmission({ budget: '1' }, { currencyRates: buildCurrencyRatesSnapshot() });
  setCurrencyTable([{ unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1 }, { unit: 'K$', code: 'USD', multiplier: 1000, rate: 0.5 }]);
  const second = recordSubmission(first, { currencyRates: buildCurrencyRatesSnapshot() });
  assert.equal(second.__submission_history__.currencyRates['K$'], 500);
});

test('la table est normalisée : doublons, unités vides et taux invalides', () => {
  const table = normalizeCurrencyTable([
    { unit: 'K€', rate: 1, multiplier: 1000 },
    { unit: 'K€', rate: 2 },
    { unit: '  ', rate: 3 },
    { unit: 'K$', rate: 'abc' },
    null
  ]);
  assert.deepEqual(table.map((entry) => entry.unit), ['K€', 'K$']);
  assert.equal(table[1].rate, null);
});

test('équivalents du seuil dans les autres unités et unités sans taux', () => {
  const converted = convertThresholdToUnits(100, 'K€', ['K€', 'K$', 'MXN'], TABLE);
  assert.equal(converted.length, 1);
  assert.equal(converted[0].unit, 'K$');
  assert.ok(Math.abs(converted[0].amount - 100 / 0.9) < 1e-9);
  assert.deepEqual(findUnitsWithoutRate([budgetQuestion], TABLE), ['MXN']);
});

test('la visibilité d\'une option utilise la même conversion', () => {
  setup();
  const option = {
    label: 'Gros budget',
    visibility: 'conditional',
    conditionGroups: [{
      logic: 'all',
      conditions: [{ question: 'budget', operator: 'gt', value: 100, valueUnit: 'K€' }]
    }]
  };
  assert.equal(shouldShowOption(option, { budget: '120', budget__number_unit: 'K$' }), true);
  assert.equal(shouldShowOption(option, { budget: '80', budget__number_unit: 'K$' }), false);
  assert.equal(shouldShowOption(option, { budget: '500', budget__number_unit: 'MXN' }), false);
});
