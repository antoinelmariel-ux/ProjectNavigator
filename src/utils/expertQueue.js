import { normalizeEmail } from './normalizeEmail.js';
import { isPerimeterReviewPending, getReviewedVersion } from './perimeterReview.js';
import { getSubmissionHistory } from './submissionHistory.js';
import { getSubmissionKind, normalizeSubmissionKind, SUBMISSION_KIND_PRELIMINARY } from './submissionKind.js';
import {
  CONFIRMATION_CONFIRMED,
  getFinalValidationRound,
  getPerimeterConfirmationState
} from './finalValidationRound.js';

// La file d'un expert sur l'accueil : « À prendre », « En cours », « Pris en charge par
// l'équipe », « Traités ». Prendre en charge, c'est prendre le projet jusqu'à l'avis définitif,
// pas une question : un projet reste « En cours » pendant tous les allers-retours, et une puce
// signale seulement que le porteur a bougé depuis le dernier geste de l'expert.
// « pending_information » n'est pas un avis : la balle est chez le porteur, le projet reste en cours.
export const OPINION_STATUSES = ['validated', 'validated_with_conditions', 'rejected', 'not_concerned'];

export const EXPERT_QUEUE_TO_CLAIM = 'to_claim';
export const EXPERT_QUEUE_IN_PROGRESS = 'in_progress';
export const EXPERT_QUEUE_TEAMMATE = 'teammate';
export const EXPERT_QUEUE_TREATED = 'treated';

export const EXPERT_NEWS_OWNER_REPLY = 'owner_reply';
export const EXPERT_NEWS_PROJECT_UPDATE = 'project_update';
export const EXPERT_NEWS_FINAL_REQUEST = 'final_request';
export const EXPERT_NEWS_FINAL_ROUND = 'final_round';

const toText = (value) => (typeof value === 'string' ? value : '');
const latest = (values) => values.filter(Boolean).sort().pop() || '';

export const isOpinionStatus = (status) => OPINION_STATUSES.includes(status);

// Le type de la demande sur laquelle l'avis a été rendu, lu dans l'historique des envois à la
// version que l'avis porte. Sans historique (projet antérieur), le type actuel du projet.
export const getOpinionSubmissionKind = (project, entry) => {
  const history = getSubmissionHistory(project?.answers);
  if (history.entries.length === 0) {
    return getSubmissionKind(project);
  }

  const reviewedVersion = getReviewedVersion(entry) || 1;
  const sent = history.entries
    .filter((item) => item.version <= reviewedVersion)
    .sort((a, b) => a.version - b.version)
    .pop();

  return sent ? normalizeSubmissionKind(sent.kind) : getSubmissionKind(project);
};

// L'état d'un périmètre pour l'expert. `complianceEmails` : les contacts de l'équipe (ou les
// membres du comité) — toute réponse écrite par quelqu'un d'autre vient du côté du porteur.
// Le geste qui éteint la puce est un geste de l'expert (avis, statut, réponse), jamais
// l'ouverture du projet : un coup d'œil ne doit pas effacer le signal.
export const getPerimeterQueueState = (entry, { project, complianceEmails = [] } = {}) => {
  const emails = new Set((Array.isArray(complianceEmails) ? complianceEmails : []).map(normalizeEmail).filter(Boolean));
  const replies = Array.isArray(entry?.replies) ? entry.replies : [];
  const status = toText(entry?.status);
  const hasOpinion = isOpinionStatus(status);

  const expertGestureAt = latest([
    toText(entry?.statusUpdatedAt),
    ...replies
      .filter((reply) => emails.has(normalizeEmail(reply?.authorEmail)))
      .map((reply) => toText(reply?.createdAt))
  ]);
  const ownerReplyAt = latest(
    replies
      .filter((reply) => !emails.has(normalizeEmail(reply?.authorEmail)))
      .map((reply) => toText(reply?.createdAt))
  );
  const hasOwnerReply = Boolean(ownerReplyAt) && ownerReplyAt > expertGestureAt;

  const isReviewPending = isPerimeterReviewPending(entry);
  const opinionKind = hasOpinion ? getOpinionSubmissionKind(project, entry) : '';
  const currentKind = getSubmissionKind(project);
  const isOpinionOnPreliminary = opinionKind === SUBMISSION_KIND_PRELIMINARY;
  const isAwaitingFinalOpinion = isOpinionOnPreliminary && currentKind !== SUBMISSION_KIND_PRELIMINARY;
  const isPreliminaryOpinion = isOpinionOnPreliminary && !isAwaitingFinalOpinion && !isReviewPending;

  const round = getFinalValidationRound(project?.answers);
  const isFinalRoundPending = hasOpinion
    && round.round > 0
    && getPerimeterConfirmationState(entry, round.round, round.requestedAt) !== CONFIRMATION_CONFIRMED;

  const isSettled = hasOpinion
    && !isReviewPending
    && !isOpinionOnPreliminary
    && !isFinalRoundPending;

  const history = getSubmissionHistory(project?.answers);
  const sentAt = history.lastSentAt || toText(project?.lastUpdated) || toText(project?.submittedAt);

  let news = '';
  let newsAt = '';
  if (hasOwnerReply) {
    news = EXPERT_NEWS_OWNER_REPLY;
    newsAt = ownerReplyAt;
  } else if (hasOpinion && isReviewPending) {
    news = EXPERT_NEWS_PROJECT_UPDATE;
    newsAt = sentAt;
  } else if (isAwaitingFinalOpinion) {
    news = EXPERT_NEWS_FINAL_REQUEST;
    newsAt = sentAt;
  } else if (isFinalRoundPending) {
    news = EXPERT_NEWS_FINAL_ROUND;
    newsAt = round.requestedAt || sentAt;
  }

  const expertReplyAt = latest(
    replies
      .filter((reply) => emails.has(normalizeEmail(reply?.authorEmail)))
      .map((reply) => toText(reply?.createdAt))
  );

  return {
    status,
    hasOpinion,
    expertReplyAt,
    isSettled,
    isPreliminaryOpinion,
    news,
    newsAt,
    hasNews: Boolean(news),
    ownerReplyAt,
    expertGestureAt
  };
};

// La balle est chez l'expert quand c'est à lui d'agir : il a une nouveauté à traiter (réponse du
// porteur, mise à jour, demande finale), ou il n'a rien encore dit au porteur. Elle est chez le
// porteur après un avis rendu sans nouveauté, un statut « pending_information » ou une dernière
// réponse de l'expert dans le fil : relancer l'expert n'aurait alors aucun sens.
export const isBallWithExpert = (queueState) => {
  if (!queueState) {
    return true;
  }
  if (queueState.hasNews) {
    return true;
  }
  if (queueState.hasOpinion || queueState.status === 'pending_information') {
    return false;
  }
  return !(queueState.expertReplyAt && queueState.expertReplyAt > (queueState.ownerReplyAt || ''));
};

// `perimeters` : [{ type: 'team'|'committee', claim, isHandledByOther, queue }].
// Un comité n'est pas revendicable : ouvert, il est d'emblée « en cours » pour ses membres.
// Un projet n'est que dans un seul onglet ; « En cours » l'emporte, puis « À prendre ».
export const getPerimeterBucket = (perimeter) => {
  if (perimeter?.queue?.isSettled) {
    return EXPERT_QUEUE_TREATED;
  }
  if (perimeter?.type === 'committee') {
    return EXPERT_QUEUE_IN_PROGRESS;
  }
  if (!perimeter?.claim) {
    return EXPERT_QUEUE_TO_CLAIM;
  }
  return perimeter.isHandledByOther ? EXPERT_QUEUE_TEAMMATE : EXPERT_QUEUE_IN_PROGRESS;
};

export const classifyExpertProject = (perimeters = []) => {
  const list = Array.isArray(perimeters) ? perimeters : [];
  if (list.length === 0) {
    return { bucket: '', hasNews: false, newsAt: '', isPreliminaryOnly: false, activePerimeters: [] };
  }

  const buckets = list.map(getPerimeterBucket);
  const bucket = [EXPERT_QUEUE_IN_PROGRESS, EXPERT_QUEUE_TO_CLAIM, EXPERT_QUEUE_TEAMMATE]
    .find((candidate) => buckets.includes(candidate)) || EXPERT_QUEUE_TREATED;
  const activePerimeters = bucket === EXPERT_QUEUE_TREATED
    ? list
    : list.filter((_, index) => buckets[index] === bucket);

  const withNews = activePerimeters.filter((perimeter) => perimeter?.queue?.hasNews);
  const hasNews = withNews.length > 0;

  return {
    bucket,
    hasNews,
    newsAt: latest(withNews.map((perimeter) => toText(perimeter.queue.newsAt))),
    isPreliminaryOnly: bucket !== EXPERT_QUEUE_TREATED
      && !hasNews
      && activePerimeters.every((perimeter) => perimeter?.queue?.isPreliminaryOpinion),
    activePerimeters
  };
};

// Du nouveau d'abord (le plus récent en tête), les avis préliminaires rendus en fin de liste.
// Appliqué à l'arrivée et au changement d'onglet seulement (useStableList) : un clic ne
// déplace jamais la carte sur laquelle on travaille.
const getQueueRank = (entry) => {
  if (entry?.hasNews) return 0;
  if (entry?.isPreliminaryOnly) return 2;
  return 1;
};

export const sortExpertQueue = (entries = [], getTimestamp = () => 0) => [...(Array.isArray(entries) ? entries : [])]
  .sort((a, b) => {
    const rankDelta = getQueueRank(a) - getQueueRank(b);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    if (a?.hasNews && b?.hasNews && a.newsAt !== b.newsAt) {
      return String(b.newsAt || '').localeCompare(String(a.newsAt || ''));
    }
    return getTimestamp(b) - getTimestamp(a);
  });
