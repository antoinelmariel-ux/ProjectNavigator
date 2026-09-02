import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const ruleLabel = (rule) => {
  const name = rule && rule.name;
  if (typeof name === 'string' && name.trim() !== '') {
    return name.trim();
  }
  if (name && typeof name === 'object') {
    const fallback = name.fr || name.en || Object.values(name).find((value) => typeof value === 'string' && value.trim() !== '');
    if (typeof fallback === 'string' && fallback.trim() !== '') {
      return fallback.trim();
    }
  }
  return String(rule?.id || '');
};

const toRule = (record) => ({
  ...(record.PayloadJson && typeof record.PayloadJson === 'object' ? record.PayloadJson : {}),
  id: record.RuleId
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

const toRecord = (rule, { sortOrder, userEmail } = {}) => ({
  Title: ruleLabel(rule),
  RuleId: rule.id,
  PayloadJson: rule,
  SortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

class MockRulesProvider {
  constructor() {
    this.rows = new Map();
  }

  async listAllRules() {
    const records = sortByOrder(Array.from(this.rows.values()));
    return records.map((record) => ({ rule: toRule(record), meta: toMeta(record) }));
  }

  async saveRule(rule, { sortOrder, userEmail } = {}) {
    const existing = this.rows.get(rule.id);
    const record = {
      ...toRecord(rule, { sortOrder, userEmail }),
      CreatedByEmail: existing?.CreatedByEmail || userEmail || '',
      RowVersion: (existing?.RowVersion || 0) + 1,
      spItemId: existing?.spItemId ?? this.rows.size + 1
    };
    this.rows.set(rule.id, record);
    return { rule: toRule(record), meta: toMeta(record) };
  }

  async removeRule(ruleId) {
    this.rows.delete(ruleId);
  }
}

export class SharePointRulesProvider {
  constructor() {
    this.repository = getRepository('rules');
  }

  async listAllRules() {
    const records = await this.repository.getAll();
    return sortByOrder(records).map((record) => ({ rule: toRule(record), meta: toMeta(record) }));
  }

  async saveRule(rule, { sortOrder, userEmail, expectedRowVersion } = {}) {
    const existing = await this.repository.findRawByKey(rule.id);
    const record = {
      ...toRecord(rule, { sortOrder, userEmail }),
      CreatedByEmail: (existing && existing.row.CreatedByEmail) || userEmail || ''
    };
    const saved = await this.repository.upsertByKey(record, { expectedRowVersion });
    return { rule: toRule(saved), meta: toMeta(saved) };
  }

  async removeRule(ruleId) {
    const found = await this.repository.findRawByKey(ruleId);
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const rulesProvider = isSharePointMode() ? new SharePointRulesProvider() : new MockRulesProvider();
