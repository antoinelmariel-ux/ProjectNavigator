import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { normalizeEmail } from './normalizeEmail.js';
import { loadPersistedMockMap, savePersistedMockMap } from './mockProviderPersistence.js';

const toProfile = (record) => ({
  email: record.UserEmail,
  activityScope: Array.isArray(record.ActivityScopeJson) ? record.ActivityScopeJson : [],
  preferredLanguage: record.PreferredLanguage || '',
  hasCompletedOnboarding: Boolean(record.HasCompletedOnboarding)
});

const buildRecord = (email, { activityScope, preferredLanguage, hasCompletedOnboarding }) => ({
  UserEmail: normalizeEmail(email),
  ActivityScopeJson: Array.isArray(activityScope) ? activityScope : [],
  PreferredLanguage: preferredLanguage || '',
  HasCompletedOnboarding: Boolean(hasCompletedOnboarding),
  UpdatedAt: new Date().toISOString()
});

const MOCK_PROFILES_STORAGE_KEY = 'complianceNavigatorMockUserProfiles';

// En mode local/mock, sans backend réel, le profil (et donc l'état "onboarding terminé")
// doit survivre à un rechargement de page comme le reste de l'état applicatif — sans quoi
// l'écran d'onboarding réapparaît à chaque ouverture malgré des projets déjà enregistrés.
class MockUserProfileProvider {
  constructor() {
    this.profiles = loadPersistedMockMap(MOCK_PROFILES_STORAGE_KEY);
  }

  async getProfile(email) {
    const record = this.profiles.get(normalizeEmail(email));
    return record ? toProfile(record) : null;
  }

  async saveProfile(email, patch) {
    const key = normalizeEmail(email);
    const previous = this.profiles.get(key) || {};
    const record = buildRecord(email, { ...toProfile({ ...previous }), ...patch });
    this.profiles.set(key, record);
    savePersistedMockMap(MOCK_PROFILES_STORAGE_KEY, this.profiles);
    return toProfile(record);
  }
}

export class SharePointUserProfileProvider {
  constructor() {
    this.repository = getRepository('userProfiles');
  }

  async getProfile(email) {
    const record = await this.repository.findByKey(normalizeEmail(email));
    return record ? toProfile(record) : null;
  }

  async saveProfile(email, patch) {
    const existing = await this.repository.findByKey(normalizeEmail(email));
    const merged = { ...(existing ? toProfile(existing) : {}), ...patch };
    const saved = await this.repository.upsertByKey(buildRecord(email, merged));
    return toProfile(saved);
  }
}

export const userProfileProvider = isSharePointMode()
  ? new SharePointUserProfileProvider()
  : new MockUserProfileProvider();
