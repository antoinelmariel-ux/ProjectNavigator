import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRiskWeighting,
  getRiskWeightKey,
  DEFAULT_RISK_WEIGHTING
} from '../src/utils/risk.js';

test('normalizeRiskWeighting : valeurs par défaut si entrée invalide', () => {
  assert.deepEqual(normalizeRiskWeighting(undefined), DEFAULT_RISK_WEIGHTING);
  assert.deepEqual(normalizeRiskWeighting(null), DEFAULT_RISK_WEIGHTING);
  assert.deepEqual(normalizeRiskWeighting('nope'), DEFAULT_RISK_WEIGHTING);
});

test('normalizeRiskWeighting : conserve les valeurs valides, rejette les négatives', () => {
  assert.deepEqual(normalizeRiskWeighting({ low: 2, medium: 4, high: 8 }), {
    low: 2,
    medium: 4,
    high: 8
  });
  assert.equal(normalizeRiskWeighting({ low: -1 }).low, DEFAULT_RISK_WEIGHTING.low);
});

test('getRiskWeightKey : mappe les libellés FR (avec/sans accents) vers low/medium/high', () => {
  assert.equal(getRiskWeightKey('Élevé'), 'high');
  assert.equal(getRiskWeightKey('critique'), 'high');
  assert.equal(getRiskWeightKey('Moyen'), 'medium');
  assert.equal(getRiskWeightKey('modéré'), 'medium');
  assert.equal(getRiskWeightKey('Faible'), 'low');
  assert.equal(getRiskWeightKey('inconnu'), 'medium');
});
