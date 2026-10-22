import { normalizeEmail } from './normalizeEmail.js';
import { normalizeTeamContacts } from './teamContacts.js';

// Personnes qu'un expert a ajoutées au suivi d'un périmètre (projet × équipe), à côté de la
// prise en charge : answers['__compliance_team_comments__'].teams[teamId].followers. Ajouter
// quelqu'un ne lui donne aucun accès — il doit déjà être contact de l'équipe, et tout contact
// peut déjà ouvrir, commenter et valider. Ce que l'ajout change, ce sont les destinataires :
// la personne reçoit les notifications du périmètre même si le routage par membre l'écartait
// ou si un collègue a pris le projet en charge. C'est un choix explicite fait sur ce projet-là,
// il l'emporte donc sur les critères généraux de l'équipe.
const COMPLIANCE_COMMENTS_ANSWER_KEY = '__compliance_team_comments__';

export const FOLLOWER_ACTION_ADD = 'add';
export const FOLLOWER_ACTION_REMOVE = 'remove';

const toText = (value) => (typeof value === 'string' ? value.trim() : '');

export const normalizePerimeterFollowers = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  return value
    .map((entry) => {
      const raw = typeof entry === 'string' ? { email: entry } : entry;
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      const email = normalizeEmail(raw.email);
      if (!email || seen.has(email)) {
        return null;
      }
      seen.add(email);
      return {
        email,
        addedByEmail: normalizeEmail(raw.addedByEmail),
        addedAt: toText(raw.addedAt)
      };
    })
    .filter(Boolean);
};

export const getPerimeterFollowers = (entry) => normalizePerimeterFollowers(entry?.followers);

export const isPerimeterFollower = (entry, email) => {
  const key = normalizeEmail(email);
  return Boolean(key) && getPerimeterFollowers(entry).some((follower) => follower.email === key);
};

export const applyFollowerAction = (entry, {
  action = FOLLOWER_ACTION_ADD,
  email = '',
  actorEmail = '',
  now = new Date().toISOString()
} = {}) => {
  const baseEntry = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
  const key = normalizeEmail(email);
  if (!key) {
    return baseEntry;
  }

  const followers = getPerimeterFollowers(baseEntry);
  const isFollowing = followers.some((follower) => follower.email === key);

  if (action === FOLLOWER_ACTION_REMOVE) {
    if (!isFollowing) {
      return baseEntry;
    }
    const remaining = followers.filter((follower) => follower.email !== key);
    if (remaining.length === 0) {
      const { followers: _discarded, ...rest } = baseEntry;
      return rest;
    }
    return { ...baseEntry, followers: remaining };
  }

  if (isFollowing) {
    return baseEntry;
  }

  return {
    ...baseEntry,
    followers: [...followers, { email: key, addedByEmail: normalizeEmail(actorEmail), addedAt: now }]
  };
};

const getTeamEntryFromAnswers = (answers, teamId) => {
  const comments = answers?.[COMPLIANCE_COMMENTS_ANSWER_KEY];
  const entry = comments?.teams?.[teamId];
  return entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
};

// Les suiveurs encore contacts de l'équipe, sous la forme du contact déclaré (casse d'origine).
// Quelqu'un retiré de l'équipe cesse simplement d'être notifié : on ne lui écrit plus au nom
// d'une équipe dont il ne fait plus partie.
export const resolveTeamFollowerContacts = (team, answers = {}) => {
  if (!team?.id) {
    return [];
  }
  const followers = getPerimeterFollowers(getTeamEntryFromAnswers(answers, team.id));
  if (followers.length === 0) {
    return [];
  }
  const followerEmails = new Set(followers.map((follower) => follower.email));
  return normalizeTeamContacts(team).filter((contact) => followerEmails.has(normalizeEmail(contact)));
};

export const withTeamFollowers = (recipients, team, answers = {}) => {
  const list = Array.isArray(recipients) ? recipients : [];
  const known = new Set(list.map((recipient) => normalizeEmail(recipient)));
  const additions = resolveTeamFollowerContacts(team, answers)
    .filter((contact) => !known.has(normalizeEmail(contact)));
  return additions.length > 0 ? [...list, ...additions] : list;
};

// L'éditeur de commentaires de la synthèse repart d'un brouillon qui peut dater d'avant un ajout :
// les suiveurs ne s'y éditent pas, c'est donc toujours l'état déjà enregistré qui fait autorité.
export const preservePerimeterFollowers = (nextComments, previousComments) => {
  const nextTeams = nextComments?.teams;
  if (!nextTeams || typeof nextTeams !== 'object' || Array.isArray(nextTeams)) {
    return nextComments;
  }
  const previousTeams = previousComments?.teams && typeof previousComments.teams === 'object'
    ? previousComments.teams
    : {};

  let changed = false;
  const patchedTeams = { ...nextTeams };
  Object.entries(nextTeams).forEach(([teamId, entry]) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return;
    }
    const previousFollowers = getPerimeterFollowers(previousTeams[teamId]);
    const currentFollowers = getPerimeterFollowers(entry);
    if (JSON.stringify(previousFollowers) === JSON.stringify(currentFollowers)) {
      return;
    }
    changed = true;
    if (previousFollowers.length === 0) {
      const { followers: _discarded, ...rest } = entry;
      patchedTeams[teamId] = rest;
    } else {
      patchedTeams[teamId] = { ...entry, followers: previousFollowers };
    }
  });

  return changed ? { ...nextComments, teams: patchedTeams } : nextComments;
};
