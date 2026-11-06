import {
  PASSAGE_KIND_TOPIC,
  SESSION_STATUS_CANCELLED,
  SESSION_STATUS_PUBLISHED,
  buildSessionTimeline,
  getDaysUntilSession,
  getPassageDecision,
  getProjectPassages,
  isLatestProjectPassage,
  isSessionPast,
  normalizeSessions
} from './committeeSessions.js';

// « Mes passages en comité » : les passages d'une personne qui n'est pas membre du comité — le
// porteur et les co-porteurs d'un projet inscrit, un invité d'un passage, l'intervenant d'un sujet
// hors projet. Chacun ne lit que ses propres passages : un invité ne voit que le passage où il
// était invité, jamais l'historique du projet. Les autres points d'un ordre du jour restent des
// créneaux sans titre (vue participant).

export const PASSAGE_ROLE_OWNER = 'owner';
export const PASSAGE_ROLE_GUEST = 'guest';
export const PASSAGE_ROLE_PRESENTER = 'presenter';

export const COMMITTEE_PASSAGE_HINT_DAYS = 7;

const COMMENTS_KEY = '__compliance_team_comments__';

const toText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => toText(value).toLowerCase();
const stripHtml = (value) => toText(value).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const getOwnerEmails = (project) => [
  project?.ownerEmail,
  ...(Array.isArray(project?.sharedWith) ? project.sharedWith : [])
].map(normalizeEmail).filter(Boolean);

export const getUserPassageRole = (passage, project, email) => {
  const me = normalizeEmail(email);
  if (!me || !passage) {
    return '';
  }
  if (passage.kind === PASSAGE_KIND_TOPIC) {
    return (passage.presenterEmails || []).map(normalizeEmail).includes(me) ? PASSAGE_ROLE_PRESENTER : '';
  }
  if (!project) {
    return '';
  }
  if (getOwnerEmails(project).includes(me)) {
    return PASSAGE_ROLE_OWNER;
  }
  return (passage.guests || []).map(normalizeEmail).includes(me) ? PASSAGE_ROLE_GUEST : '';
};

// Une séance en brouillon n'existe pas encore pour un participant ; une séance annulée reste
// visible (à venir : c'est l'information urgente ; passée : grisée dans l'historique).
const isVisibleToParticipants = (session) =>
  session.status === SESSION_STATUS_PUBLISHED || session.status === SESSION_STATUS_CANCELLED;

const getCurrentCommitteeOpinion = (project, committeeId) => {
  const entry = project?.answers?.[COMMENTS_KEY]?.committees?.[committeeId];
  return entry && typeof entry === 'object'
    ? { status: toText(entry.status), comment: toText(entry.comment) }
    : { status: '', comment: '' };
};

const buildEntries = ({ sessions, projects, email, now }) => {
  const projectsById = new Map((Array.isArray(projects) ? projects : [])
    .filter((project) => project?.id)
    .map((project) => [project.id, project]));
  const normalized = normalizeSessions(sessions).filter(isVisibleToParticipants);
  const entries = [];
  normalized.forEach((session) => {
    const isCancelled = session.status === SESSION_STATUS_CANCELLED;
    const isPast = isSessionPast(session, now);
    buildSessionTimeline(session).forEach((slot) => {
      const { passage } = slot;
      const isTopic = passage.kind === PASSAGE_KIND_TOPIC;
      const project = isTopic ? null : projectsById.get(passage.projectId) || null;
      const role = getUserPassageRole(passage, project, email);
      if (!role) {
        return;
      }
      let passageNumber = 0;
      let isLatest = false;
      if (project && !isCancelled) {
        const projectPassages = getProjectPassages(normalized, project.id, session.committeeId, now);
        const index = projectPassages.findIndex((entry) => entry.session.id === session.id && entry.passage.id === passage.id);
        passageNumber = index + 1;
        isLatest = isLatestProjectPassage(normalized, project.id, session.committeeId, session.id, now);
      }
      const decision = isPast && !isCancelled
        ? getPassageDecision({ session, passage, project, isLatest })
        : { status: '', comment: '' };
      let currentOpinionDiffers = false;
      if (project && isPast && !isCancelled && role === PASSAGE_ROLE_OWNER) {
        const current = getCurrentCommitteeOpinion(project, session.committeeId);
        const hasCurrent = Boolean(current.status) || stripHtml(current.comment).length > 0;
        currentOpinionDiffers = hasCurrent
          && (current.status !== decision.status || stripHtml(current.comment) !== stripHtml(decision.comment));
      }
      entries.push({
        key: `${session.id}::${passage.id}`,
        session,
        passage,
        project,
        role,
        isTopic,
        title: isTopic ? passage.title : toText(project?.projectName) || passage.projectId,
        committeeId: session.committeeId,
        number: slot.number,
        total: session.agenda.length,
        startAt: slot.startAt,
        endAt: slot.endAt,
        isPast,
        isCancelled,
        passageNumber,
        decision,
        hasDecision: Boolean(decision.status) || stripHtml(decision.comment).length > 0,
        currentOpinionDiffers
      });
    });
  });
  return entries;
};

// À venir : les séances annulées d'abord (c'est ce qu'il faut savoir tout de suite), puis par date.
// Passés : du plus récent au plus ancien.
export const listUserCommitteePassages = ({ sessions = [], projects = [], email = '', now = new Date() } = {}) => {
  const entries = buildEntries({ sessions, projects, email, now });
  const upcoming = entries
    .filter((entry) => !entry.isPast)
    .sort((a, b) => (Number(b.isCancelled) - Number(a.isCancelled)) || a.startAt.localeCompare(b.startAt));
  const past = entries
    .filter((entry) => entry.isPast)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  return { upcoming, past };
};

export const hasUserCommitteePassages = (passages) =>
  Boolean(passages) && (passages.upcoming.length > 0 || passages.past.length > 0);

export const countUpcomingUserPassages = (passages) =>
  (passages?.upcoming || []).filter((entry) => !entry.isCancelled).length;

// Ordre du jour vu par un participant : tous les créneaux, pour qu'il se situe, mais seuls les
// siens portent un titre et une décision. Retourne null s'il n'a aucun passage dans la séance.
export const buildParticipantAgenda = ({ session, sessions = [], projects = [], email = '', now = new Date() } = {}) => {
  if (!session) {
    return null;
  }
  const mine = buildEntries({ sessions: sessions.length > 0 ? sessions : [session], projects, email, now })
    .filter((entry) => entry.session.id === session.id);
  if (mine.length === 0) {
    return null;
  }
  const mineByPassageId = new Map(mine.map((entry) => [entry.passage.id, entry]));
  const reference = mine[0].session;
  return {
    session: reference,
    slots: buildSessionTimeline(reference).map((slot) => ({
      number: slot.number,
      startAt: slot.startAt,
      endAt: slot.endAt,
      minutes: slot.passage.minutes,
      passageId: slot.passage.id,
      entry: mineByPassageId.get(slot.passage.id) || null
    }))
  };
};

// Rappel discret à l'accueil, seulement autour d'une séance : le prochain passage dans les
// 7 jours (une annulation prime), sinon le dernier passage tenu il y a 7 jours au plus.
export const getCommitteePassageHint = (passages, now = new Date(), windowDays = COMMITTEE_PASSAGE_HINT_DAYS) => {
  if (!passages) {
    return null;
  }
  const soon = passages.upcoming.filter((entry) => getDaysUntilSession(entry.session, now) <= windowDays);
  const cancelled = soon.find((entry) => entry.isCancelled);
  if (cancelled) {
    return { kind: 'cancelled', entry: cancelled };
  }
  const next = soon.find((entry) => !entry.isCancelled);
  if (next) {
    return { kind: 'upcoming', entry: next };
  }
  const recent = passages.past.find((entry) => !entry.isCancelled && getDaysUntilSession(entry.session, now) >= -windowDays);
  return recent ? { kind: 'recent', entry: recent } : null;
};
