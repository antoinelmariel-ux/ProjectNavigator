import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCompleteValidationReached,
  resolveCompleteValidationCopyRecipients
} from '../src/utils/completeValidation.js';
import { NOTIFICATION_TYPES, buildNotification } from '../src/utils/notificationTemplates.js';

const KEY = '__compliance_team_comments__';

const teams = [
  { id: 'quality', name: { fr: 'Qualité' }, contacts: ['alice@lfb.fr', 'bob@lfb.fr'] },
  { id: 'legal', name: { fr: 'Juridique' }, contacts: ['carol@lfb.fr'] }
];

const options = { teams, validationCommitteeConfig: { enabled: false, committees: [] } };

const buildProject = (entries = {}, extra = {}) => ({
  id: 'p1',
  status: 'submitted',
  projectName: 'Projet test',
  ownerEmail: 'owner@lfb.fr',
  analysis: { teams: ['quality', 'legal'] },
  answers: { [KEY]: { teams: entries, committees: {}, forcedCommitteeIds: [] } },
  ...extra
});

test('la validation complète n’est signalée qu’au passage à « validé »', () => {
  const before = buildProject({ quality: { status: 'validated' } });
  const after = buildProject({ quality: { status: 'validated' }, legal: { status: 'validated_with_conditions' } });

  assert.equal(isCompleteValidationReached(before, after, options), true);
  // Déjà validé avant l'écriture : un avis qui change de commentaire ne renvoie rien.
  assert.equal(isCompleteValidationReached(after, after, options), false);
  // Il manque encore un avis : rien.
  assert.equal(isCompleteValidationReached(buildProject(), before, options), false);
});

test('une validation périmée qui redevient valide compte, un refus ne compte pas', () => {
  const outdated = buildProject({
    quality: { status: 'validated' },
    legal: { status: 'validated', needsReviewSince: 3, reviewedVersion: 1 }
  });
  const reconfirmed = buildProject({
    quality: { status: 'validated' },
    legal: { status: 'validated', needsReviewSince: 3, reviewedVersion: 3 }
  });
  assert.equal(isCompleteValidationReached(outdated, reconfirmed, options), true);

  const rejected = buildProject({ quality: { status: 'validated' }, legal: { status: 'rejected' } });
  assert.equal(isCompleteValidationReached(buildProject(), rejected, options), false);
});

test('copies : seul le référent qui l’a demandé est prévenu, pour son équipe', () => {
  const project = buildProject({
    quality: { status: 'validated', claim: { assigneeEmail: 'ALICE@lfb.fr' } },
    legal: { status: 'validated', claim: { assigneeEmail: 'carol@lfb.fr' } }
  });
  const profiles = {
    'alice@lfb.fr': { teamPreferences: { quality: { completeValidationCopy: true } } },
    // Carol a demandé la copie pour une autre équipe que celle dont elle s'est saisie.
    'carol@lfb.fr': { teamPreferences: { quality: { completeValidationCopy: true } } },
    'bob@lfb.fr': { teamPreferences: { quality: { completeValidationCopy: true } } }
  };

  assert.deepEqual(resolveCompleteValidationCopyRecipients(project, { teams, profiles }), [
    { email: 'alice@lfb.fr', teamId: 'quality' }
  ]);
});

test('copies : désactivées par défaut, rien sans profil, rien pour un référent qui a quitté l’équipe', () => {
  const claimed = buildProject({ quality: { status: 'validated', claim: { assigneeEmail: 'alice@lfb.fr' } } });
  assert.deepEqual(resolveCompleteValidationCopyRecipients(claimed, { teams, profiles: {} }), []);
  assert.deepEqual(resolveCompleteValidationCopyRecipients(claimed, { teams, profiles: null }), []);

  const optedIn = { 'alice@lfb.fr': { teamPreferences: { quality: { completeValidationCopy: true } } } };
  const orphan = buildProject({ quality: { status: 'validated', claim: { assigneeEmail: 'ghost@lfb.fr' } } });
  assert.deepEqual(
    resolveCompleteValidationCopyRecipients(orphan, { teams, profiles: { 'ghost@lfb.fr': optedIn['alice@lfb.fr'] } }),
    []
  );

  const noClaim = buildProject({ quality: { status: 'validated' } });
  assert.deepEqual(resolveCompleteValidationCopyRecipients(noClaim, { teams, profiles: optedIn }), []);
});

test('les deux gabarits existent et restent en anglais', () => {
  [NOTIFICATION_TYPES.PROJECT_FULLY_VALIDATED_OWNER, NOTIFICATION_TYPES.PROJECT_FULLY_VALIDATED_TEAM].forEach((type) => {
    const notification = buildNotification({
      type,
      projectName: 'Projet test',
      actorName: 'Alice',
      teamNames: ['Qualité'],
      appUrl: 'https://example.test/?project=p1'
    });
    assert.match(notification.subject, /Project validated by all teams/);
    assert.match(notification.body, /validated by all the teams and committees concerned/);
  });
});
