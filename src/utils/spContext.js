import { isSharePointMode } from '../config/sharepointConfig.js';
import { spGet } from './spRestClient.js';

const ANONYMOUS_USER = { displayName: '', mail: '', userPrincipalName: '', id: '', isSiteAdmin: false };

let currentUser = null;

export const resetSharePointContext = () => {
  currentUser = null;
};

// SP.User.Email est vide sur certaines configurations de tenant ; le LoginName a la forme
// « i:0#.f|membership|prenom.nom@lfb.fr ».
export const emailFromLoginName = (loginName) => {
  if (typeof loginName !== 'string' || !loginName) {
    return '';
  }
  const candidate = loginName.split('|').pop().trim();
  return candidate.includes('@') ? candidate.toLowerCase() : '';
};

// SP.User ne fournit ni givenName ni surname : App.jsx retombe déjà sur displayName.
export const toAppUser = (spUser) => {
  const source = spUser || {};
  const email = String(source.Email || '').trim().toLowerCase() || emailFromLoginName(source.LoginName);
  return {
    displayName: String(source.Title || '').trim() || email,
    mail: email,
    userPrincipalName: email,
    id: source.Id === null || source.Id === undefined ? '' : String(source.Id),
    isSiteAdmin: Boolean(source.IsSiteAdmin)
  };
};

export const fetchCurrentUser = async () => {
  const payload = await spGet('/_api/web/currentUser?$select=Id,Title,Email,LoginName,IsSiteAdmin');
  return toAppUser(payload && payload.d ? payload.d : payload);
};

export const initSharePointContext = async ({ fallbackUser } = {}) => {
  if (!isSharePointMode()) {
    currentUser = fallbackUser || ANONYMOUS_USER;
    return { mode: 'mock', user: currentUser };
  }

  try {
    currentUser = await fetchCurrentUser();
    return { mode: 'sharepoint', user: currentUser };
  } catch (error) {
    // L’app doit rester affichable : on remonte l’erreur pour la bannière de statut.
    currentUser = fallbackUser || ANONYMOUS_USER;
    return { mode: 'sharepoint', user: currentUser, error };
  }
};

export const getCurrentUser = () => currentUser || ANONYMOUS_USER;
