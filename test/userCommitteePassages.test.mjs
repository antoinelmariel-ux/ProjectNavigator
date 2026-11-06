import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSession } from '../src/utils/committeeSessions.js';
import {
  PASSAGE_ROLE_GUEST,
  PASSAGE_ROLE_OWNER,
  PASSAGE_ROLE_PRESENTER,
  buildParticipantAgenda,
  countUpcomingUserPassages,
  getCommitteePassageHint,
  getUserPassageRole,
  hasUserCommitteePassages,
  listUserCommitteePassages
} from '../src/utils/userCommitteePassages.js';

const KEY = '__compliance_team_comments__';
const NOW = new Date('2030-03-01T10:00:00Z');
const OWNER = 'owner@x.fr';
const CO_OWNER = 'co@x.fr';
const GUEST = 'guest@x.fr';
const PRESENTER = 'speaker@x.fr';

const makeSession = (id, startAt, agenda, extra = {}) => normalizeSession({
  id, committeeId: 'c1', startAt, durationMinutes: 120, status: 'published', agenda, ...extra
});

const projectPassage = (id, projectId, extra = {}) => ({ id, kind: 'project', projectId, minutes: 20, ...extra });
const topicPassage = (id, title, extra = {}) => ({ id, kind: 'topic', title, minutes: 10, ...extra });

const alpha = (committeeEntry = null) => ({
  id: 'p-alpha',
  projectName: 'Alpha',
  ownerEmail: OWNER,
  sharedWith: [CO_OWNER],
  answers: committeeEntry ? { [KEY]: { committees: { c1: committeeEntry } } } : {}
});
const secret = { id: 'p-secret', projectName: 'Projet confidentiel', ownerEmail: 'other@x.fr', answers: {} };

test('roles: owners and co-owners, guests of a passage, presenters of a topic', () => {
  const project = alpha();
  const passage = projectPassage('a1', 'p-alpha', { guests: [GUEST] });
  assert.equal(getUserPassageRole(passage, project, OWNER), PASSAGE_ROLE_OWNER);
  assert.equal(getUserPassageRole(passage, project, 'CO@x.fr'), PASSAGE_ROLE_OWNER);
  assert.equal(getUserPassageRole(passage, project, GUEST), PASSAGE_ROLE_GUEST);
  assert.equal(getUserPassageRole(passage, project, 'nobody@x.fr'), '');
  assert.equal(getUserPassageRole(passage, null, OWNER), '', 'an unloaded (or trashed) project gives no role');
  assert.equal(getUserPassageRole(topicPassage('t1', 'Charte', { presenterEmails: [PRESENTER] }), null, PRESENTER), PASSAGE_ROLE_PRESENTER);
});

test('upcoming first by date, past from the most recent, draft sessions hidden', () => {
  const sessions = [
    makeSession('past1', '2030-01-10T09:00:00Z', [projectPassage('a1', 'p-alpha')]),
    makeSession('past2', '2030-02-10T09:00:00Z', [projectPassage('a2', 'p-alpha')]),
    makeSession('next2', '2030-04-10T09:00:00Z', [projectPassage('a4', 'p-alpha')]),
    makeSession('next1', '2030-03-10T09:00:00Z', [projectPassage('a3', 'p-alpha')]),
    makeSession('draft', '2030-05-10T09:00:00Z', [projectPassage('a5', 'p-alpha')], { status: 'draft' })
  ];
  const result = listUserCommitteePassages({ sessions, projects: [alpha()], email: OWNER, now: NOW });
  assert.deepEqual(result.upcoming.map((entry) => entry.session.id), ['next1', 'next2']);
  assert.deepEqual(result.past.map((entry) => entry.session.id), ['past2', 'past1']);
  assert.deepEqual(result.past.map((entry) => entry.passageNumber), [2, 1]);
  assert.equal(countUpcomingUserPassages(result), 2);
  assert.equal(hasUserCommitteePassages(result), true);
  assert.equal(hasUserCommitteePassages(listUserCommitteePassages({ sessions, projects: [alpha()], email: 'nobody@x.fr', now: NOW })), false);
});

test('a cancelled upcoming session comes first; it is not counted as an upcoming passage', () => {
  const sessions = [
    makeSession('next1', '2030-03-10T09:00:00Z', [projectPassage('a1', 'p-alpha')]),
    makeSession('cancelled', '2030-03-20T09:00:00Z', [projectPassage('a2', 'p-alpha')], { status: 'cancelled' })
  ];
  const result = listUserCommitteePassages({ sessions, projects: [alpha()], email: OWNER, now: NOW });
  assert.deepEqual(result.upcoming.map((entry) => entry.session.id), ['cancelled', 'next1']);
  assert.equal(result.upcoming[0].isCancelled, true);
  assert.equal(countUpcomingUserPassages(result), 1);
});

test('a past passage shows the decision frozen for that session, and flags a current opinion that changed', () => {
  const entry = {
    status: 'validated',
    comment: 'OK final',
    sessionId: 'past2',
    sessionOutcomes: {
      past1: { status: 'validated_with_conditions', comment: 'Revoir le consentement' },
      past2: { status: 'validated', comment: 'OK final' }
    }
  };
  const sessions = [
    makeSession('past1', '2030-01-10T09:00:00Z', [projectPassage('a1', 'p-alpha')]),
    makeSession('past2', '2030-02-10T09:00:00Z', [projectPassage('a2', 'p-alpha')])
  ];
  const { past } = listUserCommitteePassages({ sessions, projects: [alpha(entry)], email: OWNER, now: NOW });
  const [latest, first] = past;
  assert.deepEqual(latest.decision, { status: 'validated', comment: 'OK final' });
  assert.equal(latest.currentOpinionDiffers, false);
  assert.deepEqual(first.decision, { status: 'validated_with_conditions', comment: 'Revoir le consentement' });
  assert.equal(first.currentOpinionDiffers, true);
});

test('no decision recorded is reported as such; a cancelled session carries no decision', () => {
  const sessions = [
    makeSession('past1', '2030-01-10T09:00:00Z', [projectPassage('a1', 'p-alpha')]),
    makeSession('pastCancelled', '2030-01-20T09:00:00Z', [projectPassage('a2', 'p-alpha')], { status: 'cancelled' })
  ];
  const { past } = listUserCommitteePassages({ sessions, projects: [alpha()], email: OWNER, now: NOW });
  assert.deepEqual(past.map((entry) => [entry.session.id, entry.hasDecision, entry.isCancelled]), [
    ['pastCancelled', false, true],
    ['past1', false, false]
  ]);
});

test('a guest sees the decision of the passage they were invited to, and only that one', () => {
  const entry = {
    status: 'rejected',
    comment: 'Non',
    sessionId: 'past2',
    sessionOutcomes: { past1: { status: 'pending_information', comment: 'Compléter' }, past2: { status: 'rejected', comment: 'Non' } }
  };
  const sessions = [
    makeSession('past1', '2030-01-10T09:00:00Z', [projectPassage('a1', 'p-alpha', { guests: [GUEST] })]),
    makeSession('past2', '2030-02-10T09:00:00Z', [projectPassage('a2', 'p-alpha')])
  ];
  const { past } = listUserCommitteePassages({ sessions, projects: [alpha(entry)], email: GUEST, now: NOW });
  assert.equal(past.length, 1);
  assert.equal(past[0].role, PASSAGE_ROLE_GUEST);
  assert.deepEqual(past[0].decision, { status: 'pending_information', comment: 'Compléter' });
  assert.equal(past[0].currentOpinionDiffers, false, 'the current opinion is the owner\'s business, not the guest\'s');
});

test('a topic presenter sees the topic decision', () => {
  const sessions = [makeSession('past1', '2030-01-10T09:00:00Z', [
    topicPassage('t1', 'Charte réseaux', { presenterEmails: [PRESENTER], decision: { status: 'validated', comment: 'Adoptée' } })
  ])];
  const { past } = listUserCommitteePassages({ sessions, projects: [], email: PRESENTER, now: NOW });
  assert.equal(past.length, 1);
  assert.equal(past[0].title, 'Charte réseaux');
  assert.deepEqual(past[0].decision, { status: 'validated', comment: 'Adoptée' });
});

test('participant agenda: every slot, only mine titled; null without a passage', () => {
  const session = makeSession('next1', '2030-03-10T09:00:00Z', [
    projectPassage('s1', 'p-secret'),
    projectPassage('a1', 'p-alpha'),
    topicPassage('t1', 'Point RH')
  ]);
  const agenda = buildParticipantAgenda({ session, sessions: [session], projects: [alpha(), secret], email: OWNER, now: NOW });
  assert.equal(agenda.slots.length, 3);
  assert.deepEqual(agenda.slots.map((slot) => slot.number), [1, 2, 3]);
  assert.deepEqual(agenda.slots.map((slot) => Boolean(slot.entry)), [false, true, false]);
  assert.equal(agenda.slots[1].entry.title, 'Alpha');
  assert.equal(agenda.slots[1].startAt, '2030-03-10T09:20:00.000Z');
  assert.equal(JSON.stringify(agenda.slots.filter((slot) => !slot.entry)).includes('confidentiel'), false);
  assert.equal(JSON.stringify(agenda.slots.filter((slot) => !slot.entry)).includes('Point RH'), false);
  assert.equal(buildParticipantAgenda({ session, sessions: [session], projects: [alpha(), secret], email: 'nobody@x.fr', now: NOW }), null);
});

test('home hint: within 7 days around a session only, a cancellation first', () => {
  const projects = [alpha()];
  const hint = (sessions) => getCommitteePassageHint(listUserCommitteePassages({ sessions, projects, email: OWNER, now: NOW }), NOW);
  assert.equal(hint([makeSession('far', '2030-03-20T09:00:00Z', [projectPassage('a1', 'p-alpha')])]), null);
  assert.equal(hint([makeSession('soon', '2030-03-05T09:00:00Z', [projectPassage('a1', 'p-alpha')])]).kind, 'upcoming');
  assert.equal(hint([
    makeSession('soon', '2030-03-05T09:00:00Z', [projectPassage('a1', 'p-alpha')]),
    makeSession('cancelled', '2030-03-06T09:00:00Z', [projectPassage('a2', 'p-alpha')], { status: 'cancelled' })
  ]).kind, 'cancelled');
  assert.equal(hint([makeSession('recent', '2030-02-25T09:00:00Z', [projectPassage('a1', 'p-alpha')])]).kind, 'recent');
  assert.equal(hint([makeSession('old', '2030-02-10T09:00:00Z', [projectPassage('a1', 'p-alpha')])]), null);
});
