import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAnswers, matchesCondition, resolveProjectAnalysis } from '../src/utils/rules.js';
import { initialRules } from '../src/data/rules.js';
import { initialRiskLevelRules } from '../src/data/riskLevelRules.js';
import { initialRiskWeights } from '../src/data/riskWeights.js';
import { demoProjectAnswersSnapshot } from '../src/data/demoProject.js';

test('matchesCondition : égalité simple et tableau', () => {
  assert.equal(matchesCondition({ question: 'p', operator: 'equals', value: 'oui' }, { p: 'oui' }), true);
  assert.equal(matchesCondition({ question: 'p', operator: 'equals', value: 'oui' }, { p: 'non' }), false);
  assert.equal(
    matchesCondition({ question: 'p', operator: 'equals', value: 'x' }, { p: ['x', 'y'] }),
    true
  );
});

test('analyzeAnswers : structure de retour cohérente avec des réponses vides', () => {
  const result = analyzeAnswers({}, initialRules, initialRiskLevelRules, initialRiskWeights);
  assert.ok(result && typeof result === 'object');
  assert.ok(Array.isArray(result.teams));
  assert.ok(Array.isArray(result.risks));
  assert.ok(Array.isArray(result.triggeredRules));
  assert.equal(typeof result.riskScore, 'number');
  assert.ok(Number.isFinite(result.riskScore));
  assert.equal(typeof result.complexity, 'string');
  assert.ok(result.timeline && typeof result.timeline === 'object');
});

test('analyzeAnswers : le score de risque est la somme des poids des risques', () => {
  const result = analyzeAnswers(
    demoProjectAnswersSnapshot,
    initialRules,
    initialRiskLevelRules,
    initialRiskWeights
  );
  const expected = result.risks.reduce(
    (total, risk) => total + (Number.isFinite(risk?.weight) ? risk.weight : 0),
    0
  );
  assert.equal(result.riskScore, expected);
  assert.ok(result.riskScore >= 0);
});

test('analyzeAnswers : déterministe (mêmes entrées → même résultat)', () => {
  const run = () =>
    analyzeAnswers(demoProjectAnswersSnapshot, initialRules, initialRiskLevelRules, initialRiskWeights);
  assert.deepEqual(run(), run());
});

test('analyzeAnswers : le projet de démonstration déclenche au moins une règle et une équipe', () => {
  const result = analyzeAnswers(
    demoProjectAnswersSnapshot,
    initialRules,
    initialRiskLevelRules,
    initialRiskWeights
  );
  assert.ok(result.triggeredRules.length > 0, 'au moins une règle déclenchée sur le projet démo');
  assert.ok(result.teams.length > 0, 'au moins une équipe concernée');
});

test('analyzeAnswers : les équipes notifiées sont un sous-ensemble des équipes concernées', () => {
  const result = analyzeAnswers(
    demoProjectAnswersSnapshot,
    initialRules,
    initialRiskLevelRules,
    initialRiskWeights
  );
  const teams = new Set(result.teams);
  for (const notified of result.notifiedTeams) {
    assert.ok(teams.has(notified), `équipe notifiée ${notified} présente dans teams`);
  }
});

test('resolveProjectAnalysis : un projet soumis garde son analyse figée, sans recalcul', () => {
  const frozenAnalysis = { riskScore: 42, teams: ['dpo'] };
  const project = { status: 'submitted', analysis: frozenAnalysis, answers: { q1: 'oui' } };
  let called = false;
  const computeAnalysis = () => {
    called = true;
    return { riskScore: 999, teams: [] };
  };

  const result = resolveProjectAnalysis(project, computeAnalysis);

  assert.equal(result, frozenAnalysis);
  assert.equal(called, false, 'computeAnalysis ne doit pas être appelé pour un projet soumis déjà analysé');
});

test('resolveProjectAnalysis : un projet brouillon recalcule via computeAnalysis', () => {
  const project = { status: 'draft', analysis: { riskScore: 1 }, answers: { q1: 'oui' } };
  const freshAnalysis = { riskScore: 7 };
  const computeAnalysis = () => freshAnalysis;

  const result = resolveProjectAnalysis(project, computeAnalysis);

  assert.equal(result, freshAnalysis);
});

test('resolveProjectAnalysis : un projet soumis sans analyse stockée recalcule (donnée historique)', () => {
  const project = { status: 'submitted', analysis: null, answers: { q1: 'oui' } };
  const freshAnalysis = { riskScore: 3 };
  const computeAnalysis = () => freshAnalysis;

  const result = resolveProjectAnalysis(project, computeAnalysis);

  assert.equal(result, freshAnalysis);
});

test('resolveProjectAnalysis : sans réponses, renvoie null sans appeler computeAnalysis', () => {
  const project = { status: 'draft', analysis: null, answers: {} };
  let called = false;
  const computeAnalysis = () => {
    called = true;
    return {};
  };

  const result = resolveProjectAnalysis(project, computeAnalysis);

  assert.equal(result, null);
  assert.equal(called, false);
});
