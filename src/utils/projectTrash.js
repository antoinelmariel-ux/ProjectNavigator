import { normalizeEmail } from './normalizeEmail.js';

// Supprimer un projet le met à la corbeille : un marqueur dans ses réponses (comme tous les
// marqueurs de niveau projet, il voyage dans `AnswersJson`, sans nouvelle colonne SharePoint),
// jamais une ligne retirée. Seule la suppression définitive depuis la corbeille efface vraiment
// le projet — et seulement tant qu'aucun expert n'a répondu : un avis donné est une trace de
// travail qui appartient aussi aux experts. Le projet quitte alors la corbeille du porteur
// (`purgedByOwnerAt`) mais reste, côté experts, dans « Abandonnés ».
export const PROJECT_TRASH_KEY = '__project_trash__';

const toText = (value) => (typeof value === 'string' ? value.trim() : '');

const stripHtml = (value) => toText(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

export const getProjectTrashEntry = (project) => {
  const raw = project?.answers?.[PROJECT_TRASH_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !toText(raw.deletedAt)) {
    return null;
  }

  return {
    deletedAt: toText(raw.deletedAt),
    deletedBy: normalizeEmail(raw.deletedBy || ''),
    purgedByOwnerAt: toText(raw.purgedByOwnerAt),
    purgedBy: normalizeEmail(raw.purgedBy || '')
  };
};

export const isProjectTrashed = (project) => getProjectTrashEntry(project) !== null;

export const isProjectPurgedByOwner = (project) => Boolean(getProjectTrashEntry(project)?.purgedByOwnerAt);

export const isProjectInOwnerTrash = (project) => {
  const entry = getProjectTrashEntry(project);
  return Boolean(entry) && !entry.purgedByOwnerAt;
};

export const withProjectTrashed = (answers, { by = '', at = new Date().toISOString() } = {}) => ({
  ...(answers || {}),
  [PROJECT_TRASH_KEY]: { deletedAt: at, deletedBy: normalizeEmail(by) }
});

export const withProjectRestored = (answers) => {
  if (!answers || typeof answers !== 'object' || !(PROJECT_TRASH_KEY in answers)) {
    return answers;
  }
  const rest = { ...answers };
  delete rest[PROJECT_TRASH_KEY];
  return rest;
};

export const withProjectPurgedByOwner = (answers, { by = '', at = new Date().toISOString() } = {}) => {
  const current = answers?.[PROJECT_TRASH_KEY];
  const base = current && typeof current === 'object' && !Array.isArray(current) && toText(current.deletedAt)
    ? current
    : { deletedAt: at, deletedBy: normalizeEmail(by) };

  return {
    ...(answers || {}),
    [PROJECT_TRASH_KEY]: { ...base, purgedByOwnerAt: at, purgedBy: normalizeEmail(by) }
  };
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// « Réponse ou avis d'un expert » se lit sur l'entrée *brute* d'un périmètre : un statut posé, un
// commentaire écrit, ou une réponse dans le fil qui ne vient pas du porteur. L'auto-validation
// n'écrit rien dans l'entrée brute, elle n'est donc jamais prise pour un avis — personne n'a
// travaillé dessus.
const hasPerimeterResponse = (entry, { ownerEmails, expertEmails }) => {
  if (!isPlainObject(entry)) {
    return false;
  }

  if (toText(entry.status) || stripHtml(entry.comment)) {
    return true;
  }

  const replies = Array.isArray(entry.replies) ? entry.replies : [];
  return replies.some((reply) => {
    const author = normalizeEmail(reply?.authorEmail || '');
    if (!author) {
      return false;
    }
    if (expertEmails) {
      return expertEmails.has(author);
    }
    return !ownerEmails.has(author);
  });
};

const getProjectOwnerEmails = (project) => new Set(
  [project?.ownerEmail, ...(Array.isArray(project?.sharedWith) ? project.sharedWith : [])]
    .map((email) => normalizeEmail(email || ''))
    .filter(Boolean)
);

// `contactsByTeamId`/`emailsByCommitteeId` sont facultatifs : sans eux, toute réponse qui ne vient
// pas du porteur ou d'un co-porteur compte comme réponse d'expert.
export const getRespondedPerimeters = (project, { contactsByTeamId = null, emailsByCommitteeId = null } = {}) => {
  const comments = project?.answers?.__compliance_team_comments__;
  const ownerEmails = getProjectOwnerEmails(project);
  const toSet = (list) => (Array.isArray(list) ? new Set(list.map((email) => normalizeEmail(email || '')).filter(Boolean)) : null);

  const collect = (entries, lookup) => (isPlainObject(entries) ? Object.keys(entries) : []).filter((id) => (
    hasPerimeterResponse(entries[id], {
      ownerEmails,
      expertEmails: lookup ? toSet(lookup[id]) : null
    })
  ));

  return {
    teamIds: collect(isPlainObject(comments) ? comments.teams : null, contactsByTeamId),
    committeeIds: collect(isPlainObject(comments) ? comments.committees : null, emailsByCommitteeId)
  };
};

export const hasExpertResponse = (project, options) => {
  const { teamIds, committeeIds } = getRespondedPerimeters(project, options);
  return teamIds.length > 0 || committeeIds.length > 0;
};

export const canPermanentlyDeleteProject = (project, options) => !hasExpertResponse(project, options);

// Seul un expert dont l'équipe ou le comité a répondu garde l'accès à un projet supprimé : c'est
// exactement ce que montre son onglet « Abandonnés ».
export const isRespondingExpert = (project, email, options = {}) => {
  const normalized = normalizeEmail(email || '');
  if (!normalized) {
    return false;
  }

  const { teamIds, committeeIds } = getRespondedPerimeters(project, options);
  const includes = (list) => Array.isArray(list) && list.some((entry) => normalizeEmail(entry || '') === normalized);
  return teamIds.some((id) => includes(options.contactsByTeamId?.[id]))
    || committeeIds.some((id) => includes(options.emailsByCommitteeId?.[id]));
};
