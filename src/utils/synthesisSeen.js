import { normalizeEmail } from './normalizeEmail.js';
import { isImpersonating } from './impersonation.js';

// Pastille du porteur sur l'accueil : un expert a rendu un avis, posé un statut ou écrit dans un
// fil depuis la dernière fois que le porteur a ouvert les « Enjeux du projet ». La date
// d'ouverture est une donnée de lecture personnelle, pas une donnée du projet : l'écrire dans le
// projet le réenregistrerait (et le ferait remonter) à chaque consultation. Elle vit donc dans le
// localStorage de ce navigateur, par personne — un autre poste ne la connaît pas, c'est assumé.
export const SYNTHESIS_SEEN_STORAGE_KEY = 'complianceNavigatorSynthesisSeen';

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';
const toText = (value) => (typeof value === 'string' ? value : '');

const getStorage = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readAll = (storage) => {
  try {
    const parsed = JSON.parse(storage?.getItem(SYNTHESIS_SEEN_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (storage, value) => {
  if (!storage || isImpersonating()) {
    return;
  }
  try {
    storage.setItem(SYNTHESIS_SEEN_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota plein : la pastille est un confort, elle ne doit jamais faire échouer l'écran.
  }
};

const normalizeRecord = (value) => ({
  initializedAt: toText(value?.initializedAt),
  projects: value?.projects && typeof value.projects === 'object' && !Array.isArray(value.projects)
    ? value.projects
    : {}
});

// À la première lecture pour une personne, on pose une date de référence au lieu de considérer
// tout l'historique comme « nouveau » : sinon, au déploiement, chaque projet déjà commenté
// afficherait sa pastille.
export const ensureSynthesisSeenRecord = (email, { storage = getStorage(), now = new Date().toISOString() } = {}) => {
  const key = normalizeEmail(email);
  if (!key) {
    return normalizeRecord(null);
  }
  const all = readAll(storage);
  const record = normalizeRecord(all[key]);
  if (!record.initializedAt) {
    record.initializedAt = now;
    writeAll(storage, { ...all, [key]: record });
  }
  return record;
};

export const markSynthesisSeen = (email, projectId, { storage = getStorage(), now = new Date().toISOString() } = {}) => {
  const key = normalizeEmail(email);
  if (!key || !projectId) {
    return;
  }
  const all = readAll(storage);
  const record = normalizeRecord(all[key]);
  writeAll(storage, {
    ...all,
    [key]: {
      initializedAt: record.initializedAt || now,
      projects: { ...record.projects, [projectId]: now }
    }
  });
};

export const getSynthesisSeenAt = (record, projectId) =>
  toText(record?.projects?.[projectId]) || toText(record?.initializedAt);

export const getProjectOwnerEmails = (project) => [
  project?.ownerEmail,
  ...(Array.isArray(project?.sharedWith) ? project.sharedWith : [])
].map(normalizeEmail).filter(Boolean);

// Ce qui compte comme « du nouveau des experts » : un avis ou un statut enregistré (même une
// demande d'information), ou un message du fil écrit par quelqu'un d'autre que les porteurs.
export const getLatestExpertActivityAt = (project) => {
  const comments = project?.answers?.[COMPLIANCE_COMMENTS_KEY];
  if (!comments || typeof comments !== 'object') {
    return '';
  }
  const owners = new Set(getProjectOwnerEmails(project));
  const entries = [
    ...Object.values(comments.teams && typeof comments.teams === 'object' ? comments.teams : {}),
    ...Object.values(comments.committees && typeof comments.committees === 'object' ? comments.committees : {})
  ];
  const dates = [];
  entries.forEach((entry) => {
    const hasOpinion = toText(entry?.status).length > 0 || toText(entry?.comment).trim().length > 0;
    if (hasOpinion && toText(entry?.statusUpdatedAt)) {
      dates.push(entry.statusUpdatedAt);
    }
    (Array.isArray(entry?.replies) ? entry.replies : []).forEach((reply) => {
      if (!owners.has(normalizeEmail(reply?.authorEmail)) && toText(reply?.createdAt)) {
        dates.push(reply.createdAt);
      }
    });
  });
  return dates.sort().pop() || '';
};

export const hasUnseenExpertActivity = (project, record) => {
  const latest = getLatestExpertActivityAt(project);
  if (!latest) {
    return false;
  }
  const seenAt = getSynthesisSeenAt(record, project?.id);
  return !seenAt || latest > seenAt;
};
