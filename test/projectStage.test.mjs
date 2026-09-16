import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_PROJECT_STAGE,
  PROJECT_STAGE_ANSWER_KEY,
  PROJECT_STAGE_DESIGN,
  PROJECT_STAGE_FRAMING,
  PROJECT_STAGE_PRE_LAUNCH,
  getProjectStage,
  getQuestionRequiredFromStage,
  isStageAtLeast,
  normalizeProjectStage,
  withProjectStage
} from '../src/utils/projectStage.js';
import {
  computeMandatoryProgress,
  getMissingMandatoryQuestions,
  isQuestionMandatoryAtStage
} from '../src/utils/mandatoryQuestions.js';
import { UNKNOWN_ANSWER_VALUE, canAnswerBeUnknown, isUnknownAnswer } from '../src/utils/unknownAnswer.js';
import {
  READINESS_ADVICE,
  READINESS_INCOMPLETE,
  READINESS_ORIENTATION,
  READINESS_VALIDATION,
  getProjectReadiness
} from '../src/utils/projectReadiness.js';

const questions = [
  { id: 'name', required: true },
  { id: 'audience', required: true, requiredFromStage: PROJECT_STAGE_FRAMING },
  { id: 'countries', required: true, requiredFromStage: PROJECT_STAGE_DESIGN },
  { id: 'budget', required: true, requiredFromStage: PROJECT_STAGE_PRE_LAUNCH },
  { id: 'notes', required: false }
];

test('un projet sans stade est considéré au stade le plus avancé', () => {
  assert.equal(getProjectStage({}), LEGACY_PROJECT_STAGE);
  assert.equal(LEGACY_PROJECT_STAGE, PROJECT_STAGE_PRE_LAUNCH);
  assert.equal(getProjectStage({ [PROJECT_STAGE_ANSWER_KEY]: 'nawak' }), PROJECT_STAGE_PRE_LAUNCH);
  assert.equal(getProjectStage({ [PROJECT_STAGE_ANSWER_KEY]: PROJECT_STAGE_FRAMING }), PROJECT_STAGE_FRAMING);
  assert.equal(normalizeProjectStage('', PROJECT_STAGE_DESIGN), PROJECT_STAGE_DESIGN);
  assert.equal(withProjectStage({ a: 1 }, PROJECT_STAGE_DESIGN)[PROJECT_STAGE_ANSWER_KEY], PROJECT_STAGE_DESIGN);
});

test('une question sans requiredFromStage reste obligatoire dès le cadrage', () => {
  assert.equal(getQuestionRequiredFromStage({ required: true }), PROJECT_STAGE_FRAMING);
  assert.equal(isQuestionMandatoryAtStage({ required: true }, PROJECT_STAGE_FRAMING), true);
  assert.equal(isQuestionMandatoryAtStage({ required: false }, PROJECT_STAGE_PRE_LAUNCH), false);
});

test('le stade module le caractère obligatoire, jamais la question elle-même', () => {
  assert.equal(isStageAtLeast(PROJECT_STAGE_DESIGN, PROJECT_STAGE_PRE_LAUNCH), false);
  assert.equal(isStageAtLeast(PROJECT_STAGE_DESIGN, PROJECT_STAGE_FRAMING), true);

  const atFraming = getMissingMandatoryQuestions(questions, {}, { stage: PROJECT_STAGE_FRAMING });
  assert.deepEqual(atFraming.map((question) => question.id), ['name', 'audience']);

  const atPreLaunch = getMissingMandatoryQuestions(questions, {}, { stage: PROJECT_STAGE_PRE_LAUNCH });
  assert.deepEqual(atPreLaunch.map((question) => question.id), ['name', 'audience', 'countries', 'budget']);

  // Une soumission finale n'est jamais allégée par le stade déclaré.
  const ignoringStage = getMissingMandatoryQuestions(
    questions,
    { [PROJECT_STAGE_ANSWER_KEY]: PROJECT_STAGE_FRAMING },
    { ignoreStage: true }
  );
  assert.deepEqual(ignoringStage.map((question) => question.id), ['name', 'audience', 'countries', 'budget']);
});

test('« je ne sais pas encore » compte comme réponse sauf quand une réponse ferme est exigée', () => {
  assert.equal(isUnknownAnswer(UNKNOWN_ANSWER_VALUE), true);
  assert.equal(isUnknownAnswer([UNKNOWN_ANSWER_VALUE]), true);
  assert.equal(isUnknownAnswer([UNKNOWN_ANSWER_VALUE, 'autre']), false);
  assert.equal(isUnknownAnswer('non'), false);

  const answers = { name: 'Projet', audience: UNKNOWN_ANSWER_VALUE };
  assert.deepEqual(
    getMissingMandatoryQuestions(questions, answers, { stage: PROJECT_STAGE_FRAMING }).map((q) => q.id),
    []
  );
  assert.deepEqual(
    getMissingMandatoryQuestions(questions, answers, { stage: PROJECT_STAGE_FRAMING, rejectUnknown: true })
      .map((q) => q.id),
    ['audience']
  );

  const progress = computeMandatoryProgress(questions, answers, { stage: PROJECT_STAGE_FRAMING });
  assert.deepEqual(progress, { totalMandatoryQuestions: 2, answeredMandatoryQuestions: 2 });
});

test('« je ne sais pas encore » n’est proposé que là où l’incertitude est exploitable', () => {
  assert.equal(canAnswerBeUnknown({ type: 'choice' }), true);
  assert.equal(canAnswerBeUnknown({ type: 'number' }), true);
  assert.equal(canAnswerBeUnknown({ type: 'long_text' }), false);
  assert.equal(canAnswerBeUnknown({ type: 'text' }), false);
  assert.equal(canAnswerBeUnknown({ type: 'long_text', allowUnknownAnswer: true }), true);
  assert.equal(canAnswerBeUnknown({ type: 'choice', allowUnknownAnswer: false }), false);
});

test('les paliers de complétude disent ce que la compliance peut faire', () => {
  assert.equal(getProjectReadiness(questions, {}).level, READINESS_INCOMPLETE);
  assert.equal(getProjectReadiness(questions, { name: 'P', audience: 'tous' }).level, READINESS_ORIENTATION);

  // L'avis technique demande le même socle que la validation : toutes les questions
  // obligatoires du projet. Une réponse encore manquante ne l'ouvre pas.
  assert.equal(
    getProjectReadiness(questions, { name: 'P', audience: 'tous', countries: ['fr'] }).level,
    READINESS_ORIENTATION
  );
  assert.equal(
    getProjectReadiness(questions, { name: 'P', audience: 'tous', countries: ['fr'], budget: 120 }).level,
    READINESS_VALIDATION
  );

  // Ce qui distingue les deux paliers, c'est la fermeté : un « je ne sais pas encore » assumé
  // ouvre l'avis technique, jamais la validation.
  const uncertain = getProjectReadiness(questions, {
    name: 'P',
    audience: 'tous',
    countries: ['fr'],
    budget: UNKNOWN_ANSWER_VALUE
  });
  assert.equal(uncertain.level, READINESS_ADVICE);
  assert.equal(uncertain.nextLevel, READINESS_VALIDATION);
  assert.deepEqual(uncertain.missingForNextLevel.map((question) => question.id), ['budget']);
  assert.deepEqual(
    uncertain.levels.find((entry) => entry.id === READINESS_ADVICE).missing.map((q) => q.id),
    []
  );
});

test('un palier intermédiaire manquant n’est pas effacé par un palier ultérieur complet', () => {
  const readiness = getProjectReadiness(questions, { name: 'P', countries: ['fr'], budget: 10 });
  assert.equal(readiness.level, READINESS_INCOMPLETE);
  assert.equal(readiness.nextLevel, READINESS_ORIENTATION);
});

test('aucune condition n’est satisfaite par « je ne sais pas encore »', async () => {
  const { shouldShowQuestion } = await import('../src/utils/questions.js');
  const { analyzeAnswers } = await import('../src/utils/rules.js');

  const buildQuestion = (operator, value) => ({
    id: 'target',
    conditions: [{ question: 'source', operator, value }],
    conditionLogic: 'all'
  });

  assert.equal(shouldShowQuestion(buildQuestion('equals', 'oui'), { source: UNKNOWN_ANSWER_VALUE }), false);
  assert.equal(shouldShowQuestion(buildQuestion('not_equals', 'oui'), { source: UNKNOWN_ANSWER_VALUE }), false);
  assert.equal(shouldShowQuestion(buildQuestion('contains', 'oui'), { source: UNKNOWN_ANSWER_VALUE }), false);
  assert.equal(shouldShowQuestion(buildQuestion('gt', 10), { source: UNKNOWN_ANSWER_VALUE }), false);
  assert.equal(shouldShowQuestion(buildQuestion('not_equals', 'oui'), { source: 'non' }), true);

  const rules = [
    {
      id: 'r1',
      name: 'Règle test',
      conditions: [{ question: 'source', operator: 'not_equals', value: 'oui' }],
      conditionLogic: 'all',
      teams: ['quality'],
      notifyTeam: true
    }
  ];

  assert.deepEqual(analyzeAnswers({ source: UNKNOWN_ANSWER_VALUE }, rules, [], {}).teams, []);
  assert.deepEqual(analyzeAnswers({ source: 'non' }, rules, [], {}).teams, ['quality']);
});

test('une réponse incertaine qui conditionne une règle est signalée', async () => {
  const { getUncertainRuleCoverage } = await import('../src/utils/uncertainCoverage.js');

  const rules = [
    { id: 'r1', conditions: [{ question: 'hosting', operator: 'equals', value: 'cloud' }] },
    { id: 'r2', conditions: [{ question: 'countries', operator: 'contains', value: 'fr' }] },
    { id: 'draft', isDraft: true, conditions: [{ question: 'budget', operator: 'gt', value: 100 }] }
  ];
  const questions = [{ id: 'hosting', question: { fr: 'Hébergement ?' } }];

  const coverage = getUncertainRuleCoverage(
    { hosting: UNKNOWN_ANSWER_VALUE, budget: UNKNOWN_ANSWER_VALUE, countries: ['fr'] },
    rules,
    questions
  );

  assert.deepEqual(coverage.map((entry) => entry.questionId), ['hosting']);
  assert.deepEqual(coverage[0].ruleIds, ['r1']);
  assert.equal(coverage[0].question.question.fr, 'Hébergement ?');
  assert.deepEqual(getUncertainRuleCoverage({ hosting: 'cloud' }, rules, questions), []);
});
