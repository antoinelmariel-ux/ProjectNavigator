import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_ACTION_IMPLICIT,
  CLAIM_ACTION_RELEASE,
  CLAIM_ACTION_TAKEOVER,
  CLAIM_ACTION_TRANSFER,
  DEFAULT_CLAIM_REMINDER_DAYS,
  DEFAULT_CLAIM_STALE_DAYS,
  applyClaimAction,
  collectTeamClaims,
  getClaimStaleness,
  getPerimeterLastActivityAt,
  getTeamClaim,
  getUnclaimedReminderState,
  markUnclaimedReminderSent,
  isClaimedBy,
  isClaimedByOther,
  isOrphanClaim,
  markClaimReminderSent,
  resolveClaimAwareRecipients,
  resolveClaimCopyRecipients,
  resolveTeamClaimSettings,
  summarizeTeamClaimLoad
} from '../src/utils/projectClaims.js';
import { countBusinessDaysBetween, isBusinessDay } from '../src/utils/businessDays.js';

const TEAM = { id: 'quality', contacts: ['Alice@lfb.fr', 'bob@lfb.fr', 'carla@lfb.fr'] };

const projectWithClaim = (claim, extra = {}) => ({
  id: 'p1',
  projectName: 'Projet A',
  status: 'submitted',
  answers: {
    __compliance_team_comments__: {
      teams: { quality: { status: '', ...extra, claim } }
    }
  }
});

test('jours ouvrés : un vendredi soir au lundi matin ne compte qu’un jour', () => {
  assert.equal(countBusinessDaysBetween('2026-09-11T17:00:00Z', '2026-09-14T08:00:00Z'), 1);
  assert.equal(countBusinessDaysBetween('2026-09-01T10:00:00Z', '2026-09-15T10:00:00Z'), 10);
  assert.equal(countBusinessDaysBetween('2026-09-15T10:00:00Z', '2026-09-15T23:00:00Z'), 0);
  assert.equal(countBusinessDaysBetween('2026-09-15T10:00:00Z', '2026-09-01T10:00:00Z'), 0);
  assert.equal(countBusinessDaysBetween('', '2026-09-15T10:00:00Z'), 0);
  assert.equal(isBusinessDay('2026-09-12'), false);
  assert.equal(isBusinessDay('2026-09-14'), true);
});

test('les délais par équipe ont des valeurs par défaut, et 0 désactive', () => {
  assert.deepEqual(resolveTeamClaimSettings({}), {
    staleDays: DEFAULT_CLAIM_STALE_DAYS,
    reminderDays: DEFAULT_CLAIM_REMINDER_DAYS
  });
  assert.deepEqual(resolveTeamClaimSettings({ claimStaleDays: 3, claimReminderDays: 0 }), {
    staleDays: 3,
    reminderDays: 0
  });
  assert.deepEqual(resolveTeamClaimSettings({ claimStaleDays: -2, claimReminderDays: 'abc' }), {
    staleDays: DEFAULT_CLAIM_STALE_DAYS,
    reminderDays: DEFAULT_CLAIM_REMINDER_DAYS
  });
});

test('revendiquer, reprendre, libérer : historique et normalisation', () => {
  const claimed = applyClaimAction({ status: 'pending_information' }, {
    assigneeEmail: 'Alice@lfb.fr',
    assigneeName: 'Alice Martin',
    actorEmail: 'Alice@lfb.fr',
    now: '2026-09-01T08:00:00Z'
  });

  assert.equal(claimed.claim.assigneeEmail, 'alice@lfb.fr');
  assert.equal(claimed.claim.assignedAt, '2026-09-01T08:00:00Z');
  assert.equal(claimed.status, 'pending_information');
  assert.equal(claimed.claimHistory.length, 1);

  const takenOver = applyClaimAction(claimed, {
    action: CLAIM_ACTION_TAKEOVER,
    assigneeEmail: 'bob@lfb.fr',
    actorEmail: 'bob@lfb.fr',
    reason: 'absence',
    reasonNote: 'Alice en congés',
    now: '2026-09-03T08:00:00Z'
  });

  assert.equal(takenOver.claim.assigneeEmail, 'bob@lfb.fr');
  assert.equal(takenOver.claimHistory.length, 2);
  assert.equal(takenOver.claimHistory[1].previousAssigneeEmail, 'alice@lfb.fr');
  assert.equal(takenOver.claimHistory[1].reason, 'absence');

  const released = applyClaimAction(takenOver, {
    action: CLAIM_ACTION_RELEASE,
    actorEmail: 'bob@lfb.fr',
    now: '2026-09-04T08:00:00Z'
  });

  assert.equal(released.claim, undefined);
  assert.equal(released.claimHistory.length, 3);
  assert.equal(released.claimHistory[2].action, CLAIM_ACTION_RELEASE);
  assert.equal(applyClaimAction({}, { action: CLAIM_ACTION_RELEASE }).claim, undefined);
});

test('la revendication implicite ne réinitialise pas une prise en charge déjà à soi', () => {
  const first = applyClaimAction({}, {
    assigneeEmail: 'alice@lfb.fr',
    actorEmail: 'alice@lfb.fr',
    now: '2026-09-01T08:00:00Z'
  });
  const again = applyClaimAction(first, {
    action: CLAIM_ACTION_IMPLICIT,
    assigneeEmail: 'ALICE@lfb.fr',
    actorEmail: 'alice@lfb.fr',
    now: '2026-09-08T08:00:00Z'
  });

  assert.equal(again, first);
  assert.equal(again.claimHistory.length, 1);
});

test('un périmètre revendiqué se lit depuis le projet', () => {
  const project = projectWithClaim({ assigneeEmail: 'alice@lfb.fr', assignedAt: '2026-09-01T08:00:00Z' });
  assert.equal(getTeamClaim(project, 'quality').assigneeEmail, 'alice@lfb.fr');
  assert.equal(getTeamClaim(project, 'regulatory'), null);
  assert.equal(isClaimedBy(getTeamClaim(project, 'quality'), 'Alice@lfb.fr'), true);
  assert.equal(isClaimedByOther(getTeamClaim(project, 'quality'), 'bob@lfb.fr'), true);
  assert.equal(isClaimedByOther(null, 'bob@lfb.fr'), false);
});

// Avec les valeurs par défaut (3 pour la relance, 6 pour le signalement), la relance par
// e-mail au référent arrive avant le signalement visuel dans la vue charge — les deux réglages
// sont indépendants, l'un ne suppose pas l'autre.
test('péremption : 3 jours ouvrés relancent, 6 signalent, et une activité réarme la relance', () => {
  const entry = {
    claim: { assigneeEmail: 'alice@lfb.fr', assignedAt: '2026-09-01T08:00:00Z' },
    statusUpdatedAt: '2026-09-01T08:00:00Z',
    replies: []
  };

  const early = getClaimStaleness(entry, { team: TEAM, now: '2026-09-03T08:00:00Z' });
  assert.equal(early.businessDaysSinceActivity, 2);
  assert.equal(early.isStale, false);
  assert.equal(early.isReminderDue, false);

  const due = getClaimStaleness(entry, { team: TEAM, now: '2026-09-04T08:00:00Z' });
  assert.equal(due.businessDaysSinceActivity, 3);
  assert.equal(due.isStale, false);
  assert.equal(due.isReminderDue, true);

  const stale = getClaimStaleness(entry, { team: TEAM, now: '2026-09-10T08:00:00Z' });
  assert.equal(stale.businessDaysSinceActivity, 7);
  assert.equal(stale.isStale, true);
  assert.equal(stale.isReminderDue, true);

  const reminded = markClaimReminderSent(entry, '2026-09-10T08:05:00Z');
  assert.equal(getClaimStaleness(reminded, { team: TEAM, now: '2026-09-11T08:00:00Z' }).isReminderDue, false);

  const answered = {
    ...reminded,
    replies: [{ createdAt: '2026-09-14T08:00:00Z', authorEmail: 'owner@lfb.fr' }]
  };
  assert.equal(getPerimeterLastActivityAt(answered), '2026-09-14T08:00:00Z');
  assert.equal(getClaimStaleness(answered, { team: TEAM, now: '2026-09-17T08:00:00Z' }).isReminderDue, true);

  const noDelays = { ...TEAM, claimStaleDays: 0, claimReminderDays: 0 };
  const disabled = getClaimStaleness(entry, { team: noDelays, now: '2026-12-01T08:00:00Z' });
  assert.equal(disabled.isStale, false);
  assert.equal(disabled.isReminderDue, false);
});

test('après prise en charge, les échanges ne partent qu’au référent', () => {
  assert.deepEqual(resolveClaimAwareRecipients(TEAM, {}, null), ['Alice@lfb.fr', 'bob@lfb.fr', 'carla@lfb.fr']);
  assert.deepEqual(resolveClaimAwareRecipients(TEAM, {}, { assigneeEmail: 'BOB@lfb.fr' }), ['bob@lfb.fr']);
});

test('un référent qui n’est plus contact de l’équipe ne crée pas de trou noir', () => {
  const claim = { assigneeEmail: 'gone@lfb.fr' };
  assert.equal(isOrphanClaim(TEAM, claim), true);
  assert.deepEqual(resolveClaimAwareRecipients(TEAM, {}, claim), ['Alice@lfb.fr', 'bob@lfb.fr', 'carla@lfb.fr']);
});

test('le routage par membre reste prioritaire sur la prise en charge', () => {
  const routedTeam = {
    ...TEAM,
    memberRules: [
      {
        email: 'carla@lfb.fr',
        mode: 'include',
        conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: 'q1', operator: 'equals', value: 'oui' }] }]
      }
    ]
  };

  assert.deepEqual(resolveClaimAwareRecipients(routedTeam, { q1: 'non' }, null), ['Alice@lfb.fr', 'bob@lfb.fr']);
  assert.deepEqual(
    resolveClaimAwareRecipients(routedTeam, { q1: 'non' }, { assigneeEmail: 'alice@lfb.fr' }),
    ['Alice@lfb.fr']
  );
});

test('un référent absent voit ses e-mails partir à son suppléant', () => {
  const profiles = new Map([
    ['alice@lfb.fr', { absence: { from: '2026-09-10', to: '2026-09-20', backupEmail: 'bob@lfb.fr' } }]
  ]);

  assert.deepEqual(
    resolveClaimAwareRecipients(TEAM, {}, { assigneeEmail: 'alice@lfb.fr' }, { profiles, now: '2026-09-14T08:00:00Z' }),
    ['bob@lfb.fr']
  );
  assert.deepEqual(
    resolveClaimAwareRecipients(TEAM, {}, { assigneeEmail: 'alice@lfb.fr' }, { profiles, now: '2026-09-30T08:00:00Z' }),
    ['Alice@lfb.fr']
  );
});

test('les copies sont opt-in, excluent le référent et n’élargissent jamais le routage', () => {
  const profiles = new Map([
    ['alice@lfb.fr', { teamPreferences: { quality: { claimCopy: true } } }],
    ['bob@lfb.fr', { teamPreferences: { quality: { claimCopy: true } } }],
    ['carla@lfb.fr', { teamPreferences: { quality: { claimCopy: true } } }]
  ]);

  assert.deepEqual(
    resolveClaimCopyRecipients(TEAM, {}, { assigneeEmail: 'alice@lfb.fr', profiles }),
    ['bob@lfb.fr', 'carla@lfb.fr']
  );

  assert.deepEqual(resolveClaimCopyRecipients(TEAM, {}, { assigneeEmail: 'alice@lfb.fr', profiles: new Map() }), []);
  assert.deepEqual(resolveClaimCopyRecipients(TEAM, {}, { assigneeEmail: 'alice@lfb.fr' }), []);

  const routedTeam = {
    ...TEAM,
    memberRules: [
      {
        email: 'carla@lfb.fr',
        mode: 'include',
        conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: 'q1', operator: 'equals', value: 'oui' }] }]
      }
    ]
  };

  assert.deepEqual(
    resolveClaimCopyRecipients(routedTeam, { q1: 'non' }, { assigneeEmail: 'alice@lfb.fr', profiles }),
    ['bob@lfb.fr']
  );
});

test('la vue charge agrège les prises en charge, les retards et les orphelines', () => {
  const projects = [
    projectWithClaim(
      { assigneeEmail: 'alice@lfb.fr', assignedAt: '2026-09-01T08:00:00Z' },
      { statusUpdatedAt: '2026-09-01T08:00:00Z' }
    ),
    {
      ...projectWithClaim({ assigneeEmail: 'gone@lfb.fr', assignedAt: '2026-09-14T08:00:00Z' }),
      id: 'p2',
      projectName: 'Projet B'
    },
    { id: 'p3', projectName: 'Projet C', answers: {} },
    {
      ...projectWithClaim({ assigneeEmail: 'alice@lfb.fr', assignedAt: '2026-09-01T08:00:00Z' }),
      id: 'p4',
      projectName: 'Projet annulé',
      status: 'cancelled'
    }
  ];

  const summary = summarizeTeamClaimLoad(projects, TEAM, { now: '2026-09-15T08:00:00Z' });

  // Le projet annulé (p4) est hors circuit : il ne pèse ni dans la charge ni dans les alertes.
  assert.equal(summary.claims.length, 2);
  assert.ok(!summary.claims.some((entry) => entry.projectId === 'p4'));
  assert.equal(summary.staleClaims.length, 1);
  assert.equal(summary.orphanClaims.length, 1);
  assert.equal(summary.orphanClaims[0].projectId, 'p2');
  assert.equal(summary.rows.length, 4);
  assert.equal(summary.rows[0].total, 1);
  assert.equal(collectTeamClaims(projects, { id: 'other', contacts: [] }).length, 0);
  assert.equal(collectTeamClaims(null, TEAM).length, 0);
});

test('relance sans prise en charge : due après le délai de l’équipe, comptée depuis la sollicitation', () => {
  const solicitedAt = '2026-09-07T09:00:00Z';
  const early = getUnclaimedReminderState({}, { team: TEAM, solicitedAt, now: '2026-09-09T09:00:00Z' });
  assert.equal(early.isReminderDue, false);
  const due = getUnclaimedReminderState({}, { team: TEAM, solicitedAt, now: '2026-09-10T09:00:00Z' });
  assert.equal(due.isReminderDue, true);
  assert.equal(due.businessDaysSinceReference, DEFAULT_CLAIM_REMINDER_DAYS);
});

test('relance sans prise en charge : unique, désactivable, et muette si prise en charge ou statut', () => {
  const solicitedAt = '2026-09-07T09:00:00Z';
  const now = '2026-09-14T09:00:00Z';
  const sent = markUnclaimedReminderSent({}, now);
  assert.equal(getUnclaimedReminderState(sent, { team: TEAM, solicitedAt, now: '2026-09-30T09:00:00Z' }).isReminderDue, false);
  assert.equal(getUnclaimedReminderState({}, { team: { ...TEAM, claimReminderDays: 0 }, solicitedAt, now }).isReminderDue, false);
  const claim = { assigneeEmail: 'bob@lfb.fr', assignedAt: solicitedAt };
  assert.equal(getUnclaimedReminderState({ claim }, { team: TEAM, solicitedAt, now }).isReminderDue, false);
  assert.equal(getUnclaimedReminderState({ status: 'validated' }, { team: TEAM, solicitedAt, now }).isReminderDue, false);
  assert.equal(getUnclaimedReminderState({}, { team: TEAM, solicitedAt: '', now }).isReminderDue, false);
});

test('relance sans prise en charge : une nouvelle activité réarme le compteur', () => {
  const entry = { ...markUnclaimedReminderSent({}, '2026-09-14T09:00:00Z'), replies: [{ createdAt: '2026-09-15T09:00:00Z' }] };
  assert.equal(getUnclaimedReminderState(entry, { team: TEAM, solicitedAt: '2026-09-07T09:00:00Z', now: '2026-09-17T09:00:00Z' }).isReminderDue, false);
  assert.equal(getUnclaimedReminderState(entry, { team: TEAM, solicitedAt: '2026-09-07T09:00:00Z', now: '2026-09-18T09:00:00Z' }).isReminderDue, true);
});

test('transfert : le référent donne le périmètre, le cédant sort du suivi, l’historique garde le texte', () => {
  const entry = {
    status: '',
    claim: { assigneeEmail: 'alice@lfb.fr', assignedAt: '2026-09-01T10:00:00Z' },
    followers: [{ email: 'alice@lfb.fr' }, { email: 'bob@lfb.fr' }, { email: 'carla@lfb.fr' }]
  };
  const next = applyClaimAction(entry, {
    action: CLAIM_ACTION_TRANSFER,
    assigneeEmail: 'bob@lfb.fr',
    actorEmail: 'alice@lfb.fr',
    reasonNote: 'Je pars en congés',
    now: '2026-09-02T10:00:00Z'
  });
  assert.equal(next.claim.assigneeEmail, 'bob@lfb.fr');
  assert.equal(next.claim.reasonNote, 'Je pars en congés');
  assert.deepEqual(next.followers.map((follower) => follower.email), ['carla@lfb.fr']);
  const last = next.claimHistory.at(-1);
  assert.equal(last.action, CLAIM_ACTION_TRANSFER);
  assert.equal(last.previousAssigneeEmail, 'alice@lfb.fr');
  assert.equal(last.assigneeEmail, 'bob@lfb.fr');
  assert.equal(last.note, 'Je pars en congés');
});

test('transfert : sans prise en charge, ou vers le référent lui-même, rien ne bouge', () => {
  const free = { status: '' };
  assert.equal(applyClaimAction(free, { action: CLAIM_ACTION_TRANSFER, assigneeEmail: 'bob@lfb.fr' }), free);
  const claimed = { claim: { assigneeEmail: 'alice@lfb.fr' } };
  assert.equal(applyClaimAction(claimed, { action: CLAIM_ACTION_TRANSFER, assigneeEmail: 'ALICE@lfb.fr' }), claimed);
});

test('transfert : le dernier suiveur parti, la clé followers disparaît', () => {
  const next = applyClaimAction(
    { claim: { assigneeEmail: 'alice@lfb.fr' }, followers: [{ email: 'bob@lfb.fr' }] },
    { action: CLAIM_ACTION_TRANSFER, assigneeEmail: 'bob@lfb.fr' }
  );
  assert.equal('followers' in next, false);
});
