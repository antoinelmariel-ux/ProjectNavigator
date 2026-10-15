import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_TRASH_KEY,
  canPermanentlyDeleteProject,
  getProjectTrashEntry,
  getRespondedPerimeters,
  hasExpertResponse,
  isProjectInOwnerTrash,
  isProjectPurgedByOwner,
  isProjectTrashed,
  isRespondingExpert,
  withProjectPurgedByOwner,
  withProjectRestored,
  withProjectTrashed
} from '../src/utils/projectTrash.js';

const project = (answers = {}, extra = {}) => ({
  id: 'p1',
  ownerEmail: 'owner@lfb.fr',
  sharedWith: ['coowner@lfb.fr'],
  answers,
  ...extra
});

test('mettre à la corbeille, restaurer et purger côté porteur', () => {
  const trashed = project(withProjectTrashed({ projectName: 'X' }, { by: 'Owner@lfb.fr', at: '2026-10-01T00:00:00Z' }));
  assert.equal(isProjectTrashed(trashed), true);
  assert.equal(isProjectInOwnerTrash(trashed), true);
  assert.equal(isProjectPurgedByOwner(trashed), false);
  assert.deepEqual(getProjectTrashEntry(trashed), {
    deletedAt: '2026-10-01T00:00:00Z',
    deletedBy: 'owner@lfb.fr',
    purgedByOwnerAt: '',
    purgedBy: ''
  });

  const restored = project(withProjectRestored(trashed.answers));
  assert.equal(isProjectTrashed(restored), false);
  assert.equal(PROJECT_TRASH_KEY in restored.answers, false);
  assert.equal(restored.answers.projectName, 'X');

  const purged = project(withProjectPurgedByOwner(trashed.answers, { by: 'owner@lfb.fr', at: '2026-10-02T00:00:00Z' }));
  assert.equal(isProjectTrashed(purged), true);
  assert.equal(isProjectInOwnerTrash(purged), false);
  assert.equal(isProjectPurgedByOwner(purged), true);
  assert.equal(getProjectTrashEntry(purged).deletedAt, '2026-10-01T00:00:00Z');
});

test('un marqueur invalide ne met pas le projet à la corbeille', () => {
  assert.equal(isProjectTrashed(project({ [PROJECT_TRASH_KEY]: {} })), false);
  assert.equal(isProjectTrashed(project({ [PROJECT_TRASH_KEY]: 'yes' })), false);
  assert.equal(isProjectTrashed(project()), false);
  assert.equal(isProjectTrashed(null), false);
});

test('sans réponse d’expert, la suppression définitive est possible', () => {
  assert.equal(canPermanentlyDeleteProject(project()), true);
  // Une prise en charge seule n'est pas un avis.
  const claimedOnly = project({
    __compliance_team_comments__: { teams: { legal: { claim: { assigneeEmail: 'x@lfb.fr' }, comment: '<p>&nbsp;</p>' } } }
  });
  assert.equal(canPermanentlyDeleteProject(claimedOnly), true);
  // Une réponse du porteur ou d'un co-porteur dans le fil ne compte pas.
  const ownerReply = project({
    __compliance_team_comments__: {
      teams: { legal: { replies: [{ authorEmail: 'Owner@lfb.fr' }, { authorEmail: 'coowner@lfb.fr' }] } }
    }
  });
  assert.equal(canPermanentlyDeleteProject(ownerReply), true);
});

test('un statut, un commentaire ou une réponse d’expert bloquent la suppression définitive', () => {
  assert.equal(hasExpertResponse(project({
    __compliance_team_comments__: { teams: { legal: { status: 'pending_information' } } }
  })), true);
  assert.equal(hasExpertResponse(project({
    __compliance_team_comments__: { committees: { codir: { comment: '<p>Avis</p>' } } }
  })), true);
  assert.equal(hasExpertResponse(project({
    __compliance_team_comments__: { teams: { legal: { replies: [{ authorEmail: 'expert@lfb.fr' }] } } }
  })), true);
});

test('getRespondedPerimeters restreint les réponses aux contacts de l’équipe quand ils sont connus', () => {
  const p = project({
    __compliance_team_comments__: {
      teams: {
        legal: { replies: [{ authorEmail: 'outsider@lfb.fr' }] },
        quality: { replies: [{ authorEmail: 'Expert@lfb.fr' }] },
        rgpd: { status: 'validated' }
      },
      committees: { codir: { comment: 'ok' } }
    }
  });

  assert.deepEqual(getRespondedPerimeters(p, {
    contactsByTeamId: { legal: ['legal@lfb.fr'], quality: ['expert@lfb.fr'], rgpd: [] }
  }), { teamIds: ['quality', 'rgpd'], committeeIds: ['codir'] });
});

test('isRespondingExpert ne reconnaît que les contacts d’un périmètre qui a répondu', () => {
  const p = project({
    __compliance_team_comments__: {
      teams: { legal: { status: 'validated' }, quality: {} },
      committees: { codir: { comment: 'ok' } }
    }
  });
  const options = {
    contactsByTeamId: { legal: ['Legal@lfb.fr'], quality: ['quality@lfb.fr'] },
    emailsByCommitteeId: { codir: ['codir@lfb.fr'] }
  };
  assert.equal(isRespondingExpert(p, 'legal@lfb.fr', options), true);
  assert.equal(isRespondingExpert(p, 'codir@lfb.fr', options), true);
  assert.equal(isRespondingExpert(p, 'quality@lfb.fr', options), false);
  assert.equal(isRespondingExpert(p, 'owner@lfb.fr', options), false);
  assert.equal(isRespondingExpert(p, '', options), false);
});
