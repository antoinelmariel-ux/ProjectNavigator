import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { normalizeEmail } from './normalizeEmail.js';
import { loadPersistedMockMap, savePersistedMockMap } from './mockProviderPersistence.js';

// Clé déterministe : ajouter deux fois le même email met juste à jour la ligne existante
// au lieu d’en créer une en double.
const buildEntryId = (projectId, email) => `${projectId}::${normalizeEmail(email)}`;

const toMember = (record) => ({
  projectId: record.ProjectId,
  email: record.MemberEmail,
  role: record.Role || 'Contributor',
  canSubmit: Boolean(record.CanSubmit)
});

const MOCK_MEMBERS_STORAGE_KEY = 'complianceNavigatorMockProjectMembers';

class MockProjectMembersProvider {
  constructor() {
    this.members = loadPersistedMockMap(MOCK_MEMBERS_STORAGE_KEY);
  }

  async listMembers(projectId) {
    return Array.from(this.members.values())
      .filter((record) => record.ProjectId === projectId)
      .map(toMember);
  }

  async addMember(projectId, email, { role = 'Contributor', canSubmit = true } = {}) {
    const entryId = buildEntryId(projectId, email);
    const record = {
      EntryId: entryId,
      ProjectId: projectId,
      MemberEmail: normalizeEmail(email),
      Role: role,
      CanSubmit: canSubmit
    };
    this.members.set(entryId, record);
    savePersistedMockMap(MOCK_MEMBERS_STORAGE_KEY, this.members);
    return toMember(record);
  }

  async removeMember(projectId, email) {
    this.members.delete(buildEntryId(projectId, email));
    savePersistedMockMap(MOCK_MEMBERS_STORAGE_KEY, this.members);
  }
}

export class SharePointProjectMembersProvider {
  constructor() {
    this.repository = getRepository('projectMembers');
  }

  async listMembers(projectId) {
    const records = await this.repository.findBy('ProjectId', projectId);
    return records.map(toMember);
  }

  async addMember(projectId, email, { role = 'Contributor', canSubmit = true } = {}) {
    const saved = await this.repository.upsertByKey({
      EntryId: buildEntryId(projectId, email),
      ProjectId: projectId,
      MemberEmail: normalizeEmail(email),
      Role: role,
      CanSubmit: canSubmit
    });
    return toMember(saved);
  }

  async removeMember(projectId, email) {
    const found = await this.repository.findRawByKey(buildEntryId(projectId, email));
    if (!found) {
      return;
    }
    await this.repository.remove(found.row.Id, found.etag);
  }
}

export const projectMembersProvider = isSharePointMode()
  ? new SharePointProjectMembersProvider()
  : new MockProjectMembersProvider();
