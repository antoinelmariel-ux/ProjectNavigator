const APP_FOLDER_SEGMENT = '/CN-App/';
const SITE_PATH_PATTERN = /^(\/(?:sites|teams)\/[^/]+)/i;

export const sharepointConfig = {
  lists: {
    projects: 'CN_Projects',
    inspirations: 'CN_Inspirations',
    complianceComments: 'CN_ComplianceComments',
    projectDiscussions: 'CN_ProjectDiscussions',
    projectMembers: 'CN_ProjectMembers',
    backofficeChanges: 'CN_BackofficeChanges',
    showcaseStickyNotes: 'CN_ShowcaseStickyNotes',
    filesIndex: 'CN_FilesIndex',
    notificationsQueue: 'CN_NotificationsQueue',
    userProfiles: 'CN_UserProfiles'
  },
  libraries: {
    app: 'CN-App',
    config: 'CN-Config',
    documents: 'CN-Documents'
  }
};

const stripTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

// `_api` n’est exposé qu’à la racine du web SharePoint : depuis /sites/X/CN-App/index.aspx
// il faut remonter à /sites/X, sinon toutes les requêtes tombent en 404.
const deriveWebUrl = (origin, pathname) => {
  const appIndex = pathname.indexOf(APP_FOLDER_SEGMENT);
  if (appIndex !== -1) {
    return origin + pathname.slice(0, appIndex);
  }
  const sitePath = pathname.match(SITE_PATH_PATTERN);
  return sitePath ? origin + sitePath[1] : origin;
};

export const getWebUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  if (typeof window.__CN_WEB_URL__ === 'string' && window.__CN_WEB_URL__) {
    return stripTrailingSlashes(window.__CN_WEB_URL__);
  }
  const location = window.location;
  if (!location || !location.origin) {
    return '';
  }
  return stripTrailingSlashes(deriveWebUrl(location.origin, location.pathname || ''));
};

export const getSiteRelativeUrl = () => {
  const webUrl = getWebUrl();
  if (!webUrl) {
    return '';
  }
  const withoutProtocol = webUrl.replace(/^https?:\/\/[^/]+/i, '');
  return withoutProtocol || '/';
};

export const getLibraryServerRelativeUrl = (libraryKey) => {
  const libraryName = sharepointConfig.libraries[libraryKey];
  if (!libraryName) {
    throw new Error(`Bibliothèque inconnue : ${libraryKey}`);
  }
  const sitePath = getSiteRelativeUrl();
  return `${sitePath === '/' ? '' : sitePath}/${libraryName}`;
};

export const isSharePointMode = () => {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  const { protocol, hostname } = window.location;
  return protocol === 'https:' && /\.sharepoint\.com$/i.test(hostname || '');
};
