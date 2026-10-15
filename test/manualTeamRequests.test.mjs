import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANUAL_TEAM_REQUESTS_KEY,
  addManualTeamRequest,
  normalizeManualTeamRequests
} from '../src/utils/manualTeamRequests.js';

test('normalizeManualTeamRequests ignore les entrées invalides et les doublons', () => {
  assert.deepEqual(normalizeManualTeamRequests(undefined), []);
  assert.deepEqual(normalizeManualTeamRequests(null), []);
  assert.deepEqual(normalizeManualTeamRequests([{ teamId: '' }, { }, 'nope']), []);

  const normalized = normalizeManualTeamRequests([
    { teamId: 'quality', requestedBy: 'alice@lfb.fr', requestedAt: '2026-09-10T00:00:00Z' },
    { teamId: 'quality', requestedBy: 'bob@lfb.fr', requestedAt: '2026-09-11T00:00:00Z' }
  ]);
  assert.deepEqual(normalized, [
    { teamId: 'quality', requestedBy: 'alice@lfb.fr', requestedAt: '2026-09-10T00:00:00Z' }
  ]);
});

test('addManualTeamRequest ajoute une équipe une seule fois', () => {
  const first = addManualTeamRequest([], { teamId: 'quality', requestedBy: 'alice@lfb.fr' });
  assert.equal(first.length, 1);
  assert.equal(first[0].teamId, 'quality');
  assert.equal(first[0].requestedBy, 'alice@lfb.fr');
  assert.equal(typeof first[0].requestedAt, 'string');

  const second = addManualTeamRequest(first, { teamId: 'quality', requestedBy: 'bob@lfb.fr' });
  assert.deepEqual(second, first);

  const third = addManualTeamRequest(second, { teamId: 'regulatory', requestedBy: 'bob@lfb.fr' });
  assert.equal(third.length, 2);
  assert.deepEqual(third.map((entry) => entry.teamId), ['quality', 'regulatory']);
});

test('addManualTeamRequest ignore un teamId vide', () => {
  const result = addManualTeamRequest([{ teamId: 'quality', requestedBy: '', requestedAt: '' }], { teamId: '   ' });
  assert.deepEqual(result, [{ teamId: 'quality', requestedBy: '', requestedAt: '' }]);
});

test('la clé exportée reste stable (persistée dans les réponses projet)', () => {
  assert.equal(MANUAL_TEAM_REQUESTS_KEY, '__compliance_manual_teams__');
});
