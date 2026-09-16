import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBMISSION_HISTORY_KEY,
  buildSubmissionSnapshot,
  getLastSentSnapshot,
  getNarrativeChangesSince,
  getSubmissionVersion,
  normalizeSubmissionHistory,
  recordSubmission
} from '../src/utils/submissionHistory.js';
import { diffAnswers, getNarrativeQuestionIds, isNarrativeQuestion } from '../src/utils/answersDiff.js';
import {
  PERIMETER_ADDED,
  PERIMETER_CHANGED,
  PERIMETER_REMOVED,
  PERIMETER_UNCHANGED,
  computePerimeterImpact,
  getTeamsToNotifyOfUpdate
} from '../src/utils/perimeterImpact.js';

const questions = [
  { id: 'budget', type: 'number', question: { fr: 'Budget ?' } },
  { id: 'description', type: 'long_text', question: { fr: 'Décrivez le projet' } },
  { id: 'countries', type: 'multi_choice', question: { fr: 'Pays ?' }, options: [{ value: 'fr', label: { fr: 'France' } }] }
];

test('un projet jamais envoyé est en version 0, un projet soumis avant cette fonctionnalité en version 1', () => {
  assert.equal(getSubmissionVersion({ status: 'draft', answers: {} }), 0);
  // Pas d'historique mais déjà soumis : on ne peut pas reconstituer son état d'alors, et
  // prétendre le contraire produirait un diff mensonger.
  assert.equal(getSubmissionVersion({ status: 'submitted', answers: {} }), 1);
  assert.equal(getLastSentSnapshot({}), null);
});

test('l’instantané exclut les clés méta et ne s’imbrique jamais dans lui-même', () => {
  const answers = {
    budget: 200,
    __project_stage__: 'design',
    __compliance_team_comments__: { teams: { quality: { status: 'validated' } } },
    __compliance_manual_teams__: [{ teamId: 'legal' }],
    __submission_kind__: 'final'
  };

  assert.deepEqual(buildSubmissionSnapshot(answers), { budget: 200, __project_stage__: 'design' });

  const sent = recordSubmission(answers, { kind: 'final', at: '2026-03-01T10:00:00.000Z' });
  // Tant que la modification n'est pas envoyée, la référence reste ce que les experts ont reçu.
  const edited = { ...sent, budget: 850 };
  assert.equal(getLastSentSnapshot(edited).budget, 200);

  const resent = recordSubmission(edited, { kind: 'final', at: '2026-04-01T10:00:00.000Z' });
  assert.equal(SUBMISSION_HISTORY_KEY in getLastSentSnapshot(resent), false);
  // …et l'envoi fait de l'état courant la nouvelle référence.
  assert.equal(getLastSentSnapshot(resent).budget, 850);
  assert.equal(getSubmissionVersion({ status: 'submitted', answers: resent }), 2);
  assert.deepEqual(
    normalizeSubmissionHistory(resent[SUBMISSION_HISTORY_KEY]).entries.map((entry) => entry.version),
    [1, 2]
  );
});

test('les changements narratifs sont journalisés par version, jamais notifiés', () => {
  let answers = recordSubmission({ description: 'a' }, { kind: 'final', at: '2026-03-01T10:00:00.000Z' });
  answers = recordSubmission(
    { ...answers, description: 'b' },
    { kind: 'final', narrativeQuestionIds: ['description'], at: '2026-04-01T10:00:00.000Z' }
  );

  assert.equal(getNarrativeChangesSince(answers, 1).length, 1);
  assert.equal(getNarrativeChangesSince(answers, 2).length, 0);
  assert.equal(getNarrativeChangesSince(answers, 0).length, 1);
});

test('le diff ne couvre que les vraies questions et distingue le narratif', () => {
  const changes = diffAnswers(
    { budget: 200, description: 'a', countries: ['fr'], __compliance_team_comments__: { teams: {} } },
    { budget: 850, description: 'b', countries: ['fr'], __compliance_team_comments__: { teams: { x: {} } } },
    questions,
    'fr'
  );

  assert.deepEqual(changes.map((change) => change.questionId), ['budget', 'description']);
  assert.equal(changes[0].previousLabel, '200');
  assert.equal(changes[0].currentLabel, '850');
  assert.equal(changes[0].narrative, false);
  assert.equal(changes[1].narrative, true);
  assert.deepEqual(getNarrativeQuestionIds(changes), ['description']);

  assert.equal(isNarrativeQuestion({ type: 'long_text' }), true);
  assert.equal(isNarrativeQuestion({ type: 'choice' }), false);
});

test('un changement de stade apparaît dans le diff sous son libellé', () => {
  const changes = diffAnswers({ __project_stage__: 'framing' }, { __project_stage__: 'pre_launch' }, questions, 'fr');
  assert.deepEqual(changes.map((change) => change.questionId), ['__project_stage__']);
  assert.equal(changes[0].previousLabel, 'Cadrage');
  assert.equal(changes[0].currentLabel, 'Avant déploiement');
  assert.equal(changes[0].narrative, false);
});

const analysis = (teams, triggeredRules, extra = {}) => ({
  teams,
  notifiedTeams: teams,
  triggeredRules,
  questions: {},
  complexity: 'Faible',
  ...extra
});

test('chaque équipe est classée dans un seul des quatre cas', () => {
  const impact = computePerimeterImpact(
    analysis(['quality', 'legal', 'dpo'], [{ id: 'r1', teams: ['quality'] }, { id: 'r2', teams: ['legal'] }]),
    analysis(
      ['quality', 'legal', 'comms'],
      [{ id: 'r1', teams: ['quality'] }, { id: 'r2', teams: ['legal'] }, { id: 'r3', teams: ['legal'] }]
    )
  );

  assert.equal(impact.byTeam.comms, PERIMETER_ADDED);
  assert.equal(impact.byTeam.legal, PERIMETER_CHANGED);
  assert.equal(impact.byTeam.dpo, PERIMETER_REMOVED);
  assert.equal(impact.byTeam.quality, PERIMETER_UNCHANGED);
  assert.equal(impact.hasImpact, true);

  assert.deepEqual(getTeamsToNotifyOfUpdate(impact), {
    firstSolicitation: ['comms'],
    reReview: ['legal'],
    noLongerConcerned: ['dpo']
  });
});

test('une modification qui ne change rien pour une équipe ne la notifie pas', () => {
  const same = analysis(['quality'], [{ id: 'r1', teams: ['quality'] }]);
  const impact = computePerimeterImpact(same, analysis(['quality'], [{ id: 'r1', teams: ['quality'] }]));

  assert.equal(impact.hasImpact, false);
  assert.deepEqual(impact.unchanged, ['quality']);
  assert.deepEqual(getTeamsToNotifyOfUpdate(impact), {
    firstSolicitation: [],
    reReview: [],
    noLongerConcerned: []
  });
});

test('une équipe dont les questions à préparer changent est à ré-examiner', () => {
  const impact = computePerimeterImpact(
    analysis(['quality'], [{ id: 'r1', teams: ['quality'] }], { questions: { quality: ['Préparer A'] } }),
    analysis(['quality'], [{ id: 'r1', teams: ['quality'] }], { questions: { quality: ['Préparer A', 'Préparer B'] } })
  );

  assert.deepEqual(impact.changed, ['quality']);
});

test('une équipe qui cesse d’être notifiée sans quitter le périmètre est à ré-examiner', () => {
  const impact = computePerimeterImpact(
    analysis(['quality'], [{ id: 'r1', teams: ['quality'] }]),
    { ...analysis(['quality'], [{ id: 'r1', teams: ['quality'] }]), notifiedTeams: [] }
  );

  assert.deepEqual(impact.changed, ['quality']);
});

test('un saut de niveau de risque est signalé même sans changement de périmètre', () => {
  const impact = computePerimeterImpact(
    analysis(['quality'], [{ id: 'r1', teams: ['quality'] }]),
    analysis(['quality'], [{ id: 'r1', teams: ['quality'] }], { complexity: 'Élevé' })
  );

  assert.equal(impact.riskLevelChanged, true);
  assert.equal(impact.hasImpact, false);
});

test('un avis est daté quand il est posé ou repris, pas quand on répond dans le fil', async () => {
  const { isPerimeterReviewPending, stampReviewedVersions } = await import('../src/utils/perimeterReview.js');

  const previous = {
    teams: {
      quality: { status: 'validated', comment: 'RAS', reviewedVersion: 1, needsReviewSince: 2 },
      legal: { status: 'pending_information', comment: '', reviewedVersion: 1 }
    },
    committees: {}
  };

  // L'expert Qualité reprend son avis : il est redaté, donc plus en attente de ré-examen.
  const reviewed = stampReviewedVersions(
    { ...previous, teams: { ...previous.teams, quality: { ...previous.teams.quality, comment: 'Revu, toujours OK' } } },
    previous,
    2
  );
  assert.equal(reviewed.teams.quality.reviewedVersion, 2);
  assert.equal(isPerimeterReviewPending(reviewed.teams.quality), false);

  // Une réponse dans le fil ne redate rien : le périmètre reste à ré-examiner.
  const replied = stampReviewedVersions(
    { ...previous, teams: { ...previous.teams, quality: { ...previous.teams.quality, replies: [{ message: 'ok' }] } } },
    previous,
    2
  );
  assert.equal(replied.teams.quality.reviewedVersion, 1);
  assert.equal(isPerimeterReviewPending(replied.teams.quality), true);

  // Un périmètre que personne n'a touché garde sa version.
  assert.equal(replied.teams.legal.reviewedVersion, 1);
});
