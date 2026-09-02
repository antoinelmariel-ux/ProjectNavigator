import { initialMockSharePointInspirations } from '../data/mockSharePointInspirations.js';
import { isSharePointMode } from '../config/sharepointConfig.js';
import { cloneDeep } from './clone.js';
import { getRepository } from './listRepository.js';

const parseInspirationJson = (item) => {
  const payload = item?.InspirationJson;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return payload;
};

const toInspirationEntry = (item) => {
  const inspirationJson = parseInspirationJson(item);

  return {
    id: item.InspirationId,
    title: item.Title || inspirationJson.title || 'Inspiration importée',
    labName: inspirationJson.labName || item.LabName || '',
    target: inspirationJson.target || item.Target || '',
    typology: inspirationJson.typology || item.Typology || '',
    therapeuticArea: inspirationJson.therapeuticArea || item.TherapeuticArea || '',
    country: inspirationJson.country || item.Country || '',
    description: inspirationJson.description || item.Description || '',
    link: inspirationJson.link || item.Link || '',
    review: inspirationJson.review || item.Review || '',
    visibility:
      (inspirationJson.visibility || '').toLowerCase() === 'shared' || item.Visibility === 'Shared'
        ? 'shared'
        : 'personal',
    documents: Array.isArray(inspirationJson.documents)
      ? inspirationJson.documents
      : (Array.isArray(item.DocumentsJson) ? item.DocumentsJson : []),
    createdAt: item.CreatedAt || inspirationJson.createdAt || item.UpdatedAt || new Date().toISOString(),
    updatedAt: item.UpdatedAt || new Date().toISOString(),
    rowVersion: Number(item.RowVersion) || 1,
    ownerEmail: item.CreatedByEmail || '',
    lastModifiedBy: item.UpdatedByEmail || item.CreatedByEmail || ''
  };
};

const toInspirationListItem = (inspiration, userEmail) => ({
  InspirationId: inspiration.id,
  Title: inspiration.title || 'Inspiration importée',
  Visibility: inspiration.visibility === 'shared' ? 'Shared' : 'Personal',
  InspirationJson: {
    title: inspiration.title || '',
    labName: inspiration.labName || '',
    target: inspiration.target || '',
    typology: inspiration.typology || '',
    therapeuticArea: inspiration.therapeuticArea || '',
    country: inspiration.country || '',
    description: inspiration.description || '',
    link: inspiration.link || '',
    review: inspiration.review || '',
    visibility: inspiration.visibility === 'shared' ? 'shared' : 'personal',
    documents: Array.isArray(inspiration.documents) ? inspiration.documents : [],
    createdAt: inspiration.createdAt || new Date().toISOString()
  },
  RowVersion: Number(inspiration.rowVersion) || 1,
  CreatedByEmail: inspiration.ownerEmail || userEmail || '',
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

class MockInspirationProvider {
  constructor() {
    this.inspirations = new Map();
    initialMockSharePointInspirations.forEach((item) => {
      if (item?.InspirationId) {
        this.inspirations.set(item.InspirationId, cloneDeep(item));
      }
    });
  }

  listInspirationsSync() {
    return Array.from(this.inspirations.values()).map(toInspirationEntry);
  }

  async listInspirations() {
    return this.listInspirationsSync();
  }
}

export class SharePointInspirationProvider {
  constructor() {
    this.repository = getRepository('inspirations');
  }

  async listInspirations() {
    const records = await this.repository.getAll();
    return records.map(toInspirationEntry);
  }

  async upsertInspiration(inspiration, { expectedRowVersion, userEmail } = {}) {
    if (!inspiration?.id) {
      throw new Error('Inspiration invalide: id manquant');
    }

    const saved = await this.repository.upsertByKey(
      toInspirationListItem(inspiration, userEmail),
      { expectedRowVersion }
    );
    return toInspirationEntry(saved);
  }
}

export const inspirationDataProvider = isSharePointMode()
  ? new SharePointInspirationProvider()
  : new MockInspirationProvider();
