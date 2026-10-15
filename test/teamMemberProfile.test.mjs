import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAbsenceSubstitution,
  getAbsentTeamContacts,
  getActiveAbsence,
  isAbsenceActive,
  normalizeAbsence,
  normalizeTeamPreferences,
  resolveAbsenceBackupContact,
  setTeamPreference,
  wantsClaimCopy
} from '../src/utils/teamMemberProfile.js';

const TEAM = { id: 'quality', contacts: ['alice@lfb.fr', 'bob@lfb.fr'] };

test('les copies sont désactivées par défaut et ne stockent que les cases cochées', () => {
  assert.deepEqual(normalizeTeamPreferences(undefined), {});
  assert.deepEqual(normalizeTeamPreferences({ quality: { claimCopy: false } }), {});
  assert.deepEqual(normalizeTeamPreferences({ quality: { claimCopy: true }, '': { claimCopy: true } }), {
    quality: { claimCopy: true }
  });

  assert.equal(wantsClaimCopy({ teamPreferences: { quality: { claimCopy: true } } }, 'quality'), true);
  assert.equal(wantsClaimCopy({ teamPreferences: { quality: { claimCopy: true } } }, 'regulatory'), false);
  assert.equal(wantsClaimCopy(null, 'quality'), false);

  const enabled = setTeamPreference({}, 'quality', { claimCopy: true });
  assert.deepEqual(enabled, { quality: { claimCopy: true } });
  assert.deepEqual(setTeamPreference(enabled, 'quality', { claimCopy: false }), {});
});

test('une absence sans borne ni suppléant n’est pas une absence', () => {
  assert.equal(normalizeAbsence({}), null);
  assert.equal(normalizeAbsence({ from: '', to: '', backupEmail: '' }), null);
  assert.deepEqual(normalizeAbsence({ from: '2026-09-10T00:00:00Z', to: '2026-09-20', backupEmail: 'BOB@lfb.fr' }), {
    from: '2026-09-10',
    to: '2026-09-20',
    backupEmail: 'bob@lfb.fr',
    updatedByEmail: '',
    updatedAt: ''
  });
});

test('les bornes d’absence sont inclusives', () => {
  const absence = { from: '2026-09-10', to: '2026-09-20', backupEmail: 'bob@lfb.fr' };
  assert.equal(isAbsenceActive(absence, '2026-09-09T23:00:00Z'), false);
  assert.equal(isAbsenceActive(absence, '2026-09-10T06:00:00Z'), true);
  assert.equal(isAbsenceActive(absence, '2026-09-20T23:00:00Z'), true);
  assert.equal(isAbsenceActive(absence, '2026-09-21T06:00:00Z'), false);
  assert.equal(isAbsenceActive({ from: '2026-09-10' }, '2030-01-01T00:00:00Z'), true);
});

test('un suppléant qui n’est pas contact de l’équipe est ignoré', () => {
  assert.equal(resolveAbsenceBackupContact(TEAM, { backupEmail: 'bob@lfb.fr' }), 'bob@lfb.fr');
  assert.equal(resolveAbsenceBackupContact(TEAM, { backupEmail: 'outsider@lfb.fr' }), '');

  const profiles = { 'alice@lfb.fr': { absence: { from: '2026-09-10', to: '2026-09-20', backupEmail: 'outsider@lfb.fr' } } };
  assert.deepEqual(
    applyAbsenceSubstitution(['alice@lfb.fr'], { team: TEAM, profiles, now: '2026-09-14T08:00:00Z' }),
    ['alice@lfb.fr']
  );
});

test('la substitution ne duplique pas un suppléant déjà destinataire', () => {
  const profiles = new Map([
    ['alice@lfb.fr', { absence: { from: '2026-09-10', to: '2026-09-20', backupEmail: 'bob@lfb.fr' } }]
  ]);

  assert.deepEqual(
    applyAbsenceSubstitution(['alice@lfb.fr', 'bob@lfb.fr'], { team: TEAM, profiles, now: '2026-09-14T08:00:00Z' }),
    ['bob@lfb.fr']
  );
  assert.deepEqual(applyAbsenceSubstitution(['alice@lfb.fr'], { team: TEAM }), ['alice@lfb.fr']);
  assert.equal(getActiveAbsence(profiles, 'alice@lfb.fr', '2026-09-14T08:00:00Z').backupEmail, 'bob@lfb.fr');
  assert.equal(getActiveAbsence(profiles, 'bob@lfb.fr', '2026-09-14T08:00:00Z'), null);
  assert.equal(getAbsentTeamContacts(TEAM, profiles, '2026-09-14T08:00:00Z').length, 1);
});
