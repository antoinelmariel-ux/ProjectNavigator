import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const toTeam = (record) => ({
  id: record.TeamId,
  name: record.Title || '',
  contacts: Array.isArray(record.ContactsJson) ? record.ContactsJson : [],
  expertise: record.Expertise || ''
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

const toRecord = (team, { sortOrder, userEmail } = {}) => ({
  Title: team.name || '',
  TeamId: team.id,
  ContactsJson: Array.isArray(team.contacts) ? team.contacts : [],
  Expertise: team.expertise || '',
  SortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

class MockTeamsProvider {
  constructor() {
    this.rows = new Map();
  }

  async listAllTeams() {
    const records = sortByOrder(Array.from(this.rows.values()));
    return records.map((record) => ({ team: toTeam(record), meta: toMeta(record) }));
  }

  async saveTeam(team, { sortOrder, userEmail } = {}) {
    const existing = this.rows.get(team.id);
    const record = {
      ...toRecord(team, { sortOrder, userEmail }),
      CreatedByEmail: existing?.CreatedByEmail || userEmail || '',
      RowVersion: (existing?.RowVersion || 0) + 1,
      spItemId: existing?.spItemId ?? this.rows.size + 1
    };
    this.rows.set(team.id, record);
    return { team: toTeam(record), meta: toMeta(record) };
  }

  async removeTeam(teamId) {
    this.rows.delete(teamId);
  }
}

export class SharePointTeamsProvider {
  constructor() {
    this.repository = getRepository('teams');
  }

  async listAllTeams() {
    const records = await this.repository.getAll();
    return sortByOrder(records).map((record) => ({ team: toTeam(record), meta: toMeta(record) }));
  }

  async saveTeam(team, { sortOrder, userEmail, expectedRowVersion } = {}) {
    const existing = await this.repository.findRawByKey(team.id);
    const record = {
      ...toRecord(team, { sortOrder, userEmail }),
      CreatedByEmail: (existing && existing.row.CreatedByEmail) || userEmail || ''
    };
    const saved = await this.repository.upsertByKey(record, { expectedRowVersion });
    return { team: toTeam(saved), meta: toMeta(saved) };
  }

  async removeTeam(teamId) {
    const found = await this.repository.findRawByKey(teamId);
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const teamsProvider = isSharePointMode() ? new SharePointTeamsProvider() : new MockTeamsProvider();
