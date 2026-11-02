import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPERT_NEWS_FINAL_REQUEST,
  EXPERT_NEWS_FINAL_ROUND,
  EXPERT_NEWS_OWNER_REPLY,
  EXPERT_NEWS_PROJECT_UPDATE,
  EXPERT_QUEUE_IN_PROGRESS,
  EXPERT_QUEUE_TEAMMATE,
  EXPERT_QUEUE_TO_CLAIM,
  EXPERT_QUEUE_TREATED,
  classifyExpertProject,
  getOpinionSubmissionKind,
  getPerimeterQueueState,
  sortExpertQueue
} from '../src/utils/expertQueue.js';
import { isPerimeterStatusSettled } from '../src/utils/perimeterResolution.js';

const EXPERT = 'expert@lfb.fr';
const OWNER = 'owner@lfb.fr';
const emails = [EXPERT, 'colleague@lfb.fr'];

const project = (answers = {}, extra = {}) => ({ status: 'submitted', answers, ...extra });
const finalProject = (extraAnswers = {}) => project({ __submission_kind__: 'final', ...extraAnswers });
const preliminaryProject = (extraAnswers = {}) => project({ __submission_kind__: 'preliminary', ...extraAnswers });
const reply = (authorEmail, createdAt) => ({ authorEmail, createdAt, message: 'x' });

test('demander des informations n’est pas un avis : le périmètre reste ouvert', () => {
  const state = getPerimeterQueueState(
    { status: 'pending_information', statusUpdatedAt: '2026-10-01T10:00:00Z' },
    { project: finalProject(), complianceEmails: emails }
  );
  assert.equal(state.isSettled, false);
  assert.equal(state.hasNews, false);
  assert.equal(isPerimeterStatusSettled('pending_information'), false);
  assert.equal(isPerimeterStatusSettled('validated'), true);
});

test('une réponse du porteur après le dernier geste de l’expert allume la puce, même partielle', () => {
  const state = getPerimeterQueueState(
    {
      status: 'pending_information',
      statusUpdatedAt: '2026-10-01T10:00:00Z',
      replies: [reply(OWNER, '2026-10-02T09:00:00Z')]
    },
    { project: finalProject(), complianceEmails: emails }
  );
  assert.equal(state.news, EXPERT_NEWS_OWNER_REPLY);
  assert.equal(state.newsAt, '2026-10-02T09:00:00Z');
});

test('le geste suivant de l’expert éteint la puce (une réponse d’un collègue de l’équipe compte)', () => {
  const state = getPerimeterQueueState(
    {
      status: 'pending_information',
      statusUpdatedAt: '2026-10-01T10:00:00Z',
      replies: [reply(OWNER, '2026-10-02T09:00:00Z'), reply('Colleague@lfb.fr', '2026-10-03T09:00:00Z')]
    },
    { project: finalProject(), complianceEmails: emails }
  );
  assert.equal(state.hasNews, false);
});

test('un avis sur une demande de validation est définitif', () => {
  const state = getPerimeterQueueState(
    { status: 'validated', statusUpdatedAt: '2026-10-01T10:00:00Z' },
    { project: finalProject(), complianceEmails: emails }
  );
  assert.equal(state.isSettled, true);
  assert.equal(state.isPreliminaryOpinion, false);
});

test('un avis rendu sur une demande préliminaire laisse le projet en cours', () => {
  const state = getPerimeterQueueState(
    { status: 'validated', statusUpdatedAt: '2026-10-01T10:00:00Z' },
    { project: preliminaryProject(), complianceEmails: emails }
  );
  assert.equal(state.isSettled, false);
  assert.equal(state.isPreliminaryOpinion, true);
  assert.equal(state.hasNews, false);
});

test('le type de la demande est lu à la version de l’avis : préliminaire puis demande de validation', () => {
  const answers = {
    __submission_kind__: 'final',
    __submission_history__: {
      version: 2,
      lastSentAt: '2026-10-05T10:00:00Z',
      entries: [
        { version: 1, sentAt: '2026-09-01T10:00:00Z', kind: 'preliminary' },
        { version: 2, sentAt: '2026-10-05T10:00:00Z', kind: 'final' }
      ]
    }
  };
  const entry = { status: 'validated', reviewedVersion: 1, statusUpdatedAt: '2026-09-10T10:00:00Z' };
  assert.equal(getOpinionSubmissionKind(project(answers), entry), 'preliminary');
  const state = getPerimeterQueueState(entry, { project: project(answers), complianceEmails: emails });
  assert.equal(state.isSettled, false);
  assert.equal(state.isPreliminaryOpinion, false);
  assert.equal(state.news, EXPERT_NEWS_FINAL_REQUEST);

  const reviewedOnFinal = getPerimeterQueueState(
    { ...entry, reviewedVersion: 2 },
    { project: project(answers), complianceEmails: emails }
  );
  assert.equal(reviewedOnFinal.isSettled, true);
});

test('une mise à jour qui touche le périmètre rouvre un avis rendu', () => {
  const state = getPerimeterQueueState(
    { status: 'validated', reviewedVersion: 1, needsReviewSince: 2 },
    { project: finalProject(), complianceEmails: emails }
  );
  assert.equal(state.isSettled, false);
  assert.equal(state.news, EXPERT_NEWS_PROJECT_UPDATE);
});

test('une confirmation finale demandée et non donnée rouvre un avis rendu', () => {
  const answers = { __final_validation_round__: { round: 1, requestedAt: '2026-10-10T10:00:00Z' } };
  const pending = getPerimeterQueueState(
    { status: 'validated', reviewedAt: '2026-10-01T10:00:00Z' },
    { project: finalProject(answers), complianceEmails: emails }
  );
  assert.equal(pending.isSettled, false);
  assert.equal(pending.news, EXPERT_NEWS_FINAL_ROUND);

  const confirmed = getPerimeterQueueState(
    { status: 'validated', reviewedAt: '2026-10-11T10:00:00Z' },
    { project: finalProject(answers), complianceEmails: emails }
  );
  assert.equal(confirmed.isSettled, true);
});

const perimeter = (overrides = {}) => ({
  type: 'team',
  claim: null,
  isHandledByOther: false,
  queue: { isSettled: false, hasNews: false, newsAt: '', isPreliminaryOpinion: false },
  ...overrides
});

test('classement : en cours l’emporte, puis à prendre, puis collègue, puis traité', () => {
  assert.equal(classifyExpertProject([perimeter()]).bucket, EXPERT_QUEUE_TO_CLAIM);
  assert.equal(classifyExpertProject([perimeter({ claim: { assigneeEmail: EXPERT } })]).bucket, EXPERT_QUEUE_IN_PROGRESS);
  assert.equal(classifyExpertProject([perimeter({ claim: { assigneeEmail: 'x' }, isHandledByOther: true })]).bucket, EXPERT_QUEUE_TEAMMATE);
  assert.equal(classifyExpertProject([perimeter({ type: 'committee' })]).bucket, EXPERT_QUEUE_IN_PROGRESS);
  assert.equal(classifyExpertProject([
    perimeter(),
    perimeter({ claim: { assigneeEmail: EXPERT } })
  ]).bucket, EXPERT_QUEUE_IN_PROGRESS);
  assert.equal(classifyExpertProject([
    perimeter({ claim: { assigneeEmail: EXPERT }, queue: { isSettled: true } })
  ]).bucket, EXPERT_QUEUE_TREATED);
  assert.equal(classifyExpertProject([]).bucket, '');
});

test('avis préliminaire seul : marqué pour la fin de liste, sauf s’il y a du nouveau', () => {
  const mine = { claim: { assigneeEmail: EXPERT } };
  assert.equal(classifyExpertProject([
    perimeter({ ...mine, queue: { isSettled: false, isPreliminaryOpinion: true } })
  ]).isPreliminaryOnly, true);
  assert.equal(classifyExpertProject([
    perimeter({ ...mine, queue: { isSettled: false, isPreliminaryOpinion: true } }),
    perimeter({ ...mine })
  ]).isPreliminaryOnly, false);
  assert.equal(classifyExpertProject([
    perimeter({ ...mine, queue: { isSettled: false, isPreliminaryOpinion: true, hasNews: true, newsAt: 'a' } })
  ]).isPreliminaryOnly, false);
});

test('tri : du nouveau d’abord (le plus récent en tête), avis préliminaires à la fin', () => {
  const entries = [
    { id: 'prelim', isPreliminaryOnly: true, ts: 50 },
    { id: 'plain-old', ts: 10 },
    { id: 'news-old', hasNews: true, newsAt: '2026-10-01', ts: 1 },
    { id: 'plain-new', ts: 40 },
    { id: 'news-new', hasNews: true, newsAt: '2026-10-05', ts: 2 }
  ];
  assert.deepEqual(
    sortExpertQueue(entries, (entry) => entry.ts).map((entry) => entry.id),
    ['news-new', 'news-old', 'plain-new', 'plain-old', 'prelim']
  );
});
