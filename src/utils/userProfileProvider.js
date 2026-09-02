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

class MockUserProfileProvider {
  constructor() {
    this.profiles = new Map();
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
