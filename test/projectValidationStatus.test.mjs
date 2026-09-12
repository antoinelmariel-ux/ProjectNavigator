import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProjectValidationStatus,
  getProjectCompliancePerimeters
} from '../src/utils/projectValidationStatus.js';

const COMPLIANCE_KEY = '__compliance_team_comments__';

const teams = [
  { id: 'quality', name: { fr: 'Qualité' } },
  { id: 'legal', name: { fr: 'Juridique' } },
  { id: 'idle', name: { fr: 'Non sollicitée' } }
];

const committeeConfig = {
  enabled: true,
  committees: [
    { id: 'committee-main', name: 'Comité principal', teamTriggers: { minTeamsCount: 1 } },
    {
      id: 'committee-optional',
      name: 'Comité optionnel',
      commentRequired: false,
      teamTriggers: { minTeamsCount: 1 }
    },
    { id: 'committee-never', name: 'Comité jamais déclenché' }
  ]
};

const buildProject = (statuses = {}, teamIds = ['quality', 'legal']) => ({
  id: 'p1',
  status: 'submitted',
  analysis: { teams: teamIds },
  answers: {
    [COMPLIANCE_KEY]: {
      teams: statuses.teams || {},
      committees: statuses.committees || {},
      forcedCommitteeIds: statuses.forcedCommitteeIds || []
    }
  }
});

const options = { teams, validationCommitteeConfig: committeeConfig };

test('périmètres : équipes sollicitées et comités déclenchés seulement', () => {
  const perimeters = getProjectCompliancePerimeters(buildProject(), options);
  assert.deepEqual(
    perimeters.map((entry) => `${entry.type}:${entry.id}:${entry.required}`),
    [
      'team:quality:true',
      'team:legal:true',
      'committee:committee-main:true',
      'committee:committee-optional:false'
    ]
  );
});

test('validé quand tous les avis requis sont favorables', () => {
  const project = buildProject({
    teams: { quality: { status: 'validated' }, legal: { status: 'validated_with_conditions' } },
    committees: { 'committee-main': { status: 'not_concerned' } }
  });

  const result = computeProjectValidationStatus(project, options);
  assert.equal(result.status, 'validated');
  assert.equal(result.requiredCount, 3);
  assert.equal(result.approvedCount, 3);
  assert.equal(result.conditionalCount, 1);
});

test('un comité sans commentaire requis ne bloque pas la validation', () => {
  const project = buildProject({
    teams: { quality: { status: 'validated' }, legal: { status: 'validated' } },
    committees: { 'committee-main': { status: 'validated' } }
  });

  assert.equal(computeProjectValidationStatus(project, options).status, 'validated');
});

test('un seul refus suffit à rendre le projet non validé', () => {
  const project = buildProject({
    teams: { quality: { status: 'validated' }, legal: { status: 'rejected' } },
    committees: { 'committee-main': { status: 'validated' } }
  });

  const result = computeProjectValidationStatus(project, options);
  assert.equal(result.status, 'rejected');
  assert.equal(result.rejectedCount, 1);
});

test('le refus d’un comité non bloquant compte aussi', () => {
  const project = buildProject({
    teams: { quality: { status: 'validated' }, legal: { status: 'validated' } },
    committees: { 'committee-main': { status: 'validated' }, 'committee-optional': { status: 'rejected' } }
  });

  assert.equal(computeProjectValidationStatus(project, options).status, 'rejected');
});

test('en attente : avis manquant ou demande d’informations', () => {
  const missing = buildProject({
    teams: { quality: { status: 'validated' } },
    committees: { 'committee-main': { status: 'validated' } }
  });
  assert.equal(computeProjectValidationStatus(missing, options).status, 'pending');

  const pendingInformation = buildProject({
    teams: { quality: { status: 'validated' }, legal: { status: 'pending_information' } },
    committees: { 'committee-main': { status: 'validated' } }
  });
  assert.equal(computeProjectValidationStatus(pendingInformation, options).status, 'pending');
});

test('aucun périmètre sollicité : pas de statut de validation', () => {
  const project = buildProject({}, []);
  const result = computeProjectValidationStatus(project, options);
  assert.equal(result.status, 'none');
  assert.equal(result.requiredCount, 0);
});

test('un comité ajouté manuellement devient un avis requis', () => {
  const project = buildProject(
    {
      teams: {},
      committees: { 'committee-never': { status: 'validated' } },
      forcedCommitteeIds: ['committee-never']
    },
    []
  );

  const result = computeProjectValidationStatus(project, options);
  assert.equal(result.status, 'validated');
  assert.equal(result.requiredCount, 1);
});

test('commentaires de conformité absents ou mal formés : en attente', () => {
  assert.equal(
    computeProjectValidationStatus({ analysis: { teams: ['quality'] }, answers: {} }, options).status,
    'pending'
  );
  assert.equal(
    computeProjectValidationStatus(
      { analysis: { teams: ['quality'] }, answers: { [COMPLIANCE_KEY]: 'commentaire libre' } },
      options
    ).status,
    'pending'
  );
});
