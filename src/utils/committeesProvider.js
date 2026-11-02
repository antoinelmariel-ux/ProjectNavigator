import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const committeeLabel = (committee) => {
  const name = committee && committee.name;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : String(committee?.id || '');
};

const toCommittee = (record) => ({
  ...(record.PayloadJson && typeof record.PayloadJson === 'object' ? record.PayloadJson : {}),
  id: record.CommitteeId
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

const toRecord = (committee, { sortOrder, userEmail } = {}) => ({
  Title: committeeLabel(committee),
  CommitteeId: committee.id,
  PayloadJson: committee,
  SortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

class MockCommitteesProvider {
  constructor() {
    this.rows = new Map();
  }

  async listAllCommittees() {
    const records = sortByOrder(Array.from(this.rows.values()));
    return records.map((record) => ({ committee: toCommittee(record), meta: toMeta(record) }));
  }

  async saveCommittee(committee, { sortOrder, userEmail } = {}) {
    const existing = this.rows.get(committee.id);
    const record = {
      ...toRecord(committee, { sortOrder, userEmail }),
      CreatedByEmail: existing?.CreatedByEmail || userEmail || '',
      RowVersion: (existing?.RowVersion || 0) + 1,
      spItemId: existing?.spItemId ?? this.rows.size + 1
    };
    this.rows.set(committee.id, record);
    return { committee: toCommittee(record), meta: toMeta(record) };
  }

  async removeCommittee(committeeId) {
    this.rows.delete(committeeId);
  }
}

export class SharePointCommitteesProvider {
  constructor() {
    this.repository = getRepository('committees');
  }

  async listAllCommittees() {
    const records = await this.repository.getAll();
    return sortByOrder(records).map((record) => ({ committee: toCommittee(record), meta: toMeta(record) }));
  }

  async saveCommittee(committee, { sortOrder, userEmail, expectedRowVersion } = {}) {
    const existing = await this.repository.findRawByKey(committee.id);
    const record = {
      ...toRecord(committee, { sortOrder, userEmail }),
      CreatedByEmail: (existing && existing.row.CreatedByEmail) || userEmail || ''
    };
    const saved = await this.repository.upsertByKey(record, { expectedRowVersion });
    return { committee: toCommittee(saved), meta: toMeta(saved) };
  }

  async removeCommittee(committeeId) {
    const found = await this.repository.findRawByKey(committeeId);
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const committeesProvider = isSharePointMode()
  ? new SharePointCommitteesProvider()
  : new MockCommitteesProvider();
