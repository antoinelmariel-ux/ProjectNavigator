import { normalizeEmail } from './normalizeEmail.js';

// « Voir en tant que » : un administrateur ouvre l'application dans un second onglet avec
// ?viewAs=<email> pour vérifier ce que voit réellement une autre personne (onglets du
// back-office, projets visibles, questionnaire adapté à son périmètre d'activité).
//
// Ce n'est PAS une frontière de sécurité et n'a pas besoin de l'être : les appels REST
// partent toujours avec les cookies de la vraie session SharePoint, donc la simulation
// change ce que l'interface calcule, jamais ce que le serveur accepte de renvoyer. Le
// contrôle « la session réelle est-elle administratrice ? » (voir main.jsx) évite seulement
// qu'un lien copié laisse croire à un non-administrateur qu'il a changé d'identité.
//
// Tant qu'une simulation est active, toute écriture est neutralisée : REST SharePoint
// (spRestClient.js), état local (storage.js), providers mock (mockProviderPersistence.js) et
// préférence de langue (i18n/languageStorage.js). Sans cela l'onglet de simulation écraserait
// l'état réel de l'administrateur, qui partage le même localStorage, et déclencherait de
// vrais envois de mails via la file de notifications.

export const IMPERSONATION_PARAM = 'viewAs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let simulatedUser = null;

export const readImpersonationRequest = (search) => {
  if (typeof search !== 'string' || !search) {
    return '';
  }

  const query = search.startsWith('?') ? search.slice(1) : search;
  const email = normalizeEmail(new URLSearchParams(query).get(IMPERSONATION_PARAM) || '');
  return EMAIL_PATTERN.test(email) ? email : '';
};

export const buildImpersonationUrl = (email, href) => {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized) || typeof href !== 'string' || !href) {
    return '';
  }

  const url = new URL(href);
  url.searchParams.set(IMPERSONATION_PARAM, normalized);
  return url.toString();
};

export const buildExitUrl = (href) => {
  if (typeof href !== 'string' || !href) {
    return '';
  }

  const url = new URL(href);
  url.searchParams.delete(IMPERSONATION_PARAM);
  return url.toString();
};

export const startImpersonation = ({ email, displayName = '' } = {}) => {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    return false;
  }

  simulatedUser = {
    displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : normalized,
    mail: normalized,
    userPrincipalName: normalized,
    id: '',
    isSiteAdmin: false,
    isSimulated: true
  };
  return true;
};

export const stopImpersonation = () => {
  simulatedUser = null;
};

export const getSimulatedUser = () => simulatedUser;

export const isImpersonating = () => simulatedUser !== null;
