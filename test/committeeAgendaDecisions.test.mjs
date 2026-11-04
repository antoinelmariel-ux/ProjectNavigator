import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCommitteePassageDecision,
  applySessionAction,
  getPassageDecision,
  isLatestProjectPassage,
  normalizeSession
} from '../src/utils/committeeSessions.js';
import { buildAgendaSearchEntries, searchAgendaEntries } from '../src/utils/committeeAgendaSearch.js';

const KEY = '__compliance_team_comments__';
const NOW = new Date('2030-03-01T10:00:00Z');

const makeSession = (id, startAt, agenda) => normalizeSession({
  id, committeeId: 'c1', startAt, durationMinutes: 120, status: 'published', agenda
});

const projectPassage = (id, projectId) => ({ id, kind: 'project', projectId, minutes: 20 });
const topicPassage = (id, title) => ({ id, kind: 'topic', title, minutes: 10 });

test('a chair can record a decision on a topic, others cannot', () => {
  const session = makeSession('s1', '2030-02-01T10:00:00Z', [topicPassage('t1', 'Budget 2031')]);
  const ok = applySessionAction(session, { type: 'setPassageDecision', passageId: 't1', status: 'validated', comment: ' ok ' }, { isChair: true, actorEmail: 'a@x.fr', now: NOW });
  assert.equal(ok.ok, true);
  assert.deepEqual(
    { status: ok.session.agenda[0].decision.status, comment: ok.session.agenda[0].decision.comment },
    { status: 'validated', comment: 'ok' }
  );
  const refused = applySessionAction(session, { type: 'setPassageDecision', passageId: 't1', status: 'validated' }, { isChair: false });
  assert.equal(refused.error, 'forbidden');
});

test('a topic decision is optional and can be cleared', () => {
  const session = makeSession('s1', '2030-02-01T10:00:00Z', [{ ...topicPassage('t1', 'X'), decision: { status: 'rejected', comment: 'non' } }]);
  const cleared = applySessionAction(session, { type: 'setPassageDecision', passageId: 't1', status: '', comment: '' }, { isChair: true });
  assert.equal(cleared.session.agenda[0].decision, null);
});

test('a decision on a project passage is refused at the session level (it lives in the project)', () => {
  const session = makeSession('s1', '2030-02-01T10:00:00Z', [projectPassage('p1', 'proj')]);
  const result = applySessionAction(session, { type: 'setPassageDecision', passageId: 'p1', status: 'validated' }, { isChair: true });
  assert.equal(result.ok, false);
});

test('the latest passage updates the current opinion, an older one only its history', () => {
  const sessions = [
    makeSession('old', '2030-01-01T10:00:00Z', [projectPassage('p1', 'proj')]),
    makeSession('new', '2030-02-01T10:00:00Z', [projectPassage('p2', 'proj')])
  ];
  assert.equal(isLatestProjectPassage(sessions, 'proj', 'c1', 'new', NOW), true);
  assert.equal(isLatestProjectPassage(sessions, 'proj', 'c1', 'old', NOW), false);

  const first = applyCommitteePassageDecision({}, { committeeId: 'c1', sessionId: 'new', isLatest: true, status: 'validated', comment: 'bien', now: NOW });
  assert.equal(first.committees.c1.status, 'validated');
  assert.equal(first.committees.c1.sessionOutcomes.new.comment, 'bien');

  const second = applyCommitteePassageDecision(first, { committeeId: 'c1', sessionId: 'old', isLatest: false, status: 'rejected', comment: 'avant', now: NOW });
  assert.equal(second.committees.c1.status, 'validated');
  assert.equal(second.committees.c1.sessionOutcomes.old.status, 'rejected');
  assert.equal(second.committees.c1.sessionOutcomes.new.status, 'validated');
});

test('an unknown status is stored as no decision', () => {
  const next = applyCommitteePassageDecision({}, { committeeId: 'c1', sessionId: 's', isLatest: true, status: 'bogus', comment: '' });
  assert.equal(next.committees.c1.status, '');
});

test('getPassageDecision reads the session trace, and the current opinion only for its own session', () => {
  const session = makeSession('s1', '2030-02-01T10:00:00Z', [projectPassage('p1', 'proj')]);
  const project = { id: 'proj', answers: { [KEY]: { committees: { c1: { status: 'rejected', comment: 'x', sessionId: 'other' } } } } };
  assert.deepEqual(getPassageDecision({ session, passage: session.agenda[0], project, isLatest: true }), { status: '', comment: '' });
  const own = { id: 'proj', answers: { [KEY]: { committees: { c1: { status: 'validated', comment: 'y', sessionId: 's1' } } } } };
  assert.equal(getPassageDecision({ session, passage: session.agenda[0], project: own, isLatest: true }).status, 'validated');
});

test('search finds topics and projects, past and upcoming, and flags the project situation', () => {
  const sessions = [
    makeSession('past', '2030-01-01T10:00:00Z', [topicPassage('t1', 'Charte éthique'), projectPassage('p1', 'gone')]),
    makeSession('future', '2030-06-01T10:00:00Z', [topicPassage('t2', 'Charte données')])
  ];
  sessions[0].agenda[0].decision = { status: 'validated', comment: '<p>Adoptée à l’unanimité</p>' };
  const projects = [{ id: 'gone', projectName: 'Projet Éthique', answers: { __project_trash__: { deletedAt: '2030-01-05T00:00:00Z' } } }];
  const entries = buildAgendaSearchEntries({ sessions, projects, committees: [{ id: 'c1', name: 'Comité A' }], now: NOW });

  assert.deepEqual(searchAgendaEntries(entries, 'charte').map((e) => e.sessionId), ['future', 'past']);
  assert.deepEqual(searchAgendaEntries(entries, 'CHARTE ethique').map((e) => e.passageId), ['t1']);
  assert.deepEqual(searchAgendaEntries(entries, 'unanimite').map((e) => e.passageId), ['t1']);
  const trashed = searchAgendaEntries(entries, 'projet')[0];
  assert.equal(trashed.projectSituation, 'trashed');
  assert.equal(searchAgendaEntries(entries, 'charte')[0].timing, 'upcoming');
  assert.equal(searchAgendaEntries(entries, 'charte')[1].timing, 'past');
});
