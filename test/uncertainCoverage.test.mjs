import test from 'node:test';
import assert from 'node:assert/strict';
import { getUncertainRuleCoverage, getUnroutedUncertainties } from '../src/utils/uncertainCoverage.js';
import { QUESTION_THREADS_KEY, addQuestionThread, withQuestionThread } from '../src/utils/questionThreads.js';
import { UNKNOWN_ANSWER_VALUE } from '../src/utils/unknownAnswer.js';

const questions = [
  { id: 'hosting', question: { fr: 'Où sont hébergées les données ?' } },
  { id: 'budget', question: { fr: 'Quel budget ?' } }
];

const rules = [
  {
    id: 'rule-hosting',
    teams: ['dpo'],
    teamRoutingRules: [{ targetTeamId: 'security', conditions: [{ question: 'hosting', operator: 'equals', value: 'us' }] }],
    conditions: [{ question: 'hosting', operator: 'equals', value: 'us' }],
    conditionLogic: 'all'
  },
  {
    id: 'rule-draft',
    isDraft: true,
    teams: ['legal'],
    conditions: [{ question: 'hosting', operator: 'equals', value: 'eu' }],
    conditionLogic: 'all'
  },
  {
    id: 'rule-other',
    teams: ['legal'],
    conditions: [{ question: 'audience', operator: 'equals', value: 'public' }],
    conditionLogic: 'all'
  }
];

test('une réponse incertaine nomme les règles et les équipes qu’elle tient en suspens', () => {
  const coverage = getUncertainRuleCoverage(
    { hosting: UNKNOWN_ANSWER_VALUE, budget: UNKNOWN_ANSWER_VALUE },
    rules,
    questions
  );

  // `budget` ne conditionne aucune règle : son incertitude ne change rien à l'analyse.
  assert.deepEqual(coverage.map((entry) => entry.questionId), ['hosting']);
  assert.deepEqual(coverage[0].ruleIds, ['rule-hosting']);
  // Les équipes de routage comptent autant que l'équipe principale : ce sont elles qui
  // seraient sollicitées selon la réponse.
  assert.deepEqual(coverage[0].teamIds.sort(), ['dpo', 'security']);
  assert.equal(coverage[0].question.id, 'hosting');
});

test('une règle en brouillon ne fait jamais peser un doute', () => {
  const coverage = getUncertainRuleCoverage({ hosting: UNKNOWN_ANSWER_VALUE }, [rules[1]], questions);
  assert.deepEqual(coverage, []);
});

test('un doute transmis à une équipe cesse d’être orphelin', () => {
  const base = { hosting: UNKNOWN_ANSWER_VALUE };
  assert.deepEqual(
    getUnroutedUncertainties(getUncertainRuleCoverage(base, rules, questions)).map((entry) => entry.questionId),
    ['hosting']
  );

  const asked = withQuestionThread(base, addQuestionThread(base, {
    questionId: 'hosting',
    teamId: 'dpo',
    message: 'Je ne sais pas encore trancher, pouvez-vous m’aider ?',
    authorEmail: 'porteur@lfb.fr'
  }));

  const coverage = getUncertainRuleCoverage(asked, rules, questions);
  assert.deepEqual(coverage[0].askedTeamIds, ['dpo']);
  assert.deepEqual(coverage[0].pendingTeamIds, ['dpo']);
  assert.deepEqual(getUnroutedUncertainties(coverage), []);

  // Une question close n'attend plus personne, mais le doute reste adressé.
  const resolved = {
    ...asked,
    [QUESTION_THREADS_KEY]: asked[QUESTION_THREADS_KEY].map((thread) => ({
      ...thread,
      resolvedAt: '2026-05-02T09:00:00.000Z'
    }))
  };
  const resolvedCoverage = getUncertainRuleCoverage(resolved, rules, questions);
  assert.deepEqual(resolvedCoverage[0].askedTeamIds, ['dpo']);
  assert.deepEqual(resolvedCoverage[0].pendingTeamIds, []);
});
