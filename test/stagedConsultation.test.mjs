import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGED_CONSULTATION_KEY,
  getDeferredPerimeters,
  getSolicitablePerimeters,
  getStagedConsultation,
  isStagedConsultationActive,
  withPerimetersSolicited,
  withStagedConsultationClosed,
  withStagedConsultationStart
} from '../src/utils/stagedConsultation.js';
import {
  PROJECT_VALIDATION_PARTIAL,
  PROJECT_VALIDATION_PRELIMINARY,
  PROJECT_VALIDATION_REJECTED,
  computeProjectValidationStatus
} from '../src/utils/projectValidationStatus.js';
import { recordSubmission, getLastSentSnapshot } from '../src/utils/submissionHistory.js';

const COMPLIANCE_KEY = '__compliance_team_comments__';

const teams = [
  { id: 'legal', name: { fr: 'Juridique' } },
  { id: 'quality', name: { fr: 'Qualité' } },
  { id: 'auto', name: { fr: 'Auto' } }
];

const committeeConfig = {
  enabled: true,
  committees: [{ id: 'committee-main', name: 'Comité', teamTriggers: { minTeamsCount: 1 } }]
};

const options = { teams, validationCommitteeConfig: committeeConfig };

const buildProject = (answers = {}, analysis = {}) => ({
  id: 'p1',
  status: 'submitted',
  analysis: { teams: ['legal', 'quality', 'auto'], notifiedTeams: ['legal', 'quality'], ...analysis },
  answers: { __submission_kind__: 'preliminary', ...answers }
});

const ALL_KEYS = ['team:legal', 'team:quality', 'committee:committee-main'];

test('périmètres sollicitables : équipes notifiées et comités, jamais une équipe auto-validée', () => {
  assert.deepEqual(getSolicitablePerimeters(buildProject(), options).map((entry) => entry.key), ALL_KEYS);
});

test('sans marqueur, rien n’est mis de côté', () => {
  assert.deepEqual(getDeferredPerimeters(buildProject(), options), []);
  assert.equal(isStagedConsultationActive(buildProject(), options), false);
});

test('première vague : les périmètres non retenus attendent', () => {
  const answers = withStagedConsultationStart({}, {
    solicitedKeys: ['team:legal'],
    solicitableKeys: ALL_KEYS,
    by: 'owner@lfb.fr',
    at: '2026-10-01T00:00:00.000Z'
  });
  const project = buildProject(answers);
  assert.deepEqual(getDeferredPerimeters(project, options).map((entry) => entry.key), ['team:quality', 'committee:committee-main']);
  assert.equal(getStagedConsultation(answers).waves.length, 1);
});

test('tout retenir referme la consultation par vagues', () => {
  const answers = withStagedConsultationStart({}, { solicitedKeys: ALL_KEYS, solicitableKeys: ALL_KEYS });
  assert.equal(answers[STAGED_CONSULTATION_KEY], undefined);
  assert.equal(isStagedConsultationActive(buildProject(answers), options), false);
});

test('une équipe apparue en cours de route tombe d’elle-même dans « à solliciter ensuite »', () => {
  const answers = withStagedConsultationStart({}, { solicitedKeys: ['team:legal'], solicitableKeys: ['team:legal', 'team:quality'] });
  const project = buildProject(answers, { teams: ['legal'], notifiedTeams: ['legal'] });
  const projectWithNewTeam = buildProject(answers, { teams: ['legal', 'quality'], notifiedTeams: ['legal', 'quality'] });
  assert.deepEqual(getDeferredPerimeters(project, { teams }).map((entry) => entry.key), []);
  assert.deepEqual(getDeferredPerimeters(projectWithNewTeam, { teams }).map((entry) => entry.key), ['team:quality']);
});

test('vague suivante : la consultation se referme quand plus rien n’attend', () => {
  const start = withStagedConsultationStart({}, { solicitedKeys: ['team:legal'], solicitableKeys: ALL_KEYS });
  const second = withPerimetersSolicited(start, { keys: ['team:quality'], solicitableKeys: ALL_KEYS });
  assert.equal(getStagedConsultation(second).isActive, true);
  assert.deepEqual(getDeferredPerimeters(buildProject(second), options).map((entry) => entry.key), ['committee:committee-main']);

  const third = withPerimetersSolicited(second, { keys: ['committee:committee-main'], solicitableKeys: ALL_KEYS });
  assert.equal(getStagedConsultation(third).isActive, false);
  assert.equal(getStagedConsultation(third).waves.length, 3);
  assert.deepEqual(getDeferredPerimeters(buildProject(third), options), []);
});

test('une demande de validation sollicite tout ce qui attendait encore', () => {
  const start = withStagedConsultationStart({}, { solicitedKeys: ['team:legal'], solicitableKeys: ALL_KEYS });
  const closed = withStagedConsultationClosed(start, { solicitableKeys: ALL_KEYS });
  const staged = getStagedConsultation(closed);
  assert.equal(staged.isActive, false);
  assert.deepEqual(staged.waves[1].perimeters, ['team:quality', 'committee:committee-main']);
  assert.deepEqual(withStagedConsultationClosed({ a: 1 }, { solicitableKeys: ALL_KEYS }), { a: 1 });
});

test('verdict : une consultation partielle ne passe jamais pour favorable', () => {
  const start = withStagedConsultationStart({}, { solicitedKeys: ['team:legal'], solicitableKeys: ALL_KEYS });
  const favourable = buildProject({
    ...start,
    [COMPLIANCE_KEY]: { teams: { legal: { status: 'validated' } }, committees: {} }
  });
  const verdict = computeProjectValidationStatus(favourable, options);
  assert.equal(verdict.status, PROJECT_VALIDATION_PARTIAL);
  assert.equal(verdict.deferredCount, 2);

  const rejected = buildProject({
    ...start,
    [COMPLIANCE_KEY]: { teams: { legal: { status: 'rejected' } }, committees: {} }
  });
  assert.equal(computeProjectValidationStatus(rejected, options).status, PROJECT_VALIDATION_REJECTED);

  const allSolicited = withPerimetersSolicited(start, { keys: ALL_KEYS, solicitableKeys: ALL_KEYS });
  const done = buildProject({
    ...allSolicited,
    [COMPLIANCE_KEY]: {
      teams: { legal: { status: 'validated' }, quality: { status: 'validated' } },
      committees: { 'committee-main': { status: 'validated' } }
    }
  });
  assert.equal(computeProjectValidationStatus(done, options).status, PROJECT_VALIDATION_PRELIMINARY);
});

test('le marqueur n’entre pas dans l’instantané d’envoi', () => {
  const answers = withStagedConsultationStart({ q1: 'a' }, { solicitedKeys: ['team:legal'], solicitableKeys: ALL_KEYS });
  const snapshot = getLastSentSnapshot(recordSubmission(answers, { kind: 'preliminary' }));
  assert.deepEqual(snapshot, { q1: 'a' });
});
