import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMITTEE_REQUESTS_KEY,
  getCommitteeRequests,
  getForcedCommitteeIds,
  getRequestedCommitteeIds,
  isCommitteeRequested,
  withCommitteeRequestWithdrawn,
  withCommitteeRequested
} from '../src/utils/committeeRequests.js';
import {
  getRequestableValidationCommittees,
  getTriggeredValidationCommittees,
  isCommitteeRequestableByOwner,
  normalizeValidationCommitteeConfig
} from '../src/utils/validationCommittee.js';
import {
  getDeferredPerimeters,
  getSolicitablePerimeters,
  withPerimetersSolicited,
  withStagedConsultationStart
} from '../src/utils/stagedConsultation.js';
import {
  PROJECT_VALIDATION_PENDING,
  computeProjectValidationStatus,
  getProjectCompliancePerimeters
} from '../src/utils/projectValidationStatus.js';
import { recordSubmission, getLastSentSnapshot } from '../src/utils/submissionHistory.js';

const COMPLIANCE_KEY = '__compliance_team_comments__';

const config = (onDemand) => ({
  enabled: true,
  committees: [{ id: 'comite-a', name: 'Comité A', onDemand }]
});

const context = (overrides = {}) => ({ answers: {}, analysis: { risks: [], triggeredRules: [] }, relevantTeams: [], ...overrides });

test('un comité n’est pas ouvert à la demande par défaut', () => {
  const normalized = normalizeValidationCommitteeConfig({ committees: [{ id: 'c1', name: 'C1' }] });
  assert.equal(normalized.committees[0].onDemand.enabled, false);
  assert.equal(isCommitteeRequestableByOwner(normalized.committees[0], context()), false);
});

test('ouvert à la demande sans critère : toujours sollicitable', () => {
  const [committee] = normalizeValidationCommitteeConfig(config({ enabled: true })).committees;
  assert.equal(isCommitteeRequestableByOwner(committee, context()), true);
});

test('ouvert à la demande avec critères : sollicitable seulement si le projet en remplit un', () => {
  const [committee] = normalizeValidationCommitteeConfig(config({
    enabled: true,
    teamTriggers: { minTeamsCount: 2 }
  })).committees;

  const twoTeams = context({ relevantTeams: [{ id: 't1' }, { id: 't2' }] });
  const oneTeam = context({ relevantTeams: [{ id: 't1' }] });
  assert.equal(isCommitteeRequestableByOwner(committee, twoTeams), true);
  assert.equal(isCommitteeRequestableByOwner(committee, oneTeam), false);
});

test('les critères à la demande sont indépendants du déclenchement automatique', () => {
  const normalized = normalizeValidationCommitteeConfig({
    enabled: true,
    committees: [{
      id: 'comite-a',
      name: 'Comité A',
      teamTriggers: { minTeamsCount: 5 },
      onDemand: { enabled: true, teamTriggers: { minTeamsCount: 1 } }
    }]
  });
  const ctx = context({ relevantTeams: [{ id: 't1' }] });
  assert.deepEqual(getTriggeredValidationCommittees(normalized, ctx), []);
  assert.equal(getRequestableValidationCommittees(normalized, ctx).length, 1);
});

test('un comité déjà déclenché, ou déjà sollicité, n’est plus à solliciter', () => {
  const normalized = normalizeValidationCommitteeConfig(config({ enabled: true }));
  assert.equal(getRequestableValidationCommittees(normalized, context()).length, 1);
  assert.equal(
    getRequestableValidationCommittees(normalized, context({ forcedCommitteeIds: ['comite-a'] })).length,
    0
  );
});

test('la demande est stockée avec son auteur et sa date, et une seule fois', () => {
  const first = withCommitteeRequested({ a: 1 }, 'comite-a', { by: 'me@lfb.fr', at: '2026-01-01T00:00:00.000Z' });
  assert.deepEqual(getCommitteeRequests(first), {
    'comite-a': { requestedAt: '2026-01-01T00:00:00.000Z', requestedBy: 'me@lfb.fr' }
  });
  assert.equal(first.a, 1);
  assert.equal(withCommitteeRequested(first, 'comite-a', { by: 'other@lfb.fr' }), first);
  assert.deepEqual(getRequestedCommitteeIds(first), ['comite-a']);
  assert.equal(isCommitteeRequested(first, 'comite-a'), true);
});

test('retirer la demande l’efface, et ne fait rien si elle n’existe pas', () => {
  const requested = withCommitteeRequested({}, 'comite-a', { by: 'me@lfb.fr' });
  const withdrawn = withCommitteeRequestWithdrawn(requested, 'comite-a');
  assert.deepEqual(getCommitteeRequests(withdrawn), {});
  assert.equal(isCommitteeRequested(withdrawn, 'comite-a'), false);
  const untouched = { a: 1 };
  assert.equal(withCommitteeRequestWithdrawn(untouched, 'comite-a'), untouched);
});

test('les comités forcés réunissent la réintégration d’un expert et la demande du porteur', () => {
  const answers = withCommitteeRequested(
    { [COMPLIANCE_KEY]: { forcedCommitteeIds: ['comite-b'] } },
    'comite-a',
    { by: 'me@lfb.fr' }
  );
  assert.deepEqual(getForcedCommitteeIds(answers).sort(), ['comite-a', 'comite-b']);
  assert.deepEqual(getForcedCommitteeIds({}), []);
});

test('un avis d’expert qui réécrit les commentaires ne perd pas la demande', () => {
  const answers = withCommitteeRequested({}, 'comite-a', { by: 'me@lfb.fr' });
  const afterExpertSave = { ...answers, [COMPLIANCE_KEY]: { teams: {}, committees: {}, forcedCommitteeIds: [], legacy: '' } };
  assert.deepEqual(getRequestedCommitteeIds(afterExpertSave), ['comite-a']);
});

const requestProject = (answers = {}) => ({
  id: 'p1',
  status: 'submitted',
  analysis: { teams: [], notifiedTeams: [] },
  answers
});

const requestOptions = { teams: [], validationCommitteeConfig: config({ enabled: true }) };

test('un comité sollicité devient un périmètre du projet', () => {
  const before = requestProject();
  const after = requestProject(withCommitteeRequested({}, 'comite-a', { by: 'me@lfb.fr' }));

  assert.deepEqual(getProjectCompliancePerimeters(before, requestOptions).filter((p) => p.type === 'committee'), []);
  assert.deepEqual(
    getProjectCompliancePerimeters(after, requestOptions).filter((p) => p.type === 'committee').map((p) => p.id),
    ['comite-a']
  );
  const status = computeProjectValidationStatus(after, requestOptions);
  assert.equal(status.status, PROJECT_VALIDATION_PENDING);
  assert.equal(status.requiredCount, 1);
});

test('en consultation par vagues, la demande sollicite le comité au lieu de le laisser différé', () => {
  const baseAnswers = withStagedConsultationStart(
    { __submission_kind__: 'preliminary' },
    { solicitedKeys: [], solicitableKeys: ['team:legal'], by: 'me@lfb.fr' }
  );
  const requested = withCommitteeRequested(baseAnswers, 'comite-a', { by: 'me@lfb.fr' });
  const project = { ...requestProject(requested) };

  const deferredBefore = getDeferredPerimeters(project, requestOptions).map((p) => p.key);
  assert.deepEqual(deferredBefore, ['committee:comite-a']);

  const solicited = withPerimetersSolicited(requested, {
    keys: ['committee:comite-a'],
    solicitableKeys: getSolicitablePerimeters(project, requestOptions).map((p) => p.key),
    by: 'me@lfb.fr'
  });
  assert.deepEqual(
    getDeferredPerimeters({ ...project, answers: solicited }, requestOptions).map((p) => p.key),
    []
  );
});

test('la demande n’entre pas dans le diff ni dans l’instantané du dernier envoi', () => {
  const answers = withCommitteeRequested({ q1: 'oui' }, 'comite-a', { by: 'me@lfb.fr' });
  const recorded = recordSubmission(answers, { kind: 'final', changes: [] });
  const snapshot = getLastSentSnapshot(recorded);
  assert.ok(snapshot);
  assert.equal(COMMITTEE_REQUESTS_KEY in snapshot, false);
});
