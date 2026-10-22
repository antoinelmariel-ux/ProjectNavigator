import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOLLOWER_ACTION_ADD,
  FOLLOWER_ACTION_REMOVE,
  applyFollowerAction,
  getPerimeterFollowers,
  isPerimeterFollower,
  normalizePerimeterFollowers,
  preservePerimeterFollowers,
  resolveTeamFollowerContacts
} from '../src/utils/perimeterFollowers.js';
import { MEMBER_TRIGGER_MODE_NEVER, resolveTeamRecipients } from '../src/utils/teamMemberRules.js';
import { resolveClaimAwareRecipients } from '../src/utils/projectClaims.js';

const TEAM = { id: 'quality', contacts: ['Alice@lfb.fr', 'bob@lfb.fr', 'carla@lfb.fr'] };

const answersWithEntry = (entry) => ({
  __compliance_team_comments__: { teams: { quality: entry } }
});

test('ajouter un suiveur l’enregistre une seule fois, normalisé, avec son auteur', () => {
  const once = applyFollowerAction({ status: '' }, {
    action: FOLLOWER_ACTION_ADD,
    email: ' Bob@LFB.fr ',
    actorEmail: 'Alice@lfb.fr',
    now: '2026-10-22T10:00:00.000Z'
  });
  assert.deepEqual(once.followers, [
    { email: 'bob@lfb.fr', addedByEmail: 'alice@lfb.fr', addedAt: '2026-10-22T10:00:00.000Z' }
  ]);
  assert.equal(once.status, '');

  const twice = applyFollowerAction(once, { action: FOLLOWER_ACTION_ADD, email: 'bob@lfb.fr' });
  assert.equal(twice, once);
  assert.ok(isPerimeterFollower(once, 'BOB@lfb.fr'));
});

test('retirer le dernier suiveur efface le champ, retirer un absent ne change rien', () => {
  const entry = applyFollowerAction({}, { action: FOLLOWER_ACTION_ADD, email: 'bob@lfb.fr' });
  const removed = applyFollowerAction(entry, { action: FOLLOWER_ACTION_REMOVE, email: 'bob@lfb.fr' });
  assert.equal('followers' in removed, false);
  assert.equal(applyFollowerAction(removed, { action: FOLLOWER_ACTION_REMOVE, email: 'bob@lfb.fr' }), removed);
});

test('la normalisation écarte doublons et entrées vides', () => {
  assert.deepEqual(
    normalizePerimeterFollowers(['bob@lfb.fr', { email: 'BOB@lfb.fr' }, null, { email: '' }]).map((f) => f.email),
    ['bob@lfb.fr']
  );
  assert.deepEqual(getPerimeterFollowers(null), []);
});

test('un suiveur qui n’est plus contact de l’équipe n’est plus destinataire', () => {
  const answers = answersWithEntry({ followers: [{ email: 'bob@lfb.fr' }, { email: 'gone@lfb.fr' }] });
  assert.deepEqual(resolveTeamFollowerContacts(TEAM, answers), ['bob@lfb.fr']);
});

test('un suiveur reçoit les notifications même si le routage par membre l’écarte', () => {
  const team = { ...TEAM, memberRules: [{ email: 'bob@lfb.fr', mode: MEMBER_TRIGGER_MODE_NEVER }] };
  assert.deepEqual(resolveTeamRecipients(team, {}), ['Alice@lfb.fr', 'carla@lfb.fr']);
  assert.deepEqual(
    resolveTeamRecipients(team, answersWithEntry({ followers: [{ email: 'bob@lfb.fr' }] })),
    ['Alice@lfb.fr', 'carla@lfb.fr', 'bob@lfb.fr']
  );
});

test('une fois le périmètre pris en charge, le référent et les suiveurs sont notifiés', () => {
  const claim = { assigneeEmail: 'alice@lfb.fr' };
  assert.deepEqual(resolveClaimAwareRecipients(TEAM, answersWithEntry({ claim }), claim), ['Alice@lfb.fr']);
  const answers = answersWithEntry({ claim, followers: [{ email: 'carla@lfb.fr' }, { email: 'alice@lfb.fr' }] });
  assert.deepEqual(resolveClaimAwareRecipients(TEAM, answers, claim), ['Alice@lfb.fr', 'carla@lfb.fr']);
});

test('un enregistrement de commentaire ne peut ni effacer ni modifier les suiveurs', () => {
  const previous = { teams: { quality: { comment: '', followers: [{ email: 'bob@lfb.fr' }] } } };
  const fromStaleDraft = { teams: { quality: { comment: 'Avis' } } };
  const preserved = preservePerimeterFollowers(fromStaleDraft, previous);
  assert.deepEqual(preserved.teams.quality.followers.map((f) => f.email), ['bob@lfb.fr']);
  assert.equal(preserved.teams.quality.comment, 'Avis');

  const injected = { teams: { quality: { comment: 'Avis', followers: [{ email: 'carla@lfb.fr' }] } } };
  assert.equal('followers' in preservePerimeterFollowers(injected, { teams: {} }).teams.quality, false);

  const untouched = { teams: { quality: { comment: 'Avis', followers: [{ email: 'bob@lfb.fr' }] } } };
  assert.equal(preservePerimeterFollowers(untouched, previous), untouched);
  assert.equal(preservePerimeterFollowers(undefined, previous), undefined);
});
