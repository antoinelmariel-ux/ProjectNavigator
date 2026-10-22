import { normalizeEmail } from './normalizeEmail.js';
import { isProjectTrashed } from './projectTrash.js';

// Recherche de la console d'administration (voir adminConsole.js). Elle porte sur tous les
// projets, brouillons et corbeille compris, et d'abord sur leur porteur : c'est presque
// toujours par la personne qu'un administrateur retrouve un projet (« le projet de Martin »).

export const ADMIN_PROJECT_STATUSES = ['draft', 'submitted', 'cancelled', 'trashed'];

const toText = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));

// Insensible à la casse et aux accents : « Hélène » se retrouve en tapant « helene ».
export const foldSearchText = (value) => toText(value)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

const stripTags = (value) => toText(value).replace(/<[^>]*>/g, ' ');

// Les profils ne portent pas de nom affiché : celui-ci se lit dans l'adresse
// (prenom.nom@…), ce qui suffit à reconnaître quelqu'un dans une liste.
export const formatOwnerLabel = (email) => {
  const normalized = normalizeEmail(email || '');
  if (!normalized) {
    return '';
  }

  const localPart = normalized.split('@')[0];
  const words = localPart.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) {
    return normalized;
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const getAdminProjectStatus = (project) => {
  if (isProjectTrashed(project)) {
    return 'trashed';
  }
  const status = toText(project?.status);
  return ADMIN_PROJECT_STATUSES.includes(status) ? status : 'draft';
};

const getProjectTimestamp = (project) => {
  const candidates = [project?.lastUpdated, project?.submittedAt, project?.createdAt];
  for (const candidate of candidates) {
    const time = Date.parse(toText(candidate));
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  return 0;
};

const getCoOwnerEmails = (project) => (Array.isArray(project?.sharedWith) ? project.sharedWith : [])
  .map((entry) => normalizeEmail(entry || ''))
  .filter(Boolean);

const buildOwnerHaystack = (project) => {
  const ownerEmail = normalizeEmail(project?.ownerEmail || '');
  return foldSearchText([ownerEmail, formatOwnerLabel(ownerEmail)].join(' '));
};

const buildHaystack = (project) => {
  const answers = project?.answers || {};
  const coOwners = getCoOwnerEmails(project);
  return foldSearchText([
    stripTags(project?.projectName),
    project?.id,
    buildOwnerHaystack(project),
    ...coOwners,
    ...coOwners.map(formatOwnerLabel),
    answers.teamLead,
    answers.teamLeadTeam
  ].map(toText).join(' '));
};

// Un porteur par ligne, avec son nombre de projets : c'est la liste du filtre « Porteur ».
export const listProjectOwners = (projects) => {
  const counts = new Map();
  (Array.isArray(projects) ? projects : []).forEach((project) => {
    const email = normalizeEmail(project?.ownerEmail || '');
    if (email) {
      counts.set(email, (counts.get(email) || 0) + 1);
    }
  });

  return Array.from(counts, ([email, count]) => ({ email, label: formatOwnerLabel(email), count }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.email.localeCompare(b.email));
};

// Tous les mots tapés doivent être retrouvés (« darieux vaccin » : un projet de Darieux dont le
// nom parle de vaccin). Un projet dont le porteur correspond passe devant, puis le plus récent.
export const searchAdminProjects = (projects, { query = '', ownerEmail = '', status = '' } = {}) => {
  const tokens = foldSearchText(query).split(/\s+/).filter(Boolean);
  const owner = normalizeEmail(ownerEmail || '');

  return (Array.isArray(projects) ? projects : [])
    .filter((project) => project && project.id)
    .filter((project) => !owner || normalizeEmail(project.ownerEmail || '') === owner)
    .filter((project) => !status || getAdminProjectStatus(project) === status)
    .map((project) => {
      if (tokens.length === 0) {
        return { project, ownerMatches: 0 };
      }
      const haystack = buildHaystack(project);
      if (!tokens.every((token) => haystack.includes(token))) {
        return null;
      }
      const ownerHaystack = buildOwnerHaystack(project);
      return { project, ownerMatches: tokens.filter((token) => ownerHaystack.includes(token)).length };
    })
    .filter(Boolean)
    .sort((a, b) => (b.ownerMatches - a.ownerMatches) || (getProjectTimestamp(b.project) - getProjectTimestamp(a.project)))
    .map((entry) => entry.project);
};
