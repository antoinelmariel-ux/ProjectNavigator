import { normalizeEmail } from './normalizeEmail.js';
import { normalizeTeamContacts } from './teamContacts.js';

// Deux réglages que chaque personne porte dans son propre profil (CN_UserProfiles), et non
// dans la configuration de l'équipe :
//   - `teamPreferences[teamId].claimCopy` : recevoir en copie l'annonce de prise en charge d'un
//     collègue sur cette équipe. Désactivé par défaut — c'est le volume d'e-mails que la prise
//     en charge est censée supprimer.
//   - `absence` : une période d'indisponibilité et un suppléant. Modifiable par un tiers
//     (back-office), parce qu'une absence imprévue n'est jamais déclarée par l'absent.

const readProfile = (profiles, email) => {
  const key = normalizeEmail(email);
  if (!key || !profiles) {
    return null;
  }
  if (typeof profiles.get === 'function') {
    return profiles.get(key) || null;
  }
  if (typeof profiles === 'object') {
    return profiles[key] || null;
  }
  return null;
};

export const normalizeTeamPreferences = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [teamId, entry]) => {
    if (typeof teamId !== 'string' || teamId.trim().length === 0) {
      return accumulator;
    }
    const claimCopy = Boolean(entry && typeof entry === 'object' ? entry.claimCopy : entry);
    if (!claimCopy) {
      return accumulator;
    }
    accumulator[teamId.trim()] = { claimCopy: true };
    return accumulator;
  }, {});
};

export const setTeamPreference = (preferences, teamId, patch = {}) => {
  const normalized = normalizeTeamPreferences(preferences);
  const key = typeof teamId === 'string' ? teamId.trim() : '';
  if (!key) {
    return normalized;
  }
  return normalizeTeamPreferences({ ...normalized, [key]: { ...(normalized[key] || {}), ...patch } });
};

export const wantsClaimCopy = (profile, teamId) => {
  const key = typeof teamId === 'string' ? teamId.trim() : '';
  if (!key) {
    return false;
  }
  return Boolean(normalizeTeamPreferences(profile?.teamPreferences)[key]?.claimCopy);
};

export const wantsClaimCopyForTeam = (profiles, email, teamId) =>
  wantsClaimCopy(readProfile(profiles, email), teamId);

const toDayString = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '';
  }
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1] : '';
};

export const normalizeAbsence = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const from = toDayString(value.from);
  const to = toDayString(value.to);
  const backupEmail = normalizeEmail(value.backupEmail);

  // Une absence sans aucune borne ni suppléant ne dit rien : on la considère absente.
  if (!from && !to && !backupEmail) {
    return null;
  }

  return {
    from,
    to,
    backupEmail,
    updatedByEmail: normalizeEmail(value.updatedByEmail),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : ''
  };
};

// Bornes inclusives à la journée : « absent du 14 au 18 » couvre le 18 en entier.
export const isAbsenceActive = (absence, now = new Date().toISOString()) => {
  const normalized = normalizeAbsence(absence);
  if (!normalized) {
    return false;
  }
  const today = toDayString(now) || toDayString(new Date(now).toISOString());
  if (!today) {
    return false;
  }
  if (normalized.from && today < normalized.from) {
    return false;
  }
  if (normalized.to && today > normalized.to) {
    return false;
  }
  return Boolean(normalized.from || normalized.to || normalized.backupEmail);
};

export const getActiveAbsence = (profiles, email, now = new Date().toISOString()) => {
  const absence = normalizeAbsence(readProfile(profiles, email)?.absence);
  return absence && isAbsenceActive(absence, now) ? absence : null;
};

// Le suppléant ne vaut que s'il est lui-même contact de l'équipe : sinon la substitution
// enverrait la sollicitation à quelqu'un qui n'a pas accès au périmètre.
export const resolveAbsenceBackupContact = (team, absence) => {
  const backupKey = normalizeEmail(absence?.backupEmail);
  if (!backupKey) {
    return '';
  }
  return normalizeTeamContacts(team).find((contact) => normalizeEmail(contact) === backupKey) || '';
};

// Remplace chaque destinataire absent par son suppléant. Une absence sans suppléant ne retire
// personne : mieux vaut un e-mail qui attend le retour qu'un périmètre que plus personne ne
// reçoit.
export const applyAbsenceSubstitution = (recipients, { team, profiles, now = new Date().toISOString() } = {}) => {
  const list = Array.isArray(recipients) ? recipients : [];
  if (!profiles || list.length === 0) {
    return list;
  }

  const seen = new Set();
  const result = [];

  list.forEach((recipient) => {
    const absence = getActiveAbsence(profiles, recipient, now);
    const backup = absence ? resolveAbsenceBackupContact(team, absence) : '';
    const effective = backup || recipient;
    const key = normalizeEmail(effective);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(effective);
  });

  return result;
};

export const getAbsentTeamContacts = (team, profiles, now = new Date().toISOString()) =>
  normalizeTeamContacts(team)
    .map((contact) => ({ contact, absence: getActiveAbsence(profiles, contact, now) }))
    .filter((entry) => Boolean(entry.absence));
