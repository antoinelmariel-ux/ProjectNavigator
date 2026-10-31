import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';
import { buildOfficeEmbedSrc } from './documentEmbed.js';

// Manuels de la fenêtre d'aide : deux emplacements fixes, un lien SharePoint par langue chacun.
// Le lien est collé tel quel dans le back-office (settings.json) ; tout le reste est dérivé ici.
export const HELP_MANUAL_IDS = ['projectManager', 'sme'];

const FALLBACK_LANGUAGE = 'fr';

export const createEmptyHelpManuals = () =>
  Object.fromEntries(
    HELP_MANUAL_IDS.map((id) => [id, Object.fromEntries(SUPPORTED_LANGUAGES.map((code) => [code, '']))])
  );

export const normalizeHelpManuals = (value) => {
  const normalized = createEmptyHelpManuals();
  if (!value || typeof value !== 'object') {
    return normalized;
  }
  HELP_MANUAL_IDS.forEach((id) => {
    const links = value[id];
    if (!links || typeof links !== 'object') {
      return;
    }
    SUPPORTED_LANGUAGES.forEach((code) => {
      if (typeof links[code] === 'string') {
        normalized[id][code] = links[code].trim();
      }
    });
  });
  return normalized;
};

// Accepte l'adresse du fichier, un lien de partage, ou le code « Incorporer » d'Office
// (`<iframe src="…">`) dont on ne garde que le src. Seul https est retenu : un lien saisi à la
// main ne doit jamais pouvoir devenir un `javascript:` ou un `data:` dans l'iframe.
export const normalizeHelpManualLink = (raw) => {
  if (typeof raw !== 'string') {
    return '';
  }
  let candidate = raw.trim();
  const iframeSrc = candidate.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  if (iframeSrc) {
    candidate = iframeSrc[1].replace(/&amp;/g, '&').trim();
  }
  return /^https:\/\/[^\s]+$/i.test(candidate) ? candidate : '';
};

// Langue demandée, sinon français, sinon n'importe quelle langue renseignée : même règle que la FAQ.
export const resolveHelpManualUrl = (manuals, manualId, language) => {
  const links = normalizeHelpManuals(manuals)[manualId];
  if (!links) {
    return '';
  }
  const order = [language, FALLBACK_LANGUAGE, ...SUPPORTED_LANGUAGES];
  for (const code of order) {
    const link = normalizeHelpManualLink(links[code]);
    if (link) {
      return link;
    }
  }
  return '';
};

// Le manuel SME n'est destiné qu'aux experts (contact d'équipe ou membre de comité) ; celui du
// chef de projet est ouvert à tous. Un manuel sans aucun lien valide n'apparaît pas.
export const getVisibleHelpManuals = (manuals, language, { isExpert = false } = {}) =>
  HELP_MANUAL_IDS
    .filter((id) => id !== 'sme' || isExpert)
    .map((id) => ({ id, url: resolveHelpManualUrl(manuals, id, language) }))
    .filter((manual) => manual.url !== '');

const getPathname = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
};

// Lien de partage SharePoint/OneDrive : /:p:/s/site/Identifiant?e=… (le chemin du fichier n'y figure pas).
const isSharingLink = (url) => /^\/:[a-z]:\//i.test(getPathname(url));

const withQueryParam = (url, name, value) => {
  const [base, hash = ''] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${name}=${value}${hash ? `#${hash}` : ''}`;
};

// Aperçu en lecture seule : `embedview` est le mode d'intégration d'Office en ligne, sans barre
// d'édition ni bouton de téléchargement ; le lecteur PDF du navigateur reçoit `toolbar=0`.
// Renvoie '' quand rien ne peut être intégré proprement (mode local, hôte étranger).
export const buildHelpManualViewerSrc = (url, context = {}) => {
  const link = normalizeHelpManualLink(url);
  if (!link) {
    return '';
  }
  if (getPathname(link).toLowerCase().endsWith('.pdf')) {
    return link.includes('#') ? link : `${link}#toolbar=0&navpanes=0`;
  }
  if (/\/_layouts\/15\/(embed|Doc)\.aspx/i.test(link)) {
    return link;
  }
  if (isSharingLink(link)) {
    return /[?&]action=/.test(link) ? link : withQueryParam(link, 'action', 'embedview');
  }
  return buildOfficeEmbedSrc(link, context);
};
