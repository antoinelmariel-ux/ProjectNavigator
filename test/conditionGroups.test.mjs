import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCondition,
  sanitizeConditionGroup,
  normalizeConditionGroups,
  applyConditionGroups
} from '../src/utils/conditionGroups.js';

test('sanitizeCondition applique les valeurs par défaut', () => {
  assert.deepEqual(sanitizeCondition(), { question: '', operator: 'equals', value: '' });
  assert.deepEqual(
    sanitizeCondition({ question: 'q1', operator: 'gt', value: 5 }),
    { question: 'q1', operator: 'gt', value: 5 }
  );
});

test('sanitizeConditionGroup normalise la logique à "all" par défaut', () => {
  assert.equal(sanitizeConditionGroup({}).logic, 'all');
  assert.equal(sanitizeConditionGroup({ logic: 'any' }).logic, 'any');
  assert.equal(sanitizeConditionGroup({ logic: 'nimporte' }).logic, 'all');
});

test('normalizeConditionGroups convertit un format hérité (conditions plates) en groupe', () => {
  const groups = normalizeConditionGroups({
    conditions: [{ question: 'q1', operator: 'equals', value: 'oui' }],
    conditionLogic: 'any'
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].logic, 'any');
  assert.equal(groups[0].conditions[0].question, 'q1');
});

test('normalizeConditionGroups renvoie [] quand il n’y a aucune condition', () => {
  assert.deepEqual(normalizeConditionGroups({}), []);
});

test('applyConditionGroups conserve la rétro-compatibilité conditions/conditionLogic', () => {
  const result = applyConditionGroups(
    { id: 'x' },
    [{ logic: 'any', conditions: [{ question: 'q1', operator: 'equals', value: 'oui' }] }]
  );
  assert.equal(result.conditionLogic, 'any');
  assert.equal(result.conditions.length, 1);
  assert.equal(result.conditionGroups.length, 1);
});
