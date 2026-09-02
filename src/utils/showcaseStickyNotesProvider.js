import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const toNote = (record) => {
  const anchor = record.AnchorJson && typeof record.AnchorJson === 'object' ? record.AnchorJson : {};

  return {
    id: record.StickyId,
    projectId: record.ProjectId,
    scope: anchor.scope || '',
    sectionId: anchor.sectionId || record.ShowcaseSection || '',
    sectionX: anchor.sectionX,
    sectionY: anchor.sectionY,
    x: anchor.x,
    y: anchor.y,
    text: record.Content || '',
    color: record.Color || '',
    status: record.Resolved ? 'closed' : 'open',
    replies: Array.isArray(record.RepliesJson) ? record.RepliesJson : [],
    attachments: Array.isArray(record.AttachmentsJson) ? record.AttachmentsJson : [],
    rowVersion: Number(record.RowVersion) || 1,
    // Le libellé d’auteur affiché dans l’UI (sourceId) n’est pas persisté côté SharePoint,
    // seul l’email l’est : à la relecture on retombe dessus, faute de mieux.
    sourceId: record.CreatedByEmail || '',
    sourceEmail: record.CreatedByEmail || '',
    closedAt: record.Resolved ? record.UpdatedAt || null : null,
    closedBy: record.Resolved ? record.UpdatedByEmail || '' : ''
  };
};

const toListItem = (note, userEmail) => ({
  StickyId: note.id,
  ProjectId: note.projectId,
  ShowcaseSection: note.sectionId || '',
  AnchorJson: {
    scope: note.scope || '',
    sectionId: note.sectionId || '',
    sectionX: note.sectionX,
    sectionY: note.sectionY,
    x: note.x,
    y: note.y
  },
  Content: note.text || '',
  Color: note.color || '',
  Resolved: note.status === 'closed',
  RepliesJson: Array.isArray(note.replies) ? note.replies : [],
  AttachmentsJson: Array.isArray(note.attachments) ? note.attachments : [],
  RowVersion: Number(note.rowVersion) || 1,
  CreatedByEmail: note.sourceEmail || userEmail || '',
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

class MockShowcaseStickyNotesProvider {
  constructor() {
    this.notes = new Map();
  }

  async listNotes(projectId) {
    return Array.from(this.notes.values())
      .filter((record) => record.ProjectId === projectId)
      .map(toNote);
  }

  async upsertNote(note, { userEmail } = {}) {
    const record = toListItem(note, userEmail);
    this.notes.set(record.StickyId, record);
    return toNote(record);
  }
}

export class SharePointShowcaseStickyNotesProvider {
  constructor() {
    this.repository = getRepository('showcaseStickyNotes');
  }

  async listNotes(projectId) {
    const records = await this.repository.findBy('ProjectId', projectId);
    return records.map(toNote);
  }

  async upsertNote(note, { userEmail } = {}) {
    const saved = await this.repository.upsertByKey(toListItem(note, userEmail));
    return toNote(saved);
  }
}

export const showcaseStickyNotesProvider = isSharePointMode()
  ? new SharePointShowcaseStickyNotesProvider()
  : new MockShowcaseStickyNotesProvider();
