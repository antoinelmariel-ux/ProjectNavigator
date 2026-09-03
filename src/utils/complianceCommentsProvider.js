import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { loadPersistedMockMap, savePersistedMockMap } from './mockProviderPersistence.js';

// Un commentaire racine (team:<id> ou committee:<id>) a un id déterministe : le republier
// met à jour la même ligne au lieu d’en créer une nouvelle à chaque édition.
const buildSectionKey = (targetType, targetId) => `${targetType === 'committee' ? 'committee' : 'team'}:${targetId}`;
const buildRootId = (projectId, sectionKey) => `${projectId}::${sectionKey}`;

// Seul « pending_information » signale un échange encore ouvert : validated,
// validated_with_conditions, rejected et not_concerned sont tous des statuts finaux.
const isResolvedStatus = (status) => typeof status === 'string' && status !== '' && status !== 'pending_information';

const toRootFields = (projectId, sectionKey, entry, userEmail) => {
  const rootId = buildRootId(projectId, sectionKey);
  return {
    CommentId: rootId,
    ProjectId: projectId,
    SectionKey: sectionKey,
    Message: typeof entry.comment === 'string' ? entry.comment : '',
    CommentType: 'root',
    ThreadId: rootId,
    Status: typeof entry.status === 'string' ? entry.status : '',
    Resolved: isResolvedStatus(entry.status),
    AttachmentsJson: Array.isArray(entry.attachments) ? entry.attachments : [],
    CreatedByEmail: userEmail || '',
    UpdatedByEmail: userEmail || '',
    UpdatedAt: new Date().toISOString()
  };
};

const toReplyFields = (projectId, sectionKey, rootId, reply, userEmail) => ({
  CommentId: reply.id,
  ProjectId: projectId,
  SectionKey: sectionKey,
  Message: typeof reply.message === 'string' ? reply.message : '',
  CommentType: 'reply',
  ThreadId: rootId,
  Status: '',
  Resolved: false,
  AttachmentsJson: Array.isArray(reply.attachments) ? reply.attachments : [],
  CreatedByEmail: reply.authorEmail || userEmail || '',
  UpdatedByEmail: reply.authorEmail || userEmail || '',
  // Pas de colonne dédiée à la date de création d’une réponse (elle n’est jamais éditée
  // après coup) : UpdatedAt en tient lieu.
  UpdatedAt: reply.createdAt || new Date().toISOString()
});

// Regroupe les lignes plates d’un projet en la forme {teams, committees} attendue par
// normalizeComplianceComments côté UI.
const reconstructFromRows = (rows) => {
  const teams = {};
  const committees = {};
  const roots = new Map();

  rows
    .filter((row) => row.CommentType !== 'reply')
    .forEach((row) => {
      const [kind, id] = String(row.SectionKey || '').split(':');
      const entry = {
        comment: row.Message || '',
        status: row.Status || '',
        attachments: Array.isArray(row.AttachmentsJson) ? row.AttachmentsJson : [],
        replies: []
      };
      roots.set(row.ThreadId || row.CommentId, entry);
      if (kind === 'committee' && id) {
        committees[id] = entry;
      } else if (kind === 'team' && id) {
        teams[id] = entry;
      }
    });

  rows
    .filter((row) => row.CommentType === 'reply')
    .sort((a, b) => String(a.UpdatedAt || '').localeCompare(String(b.UpdatedAt || '')))
    .forEach((row) => {
      const rootEntry = roots.get(row.ThreadId);
      if (!rootEntry) {
        return;
      }
      rootEntry.replies.push({
        id: row.CommentId,
        message: row.Message || '',
        authorName: row.CreatedByEmail || '',
        authorEmail: row.CreatedByEmail || '',
        createdAt: row.UpdatedAt || '',
        attachments: Array.isArray(row.AttachmentsJson) ? row.AttachmentsJson : []
      });
    });

  return { teams, committees };
};

// Regroupe des lignes de plusieurs projets en { [projectId]: {teams, committees} },
// pour un chargement en un seul appel (voir listAllComments).
const groupRowsByProject = (rows) => {
  const byProject = new Map();
  rows.forEach((row) => {
    const projectId = row?.ProjectId;
    if (!projectId) {
      return;
    }
    if (!byProject.has(projectId)) {
      byProject.set(projectId, []);
    }
    byProject.get(projectId).push(row);
  });

  const result = {};
  byProject.forEach((projectRows, projectId) => {
    result[projectId] = reconstructFromRows(projectRows);
  });
  return result;
};

const MOCK_COMMENTS_STORAGE_KEY = 'complianceNavigatorMockComplianceComments';

class MockComplianceCommentsProvider {
  constructor() {
    this.rows = loadPersistedMockMap(MOCK_COMMENTS_STORAGE_KEY);
  }

  async listComments(projectId) {
    const rows = Array.from(this.rows.values()).filter((row) => row.ProjectId === projectId);
    return reconstructFromRows(rows);
  }

  async listAllComments() {
    return groupRowsByProject(Array.from(this.rows.values()));
  }

  async upsertComment(projectId, targetType, targetId, entry, { userEmail } = {}) {
    const sectionKey = buildSectionKey(targetType, targetId);
    const rootId = buildRootId(projectId, sectionKey);

    this.rows.set(rootId, toRootFields(projectId, sectionKey, entry, userEmail));
    (Array.isArray(entry.replies) ? entry.replies : []).forEach((reply) => {
      const fields = toReplyFields(projectId, sectionKey, rootId, reply, userEmail);
      this.rows.set(fields.CommentId, fields);
    });
    savePersistedMockMap(MOCK_COMMENTS_STORAGE_KEY, this.rows);
  }
}

export class SharePointComplianceCommentsProvider {
  constructor() {
    this.repository = getRepository('complianceComments');
  }

  async listComments(projectId) {
    const records = await this.repository.findBy('ProjectId', projectId);
    return reconstructFromRows(records);
  }

  async listAllComments() {
    const records = await this.repository.getAll();
    return groupRowsByProject(records);
  }

  async upsertComment(projectId, targetType, targetId, entry, { userEmail } = {}) {
    const sectionKey = buildSectionKey(targetType, targetId);
    const rootId = buildRootId(projectId, sectionKey);

    await this.repository.upsertByKey(toRootFields(projectId, sectionKey, entry, userEmail));

    const replies = Array.isArray(entry.replies) ? entry.replies : [];
    // Séquentiel : upsertByKey relit la ligne avant d’écrire ; un Promise.all n’apporterait
    // qu’un risque de course sur le digest partagé pour un gain négligeable (peu de réponses).
    for (const reply of replies) {
      await this.repository.upsertByKey(toReplyFields(projectId, sectionKey, rootId, reply, userEmail));
    }
  }
}

export const complianceCommentsProvider = isSharePointMode()
  ? new SharePointComplianceCommentsProvider()
  : new MockComplianceCommentsProvider();
