import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionAction,
  buildDraftSessions,
  buildSessionTimeline,
  countUnbookedTriggeredProjects,
  generateSessionDates,
  getBookableSessions,
  getCurrentPassageSessionId,
  getDueOwnerReminder,
  getPassageAttendance,
  getPendingRepresentationRequest,
  getPlanningReminderSession,
  getProjectPassages,
  getRemainingMinutes,
  getUpcomingProjectPassage,
  normalizePassageMinutes,
  summarizeAttendance,
  SESSION_STATUS_PUBLISHED
} from '../src/utils/committeeSessions.js';

const committee = { id: 'c1', emails: ['a@lfb.fr', 'b@lfb.fr', 'p@lfb.fr'], presidentEmail: 'p@lfb.fr', defaultPassageMinutes: 20 };
const now = new Date('2026-11-02T09:00:00');
const at = (iso) => new Date(iso).toISOString();

const session = (overrides = {}) => ({
  id: 's1',
  committeeId: 'c1',
  startAt: at('2026-11-10T14:00:00'),
  durationMinutes: 60,
  status: SESSION_STATUS_PUBLISHED,
  agenda: [],
  ...overrides
});

const book = (target, projectId, context = {}) =>
  applySessionAction(target, { type: 'book', projectId, passageId: `p-${projectId}` }, { actorEmail: 'owner@lfb.fr', now, defaultPassageMinutes: 20, ...context });

test('une séance d’une heure accueille trois passages de 20 min, pas un quatrième', () => {
  let current = session();
  for (const projectId of ['a', 'b', 'c']) {
    const result = book(current, projectId);
    assert.equal(result.ok, true, projectId);
    current = result.session;
  }
  assert.equal(getRemainingMinutes(current), 0);
  assert.deepEqual(book(current, 'd'), { ok: false, error: 'full' });

  const timeline = buildSessionTimeline(current);
  assert.deepEqual(timeline.map((slot) => new Date(slot.startAt).getHours() * 60 + new Date(slot.startAt).getMinutes()), [840, 860, 880]);
});

test('le chef de projet ne peut plus s’inscrire à J-3, le président si', () => {
  const close = session({ startAt: at('2026-11-04T14:00:00') });
  assert.equal(book(close, 'a').error, 'closed');
  assert.equal(book(close, 'a', { isChair: true }).ok, true);
  assert.equal(book(session({ status: 'draft' }), 'a').error, 'closed');
});

test('séances proposées : publiées, à J-3 au moins, avec la durée par défaut encore libre', () => {
  const full = session({ id: 'full', agenda: [{ id: 'x', projectId: 'x', minutes: 50 }] });
  const sessions = [session(), full, session({ id: 'near', startAt: at('2026-11-04T14:00:00') }), session({ id: 'draft', status: 'draft' })];
  assert.deepEqual(getBookableSessions(sessions, committee, now).map((entry) => entry.id), ['s1']);
});

test('dépasser la séance demande une confirmation, qui la prolonge', () => {
  const booked = book(session({ agenda: [{ id: 'x', projectId: 'x', minutes: 40 }] }), 'a').session;
  const refused = applySessionAction(booked, { type: 'setMinutes', passageId: 'p-a', minutes: 35 }, { isChair: true, now });
  assert.deepEqual(refused, { ok: false, error: 'overrun', overrunMinutes: 15 });

  const confirmed = applySessionAction(booked, { type: 'setMinutes', passageId: 'p-a', minutes: 35, allowOverrun: true }, { isChair: true, now });
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.extendedBy, 15);
  assert.equal(confirmed.session.durationMinutes, 75);
});

test('modifier une durée exige d’être président, et respecte 10 min par pas de 5', () => {
  const booked = book(session(), 'a').session;
  assert.equal(applySessionAction(booked, { type: 'setMinutes', passageId: 'p-a', minutes: 15 }, { now }).error, 'forbidden');
  assert.equal(normalizePassageMinutes(3), 10);
  assert.equal(normalizePassageMinutes(23), 25);
});

test('une demande de temps est justifiée, mise en option sur le temps restant, puis tranchée', () => {
  const booked = book(session(), 'a').session;
  assert.equal(applySessionAction(booked, { type: 'requestTime', passageId: 'p-a' }, { now }).error, 'noteRequired');

  const requested = applySessionAction(booked, { type: 'requestTime', passageId: 'p-a', note: 'Projet complexe' }, { now }).session;
  assert.equal(requested.agenda[0].timeRequest.minutes, 20);
  assert.equal(getRemainingMinutes(requested), 20);

  const accepted = applySessionAction(requested, { type: 'decideTimeRequest', passageId: 'p-a', accept: true }, { isChair: true, now }).session;
  assert.equal(accepted.agenda[0].minutes, 40);
  assert.equal(getRemainingMinutes(accepted), 20);

  const refused = applySessionAction(requested, { type: 'decideTimeRequest', passageId: 'p-a', accept: false }, { isChair: true, now }).session;
  assert.equal(refused.agenda[0].minutes, 20);
  assert.equal(getRemainingMinutes(refused), 40);
});

test('une demande de temps sur une séance pleine ne met rien en option ; l’accepter prolonge', () => {
  let current = session();
  for (const projectId of ['a', 'b', 'c']) {
    current = book(current, projectId).session;
  }
  const requested = applySessionAction(current, { type: 'requestTime', passageId: 'p-b', note: 'Besoin' }, { now }).session;
  assert.equal(requested.agenda[1].timeRequest.heldMinutes, 0);
  assert.equal(applySessionAction(requested, { type: 'decideTimeRequest', passageId: 'p-b', accept: true }, { isChair: true, now }).error, 'overrun');
});

test('plusieurs passages d’un projet sont numérotés, et un seul est à venir', () => {
  const past = session({ id: 'past', startAt: at('2026-10-06T14:00:00'), agenda: [{ id: 'old', projectId: 'a', representationRequest: { by: 'p@lfb.fr', at: at('2026-10-06T15:00:00') } }] });
  assert.equal(getPendingRepresentationRequest([past], 'a', 'c1', now).by, 'p@lfb.fr');

  const next = book(session(), 'a').session;
  const passages = getProjectPassages([next, past], 'a', 'c1', now);
  assert.deepEqual(passages.map((entry) => [entry.session.id, entry.passageNumber, entry.isPast]), [['past', 1, true], ['s1', 2, false]]);
  assert.equal(getUpcomingProjectPassage([next, past], 'a', 'c1', now).session.id, 's1');
  assert.equal(getPendingRepresentationRequest([next, past], 'a', 'c1', now), null);
  assert.equal(getCurrentPassageSessionId([next, past], 'a', 'c1', now), 'past');
});

test('présences de séance, corrigées pour un passage', () => {
  const booked = book(session(), 'a').session;
  const all = applySessionAction(booked, { type: 'setAttendance', emails: committee.emails, state: 'present' }, { isChair: true, now }).session;
  const excused = applySessionAction(all, { type: 'setAttendance', email: 'b@lfb.fr', state: 'excused' }, { isChair: true, now }).session;
  const leftEarly = applySessionAction(excused, { type: 'setPassageAttendance', passageId: 'p-a', email: 'a@lfb.fr', state: 'absent' }, { isChair: true, now }).session;

  assert.deepEqual(summarizeAttendance(committee.emails, excused.attendance), { present: 2, excused: 1, absent: 0, unknown: 0, total: 3 });
  const passageAttendance = getPassageAttendance(leftEarly, leftEarly.agenda[0]);
  assert.deepEqual(summarizeAttendance(committee.emails, passageAttendance), { present: 1, excused: 1, absent: 1, unknown: 0, total: 3 });
  assert.equal(applySessionAction(booked, { type: 'setAttendance', email: 'a@lfb.fr', state: 'present' }, { now }).error, 'forbidden');
});

test('génération : 2e mardi de chaque mois, sans doublon avec une séance existante', () => {
  const dates = generateSessionDates({ weekday: 2, nth: 2, time: '14:00', from: '2026-11-01', to: '2027-01-31' });
  assert.deepEqual(dates.map((iso) => new Date(iso).getDate()), [10, 8, 12]);
  assert.deepEqual(
    generateSessionDates({ weekday: 5, nth: -1, from: '2026-11-01', to: '2026-11-30' }).map((iso) => new Date(iso).getDate()),
    [27]
  );

  const drafts = buildDraftSessions({ committeeId: 'c1', dates, durationMinutes: 60, existingSessions: [session({ startAt: dates[0] })] });
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].status, 'draft');
});

test('rappels : J-7 puis J-1 au chef de projet, une seule fois chacun', () => {
  const booked = book(session(), 'a').session;
  assert.equal(getDueOwnerReminder(booked, booked.agenda[0], new Date('2026-11-01T09:00:00')), '');
  assert.equal(getDueOwnerReminder(booked, booked.agenda[0], new Date('2026-11-04T09:00:00')), 'J-7');
  const marked = applySessionAction(booked, { type: 'markReminderSent', passageId: 'p-a', reminder: 'J-7' }, { now }).session;
  assert.equal(getDueOwnerReminder(marked, marked.agenda[0], new Date('2026-11-05T09:00:00')), '');
  assert.equal(getDueOwnerReminder(marked, marked.agenda[0], new Date('2026-11-09T09:00:00')), 'J-1');
});

test('rappel au président 4 semaines avant la dernière séance publiée', () => {
  const sessions = [session(), session({ id: 'later', startAt: at('2026-12-20T14:00:00') })];
  assert.equal(getPlanningReminderSession(sessions, 'c1', now), null);
  assert.equal(getPlanningReminderSession(sessions, 'c1', new Date('2026-11-25T09:00:00')).id, 'later');
});

test('pilotage : projets déclenchés sans passage à venir', () => {
  const booked = book(session(), 'a').session;
  assert.equal(countUnbookedTriggeredProjects(['a', 'b', 'c'], [booked], 'c1', now), 2);
});

test('un avis de comité rendu après le passage est rattaché à la séance et figé pour elle', async () => {
  const { stampCommitteeOpinionSessions } = await import('../src/utils/committeeSessions.js');
  const previous = { committees: { c1: { status: '', comment: '', reviewedAt: '' } } };
  const next = { committees: { c1: { status: 'pending_information', comment: 'Revenir avec le budget', reviewedAt: '2026-11-10T15:00:00.000Z' } } };

  const stamped = stampCommitteeOpinionSessions(next, previous, () => 's1');
  assert.equal(stamped.committees.c1.sessionId, 's1');
  assert.deepEqual(stamped.committees.c1.sessionOutcomes.s1, {
    status: 'pending_information',
    comment: 'Revenir avec le budget',
    renderedAt: '2026-11-10T15:00:00.000Z'
  });

  // Une réponse dans le fil ne redate pas l'avis : rien n'est re-figé.
  assert.equal(stampCommitteeOpinionSessions(stamped, stamped, () => 's2'), stamped);
  // Pas de passage commencé : l'avis n'est rattaché à aucune séance.
  assert.equal(stampCommitteeOpinionSessions(next, previous, () => ''), next);
});
