import {
  PASSAGE_KIND_TOPIC,
  SESSION_STATUS_CANCELLED,
  SESSION_STATUS_DRAFT,
  getPassageDecision,
  isLatestProjectPassage,
  isSessionPast,
  normalizeSessions
} from './committeeSessions.js';
import { getProjectTrashEntry } from './projectTrash.js';
import { getDeferredPerimeters } from './stagedConsultation.js';

const fold = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

export const stripHtml = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Situation du projet vis-à-vis de l'application : ce que l'on doit dire clairement à qui retrouve
// un sujet, au lieu de le laisser croire qu'un projet supprimé ou jamais sollicité est « normal ».
export const PROJECT_SITUATIONS = ['live', 'trashed', 'purged', 'missing', 'deferred'];

export const getProjectSituation = (project, committeeId, options = {}) => {
  if (!project) {
    return 'missing';
  }
  const trash = getProjectTrashEntry(project);
  if (trash) {
    return trash.purgedByOwnerAt ? 'purged' : 'trashed';
  }
  const deferred = getDeferredPerimeters(project, options).some((perimeter) => perimeter.key === `committee:${committeeId}`);
  return deferred ? 'deferred' : 'live';
};

// Une entrée par passage de chaque séance (passées, à venir, annulées), prête à être filtrée.
export const buildAgendaSearchEntries = ({ sessions = [], projects = [], committees = [], now = new Date(), stagedOptions = {} } = {}) => {
  const normalized = normalizeSessions(sessions);
  const projectsById = new Map((projects || []).filter(Boolean).map((project) => [project.id, project]));
  const committeeNames = new Map((committees || []).filter(Boolean).map((committee) => [committee.id, committee.name || committee.id]));

  return normalized.flatMap((session) => session.agenda.map((passage) => {
    const isTopic = passage.kind === PASSAGE_KIND_TOPIC;
    const project = isTopic ? null : projectsById.get(passage.projectId) || null;
    const isLatest = !isTopic && isLatestProjectPassage(normalized, passage.projectId, session.committeeId, session.id, now);
    const decision = getPassageDecision({ session, passage, project, isLatest });
    const title = isTopic ? passage.title : project?.projectName || '';
    const comment = stripHtml(decision.comment);
    return {
      key: `${session.id}::${passage.id}`,
      sessionId: session.id,
      passageId: passage.id,
      committeeId: session.committeeId,
      committeeName: committeeNames.get(session.committeeId) || session.committeeId,
      startAt: session.startAt,
      kind: passage.kind,
      projectId: passage.projectId,
      title: stripHtml(title),
      status: decision.status,
      comment,
      timing: session.status === SESSION_STATUS_CANCELLED
        ? 'cancelled'
        : isSessionPast(session, now) ? 'past' : 'upcoming',
      isDraftSession: session.status === SESSION_STATUS_DRAFT,
      projectSituation: isTopic ? 'live' : getProjectSituation(project, session.committeeId, stagedOptions),
      haystack: fold(`${title} ${comment}`)
    };
  }));
};

// Tous les mots saisis doivent figurer (titre ou commentaire), sans tenir compte des accents ni de
// la casse. Du plus récent au plus ancien : les séances à venir en tête, c'est ce qu'on cherche
// quand on veut savoir quand un sujet est programmé.
export const searchAgendaEntries = (entries, query, { committeeId = '' } = {}) => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return (entries || [])
    .filter((entry) => (!committeeId || entry.committeeId === committeeId)
      && words.every((word) => entry.haystack.includes(word)))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
};
