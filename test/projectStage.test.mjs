import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_STAGE_DESIGN,
  PROJECT_STAGE_FRAMING,
  PROJECT_STAGE_PRE_LAUNCH,
  REQUIRED_FOR_ADVICE,
  REQUIRED_FOR_ORIENTATION,
  getQuestionRequiredFromStage,
  getQuestionRequirementLevel,
  isStageAtLeast
} from '../src/utils/projectStage.js';
import {
  computeMandatoryProgress,
  getMissingMandatoryQuestions,
  isQuestionMandatoryAtStage
} from '../src/utils/mandatoryQuestions.js';
import { canQuestionHaveDoubt, hasQuestionDoubt, withQuestionDoubt } from '../src/utils/questionDoubts.js';
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

test('une question est soit du socle, soit exigée pour l’avis et la validation', () => {
  assert.equal(getQuestionRequirementLevel({ required: true }), REQUIRED_FOR_ORIENTATION);
  assert.equal(getQuestionRequirementLevel({ requiredFromStage: PROJECT_STAGE_FRAMING }), REQUIRED_FOR_ORIENTATION);
  // L'ancienne valeur intermédiaire n'a plus de palier à elle.
  assert.equal(getQuestionRequirementLevel({ requiredFromStage: PROJECT_STAGE_DESIGN }), REQUIRED_FOR_ADVICE);
  assert.equal(getQuestionRequirementLevel({ requiredFromStage: PROJECT_STAGE_PRE_LAUNCH }), REQUIRED_FOR_ADVICE);
  assert.equal(getQuestionRequirementLevel({ requiredFromStage: 'nawak' }), REQUIRED_FOR_ORIENTATION);
});

test('une question sans requiredFromStage reste obligatoire dès le cadrage', () => {
  assert.equal(getQuestionRequiredFromStage({ required: true }), PROJECT_STAGE_FRAMING);
  assert.equal(isQuestionMandatoryAtStage({ required: true }, PROJECT_STAGE_FRAMING), true);
  assert.equal(isQuestionMandatoryAtStage({ required: false }, PROJECT_STAGE_PRE_LAUNCH), false);
});

test('le palier module le caractère exigible, jamais la question elle-même', () => {
  assert.equal(isStageAtLeast(PROJECT_STAGE_DESIGN, PROJECT_STAGE_PRE_LAUNCH), false);
  assert.equal(isStageAtLeast(PROJECT_STAGE_DESIGN, PROJECT_STAGE_FRAMING), true);

  const atFraming = getMissingMandatoryQuestions(questions, {}, { stage: PROJECT_STAGE_FRAMING });
  assert.deepEqual(atFraming.map((question) => question.id), ['name', 'audience']);

  const atPreLaunch = getMissingMandatoryQuestions(questions, {}, { stage: PROJECT_STAGE_PRE_LAUNCH });
  assert.deepEqual(atPreLaunch.map((question) => question.id), ['name', 'audience', 'countries', 'budget']);

  // Sans palier, toutes les questions obligatoires — même pour un projet qui garde l'ancienne
  // clé de stade dans ses réponses : elle n'est plus lue.
  const withoutStage = getMissingMandatoryQuestions(questions, { __project_stage__: PROJECT_STAGE_FRAMING });
  assert.deepEqual(withoutStage.map((question) => question.id), ['name', 'audience', 'countries', 'budget']);
});

test('un doute laisse la réponse utilisable sauf quand une réponse ferme est exigée', () => {
  assert.equal(hasQuestionDoubt(withQuestionDoubt({}, 'audience', 'Pas sûr'), 'audience'), true);
  assert.equal(hasQuestionDoubt({}, 'audience'), false);

  // Le doute ne remplace jamais la réponse : elle reste la vraie valeur donnée.
  const answers = withQuestionDoubt({ name: 'Projet', audience: 'Grand public' }, 'audience', 'Pas sûr du périmètre');
  assert.equal(answers.audience, 'Grand public');
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

test('le doute n’est proposé que là où l’incertitude reste exploitable', () => {
  assert.equal(canQuestionHaveDoubt({ type: 'choice' }), true);
  assert.equal(canQuestionHaveDoubt({ type: 'number' }), true);
  assert.equal(canQuestionHaveDoubt({ type: 'long_text' }), false);
  assert.equal(canQuestionHaveDoubt({ type: 'text' }), false);
  assert.equal(canQuestionHaveDoubt({ type: 'long_text', allowUnknownAnswer: true }), true);
  assert.equal(canQuestionHaveDoubt({ type: 'choice', allowUnknownAnswer: false }), false);
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

  // Ce qui distingue les deux paliers, c'est la fermeté : un doute assumé sur une réponse déjà
  // donnée ouvre l'avis technique, jamais la validation.
  const uncertain = getProjectReadiness(
    questions,
    withQuestionDoubt(
      { name: 'P', audience: 'tous', countries: ['fr'], budget: 120 },
      'budget',
      'Montant pas encore confirmé'
    )
  );
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

test('un doute n’a aucun effet sur les conditions ni sur l’analyse : la vraie réponse seule compte', async () => {
  const { shouldShowQuestion } = await import('../src/utils/questions.js');
  const { analyzeAnswers } = await import('../src/utils/rules.js');

  const buildQuestion = (operator, value) => ({
    id: 'target',
    conditions: [{ question: 'source', operator, value }],
    conditionLogic: 'all'
  });

  const doubtedAnswers = withQuestionDoubt({ source: 'oui' }, 'source', 'Pas totalement sûr');
  assert.equal(shouldShowQuestion(buildQuestion('equals', 'oui'), doubtedAnswers), true);
  assert.equal(shouldShowQuestion(buildQuestion('not_equals', 'oui'), doubtedAnswers), false);

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

  const doubtedNonAnswer = withQuestionDoubt({ source: 'non' }, 'source', 'Pas sûr');
  assert.deepEqual(analyzeAnswers(doubtedNonAnswer, rules, [], {}).teams, ['quality']);
});
