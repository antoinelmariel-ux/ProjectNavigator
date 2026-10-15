import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { resolveLocalizedText } from './localizedContent.js';
import { DEFAULT_LANGUAGE } from '../i18n/languages.js';

const asLocalized = (value) => (value && typeof value === 'object' ? value : {});

const toEntry = (record) => ({
  id: record.FaqId,
  question: asLocalized(record.QuestionJson),
  answer: asLocalized(record.AnswerJson),
  category: asLocalized(record.CategoryJson),
  isPublished: record.IsPublished !== false,
  updatedBy: record.UpdatedByEmail || '',
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

const toRecord = (entry, { sortOrder, userEmail } = {}) => ({
  Title: resolveLocalizedText(entry.question, DEFAULT_LANGUAGE) || entry.question?.fr || '',
  FaqId: entry.id,
  QuestionJson: asLocalized(entry.question),
  AnswerJson: asLocalized(entry.answer),
  CategoryJson: asLocalized(entry.category),
  IsPublished: entry.isPublished !== false,
  SortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

// En mode local ce mock n'est jamais consulté : l'hydratation par provider est gardée par
// `isSharePointMode()` dans App.jsx et la FAQ vit alors dans la tranche `faqEntries` de
// `complianceNavigatorState` (même partage que rules/teams/projets types).
class MockFaqProvider {
  constructor() {
    this.rows = new Map();
  }

  async listAllFaqEntries() {
    return sortByOrder(Array.from(this.rows.values())).map((record) => ({
      entry: toEntry(record),
      meta: toMeta(record)
    }));
  }

  async saveFaqEntry(entry, { sortOrder, userEmail } = {}) {
    const existing = this.rows.get(entry.id);
    const record = {
      ...toRecord(entry, { sortOrder, userEmail }),
      CreatedByEmail: existing?.CreatedByEmail || userEmail || '',
      RowVersion: (existing?.RowVersion || 0) + 1,
      spItemId: existing?.spItemId ?? this.rows.size + 1
    };
    this.rows.set(entry.id, record);
    return { entry: toEntry(record), meta: toMeta(record) };
  }

  async removeFaqEntry(faqId) {
    this.rows.delete(faqId);
  }
}

export class SharePointFaqProvider {
  constructor() {
    this.repository = getRepository('faq');
  }

  async listAllFaqEntries() {
    const records = await this.repository.getAll();
    return sortByOrder(records).map((record) => ({ entry: toEntry(record), meta: toMeta(record) }));
  }

  async saveFaqEntry(entry, { sortOrder, userEmail, expectedRowVersion } = {}) {
    const existing = await this.repository.findRawByKey(entry.id);
    const record = {
      ...toRecord(entry, { sortOrder, userEmail }),
      CreatedByEmail: (existing && existing.row.CreatedByEmail) || userEmail || ''
    };
    const saved = await this.repository.upsertByKey(record, { expectedRowVersion });
    return { entry: toEntry(saved), meta: toMeta(saved) };
  }

  async removeFaqEntry(faqId) {
    const found = await this.repository.findRawByKey(faqId);
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const faqProvider = isSharePointMode() ? new SharePointFaqProvider() : new MockFaqProvider();
