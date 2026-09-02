import { initialMockSharePointProjects } from '../data/mockSharePointProjects.js';
import { isSharePointMode } from '../config/sharepointConfig.js';
import { cloneDeep } from './clone.js';
import { ConflictError } from './errors.js';
import { getRepository } from './listRepository.js';

export { ConflictError };

const normalizeStatus = (status) => {
  if (status === 'submitted' || status === 'Submitted') {
    return 'Submitted';
  }
  return 'Draft';
};

const DEFAULT_PROJECTS = initialMockSharePointProjects;

const toProjectEntry = (item) => {
  const answers = item?.AnswersJson && typeof item.AnswersJson === 'object' ? item.AnswersJson : {};
  const analysis = item?.AnalysisJson && typeof item.AnalysisJson === 'object' ? item.AnalysisJson : null;

  return {
    id: item.ProjectId,
    projectName: item.Title || 'Projet sans nom',
    status: item.Status === 'Submitted' ? 'submitted' : 'draft',
    answers,
    analysis,
    answeredQuestions: Number(item.ProgressAnswered) || 0,
    totalQuestions: Number(item.ProgressTotal) || 0,
    lastUpdated: item.LastAutosaveAt || new Date().toISOString(),
    submittedAt: item.SubmissionDate || null,
    ownerEmail: item.OwnerEmail || '',
    rowVersion: Number(item.RowVersion) || 1,
    lastModifiedBy: item.UpdatedByEmail || item.CreatedByEmail || ''
  };
};

const toListItem = (project, userEmail) => ({
  ProjectId: project.id,
  Title: project.projectName || 'Projet sans nom',
  Status: normalizeStatus(project.status),
  OwnerEmail: project.ownerEmail || userEmail || '',
  CurrentEditorEmail: userEmail || project.ownerEmail || '',
  AnswersJson: cloneDeep(project.answers || {}),
  AnalysisJson: cloneDeep(project.analysis || {}),
  ProgressAnswered: Number(project.answeredQuestions) || 0,
  ProgressTotal: Number(project.totalQuestions) || 0,
  SubmissionDate: project.status === 'submitted' ? project.submittedAt || new Date().toISOString() : null,
  LastAutosaveAt: new Date().toISOString(),
  RowVersion: Number(project.rowVersion) || 1,
  CreatedByEmail: project.ownerEmail || userEmail || '',
  UpdatedByEmail: userEmail || ''
});

class MockSharePointProvider {
  constructor() {
    this.projects = new Map();
    DEFAULT_PROJECTS.forEach((item) => {
      if (item?.ProjectId) {
        this.projects.set(item.ProjectId, cloneDeep(item));
      }
    });
  }

  async listProjects() {
    return Array.from(this.projects.values()).map(toProjectEntry);
  }

  listProjectsSync() {
    return Array.from(this.projects.values()).map(toProjectEntry);
  }

  async upsertProject(project, { expectedRowVersion, userEmail } = {}) {
    if (!project?.id) {
      throw new Error('Projet invalide: id manquant');
    }

    const existing = this.projects.get(project.id);
    if (existing) {
      const currentVersion = Number(existing.RowVersion) || 1;
      if (typeof expectedRowVersion === 'number' && expectedRowVersion > 0 && expectedRowVersion !== currentVersion) {
        throw new ConflictError('Conflit de version détecté.', toProjectEntry(existing));
      }
    }

    const nextVersion = existing ? (Number(existing.RowVersion) || 1) + 1 : 1;
    const nextItem = {
      ...toListItem(project, userEmail),
      RowVersion: nextVersion
    };

    this.projects.set(project.id, nextItem);

    const savedProject = toProjectEntry(nextItem);
    return {
      project: savedProject,
      etag: `W/"${savedProject.id}-${savedProject.rowVersion}"`,
      updatedAt: savedProject.lastUpdated,
      updatedBy: savedProject.lastModifiedBy
    };
  }
}

// Pas de listProjectsSync ici : l’accès réseau est asynchrone par nature. Les appelants
// synchrones (hydratation initiale) retombent sur le cache localStorage, et l’effet
// d’hydratation réconcilie ensuite avec le serveur.
export class SharePointRestProvider {
  constructor() {
    this.repository = getRepository('projects');
  }

  async listProjects() {
    const records = await this.repository.getAll();
    return records.map(toProjectEntry);
  }

  async upsertProject(project, { expectedRowVersion, userEmail } = {}) {
    if (!project?.id) {
      throw new Error('Projet invalide: id manquant');
    }

    let saved;
    try {
      saved = await this.repository.upsertByKey(toListItem(project, userEmail), {
        expectedRowVersion
      });
    } catch (error) {
      // Le dépôt renvoie une ligne SharePoint ; l’UI attend un projet applicatif.
      if (error instanceof ConflictError && error.serverRecord) {
        throw new ConflictError(error.message, toProjectEntry(error.serverRecord));
      }
      throw error;
    }
    const savedProject = toProjectEntry(saved);

    return {
      project: savedProject,
      etag: `W/"${savedProject.id}-${savedProject.rowVersion}"`,
      updatedAt: savedProject.lastUpdated,
      updatedBy: savedProject.lastModifiedBy
    };
  }
}

export const dataProvider = isSharePointMode()
  ? new SharePointRestProvider()
  : new MockSharePointProvider();
