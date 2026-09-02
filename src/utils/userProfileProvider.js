import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { normalizeEmail } from './normalizeEmail.js';

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

const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

const loadMockProfiles = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return new Map();
  }
  try {
    const raw = storage.getItem(MOCK_PROFILES_STORAGE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return new Map(Array.isArray(entries) ? entries : []);
  } catch {
    return new Map();
  }
};

const saveMockProfiles = (profiles) => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(MOCK_PROFILES_STORAGE_KEY, JSON.stringify(Array.from(profiles.entries())));
  } catch {
    // Quota ou stockage indisponible (mode privé) : le profil reste utilisable pour la
    // session en cours, seule sa persistance après rechargement est perdue.
  }
};

// En mode local/mock, sans backend réel, le profil (et donc l'état "onboarding terminé")
// doit survivre à un rechargement de page comme le reste de l'état applicatif — sans quoi
// l'écran d'onboarding réapparaît à chaque ouverture malgré des projets déjà enregistrés.
class MockUserProfileProvider {
  constructor() {
    this.profiles = loadMockProfiles();
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
    saveMockProfiles(this.profiles);
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
