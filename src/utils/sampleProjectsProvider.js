import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const sampleLabel = (sample) => {
  const name = sample && sample.name;
  if (typeof name === 'string' && name.trim() !== '') {
    return name.trim();
  }
  return String(sample?.id || '');
};

const toSample = (record) => ({
  id: record.SampleId,
  name: record.Title || record.SampleId,
  answers: record.AnswersJson && typeof record.AnswersJson === 'object' ? record.AnswersJson : {},
  createdBy: record.CreatedByEmail || '',
  updatedAt: record.UpdatedAt || ''
});

const toMeta = (record) => ({
  spItemId: record.spItemId,
  rowVersion: record.RowVersion,
  sortOrder: record.SortOrder
});

const sortByOrder = (records) =>
  records.slice().sort((a, b) => {
    const orderA = Number.isFinite(a.SortOrder) ? a.SortOrder : Number(a.spItemId) || 0;
    const orderB = Number.isFinite(b.SortOrder) ? b.SortOrder : Number(b.spItemId) || 0;
    return orderA - orderB;
  });

const toRecord = (sample, { sortOrder, userEmail } = {}) => ({
  Title: sampleLabel(sample),
  SampleId: sample.id,
  AnswersJson: sample.answers && typeof sample.answers === 'object' ? sample.answers : {},
  SortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

// En mode local/`file://` ce mock n'est jamais consulté : l'hydratation par provider est
// gardée par `isSharePointMode()` dans App.jsx, et les projets types vivent alors dans la
// tranche `complianceSampleProjects` de `complianceNavigatorState` — exactement le partage
// retenu pour rules/teams. Il existe pour que le module s'exporte de la même façon dans les
// deux modes, pas pour stocker quoi que ce soit durablement.
class MockSampleProjectsProvider {
  constructor() {
    this.rows = new Map();
  }

  async listAllSampleProjects() {
    const records = sortByOrder(Array.from(this.rows.values()));
    return records.map((record) => ({ sample: toSample(record), meta: toMeta(record) }));
  }

  async saveSampleProject(sample, { sortOrder, userEmail } = {}) {
    const existing = this.rows.get(sample.id);
    const record = {
      ...toRecord(sample, { sortOrder, userEmail }),
      CreatedByEmail: existing?.CreatedByEmail || userEmail || '',
      RowVersion: (existing?.RowVersion || 0) + 1,
      spItemId: existing?.spItemId ?? this.rows.size + 1
    };
    this.rows.set(sample.id, record);
    return { sample: toSample(record), meta: toMeta(record) };
  }

  async removeSampleProject(sampleId) {
    this.rows.delete(sampleId);
  }
}

export class SharePointSampleProjectsProvider {
  constructor() {
    this.repository = getRepository('sampleProjects');
  }

  async listAllSampleProjects() {
    const records = await this.repository.getAll();
    return sortByOrder(records).map((record) => ({ sample: toSample(record), meta: toMeta(record) }));
  }

  async saveSampleProject(sample, { sortOrder, userEmail, expectedRowVersion } = {}) {
    const existing = await this.repository.findRawByKey(sample.id);
    const record = {
      ...toRecord(sample, { sortOrder, userEmail }),
      CreatedByEmail: (existing && existing.row.CreatedByEmail) || userEmail || ''
    };
    const saved = await this.repository.upsertByKey(record, { expectedRowVersion });
    return { sample: toSample(saved), meta: toMeta(saved) };
  }

  async removeSampleProject(sampleId) {
    const found = await this.repository.findRawByKey(sampleId);
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const sampleProjectsProvider = isSharePointMode()
  ? new SharePointSampleProjectsProvider()
  : new MockSampleProjectsProvider();
