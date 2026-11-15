import { isSharePointMode, sharepointConfig } from '../config/sharepointConfig.js';
import { isImpersonating } from './impersonation.js';
import { normalizeEmail } from './normalizeEmail.js';
import { normalizeProjectSearchConfig } from './projectSearch.js';
import { buildQuery, odataQuote, spGet, spMerge } from './spRestClient.js';

// Configuration personnelle de la recherche de projets (colonnes, graphiques). En mode SharePoint,
// elle vit dans la colonne `ProjectSearchConfigJson` de CN_UserProfiles, pour suivre la personne
// d'un poste à l'autre. Cette colonne est lue et écrite *à part* du reste du profil
// (userProfileProvider.js ne la connaît pas) : sur un site où elle n'a pas encore été créée,
// SharePoint refuse toute requête qui la nomme, et l'ajouter au schéma commun aurait cassé le
// chargement des profils — onboarding compris. Sans la colonne, sans ligne de profil, ou hors
// SharePoint, la configuration reste dans ce navigateur.

export const PROJECT_SEARCH_CONFIG_COLUMN = 'ProjectSearchConfigJson';
const LOCAL_STORAGE_KEY = 'complianceNavigatorProjectSearchConfig';

const getLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readLocalMap = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return {};
  }
  try {
    const parsed = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const loadLocalProjectSearchConfig = (email) => normalizeProjectSearchConfig(readLocalMap()[normalizeEmail(email)]);

export const saveLocalProjectSearchConfig = (email, config) => {
  if (isImpersonating()) {
    return;
  }
  const storage = getLocalStorage();
  const key = normalizeEmail(email);
  if (!storage || !key) {
    return;
  }
  const map = readLocalMap();
  if (config) {
    map[key] = config;
  } else {
    delete map[key];
  }
  try {
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota ou stockage indisponible : la configuration vaut pour la session en cours.
  }
};

const itemsPath = () => `/_api/web/lists/getbytitle('${odataQuote(sharepointConfig.lists.userProfiles)}')/items`;

const parseStoredConfig = (value) => {
  if (!value) {
    return null;
  }
  try {
    return normalizeProjectSearchConfig(typeof value === 'string' ? JSON.parse(value) : value);
  } catch {
    return null;
  }
};

// Un 400 sur une requête qui nomme la colonne : elle n'existe pas (encore) sur ce site.
const isMissingColumnError = (error) => error?.name === 'SharePointError' && Number(error.status) === 400;

export const createSharePointProjectSearchConfigStore = () => {
  let columnAvailable = true;

  const findRow = async (email) => {
    const payload = await spGet(`${itemsPath()}${buildQuery({
      select: `Id,UserEmail,${PROJECT_SEARCH_CONFIG_COLUMN}`,
      filter: `UserEmail eq '${odataQuote(email)}'`,
      top: 1
    })}`, { metadata: 'minimal' });
    const row = payload && Array.isArray(payload.value) ? payload.value[0] : null;
    return row ? { row, etag: row['odata.etag'] || '*' } : null;
  };

  return {
    isColumnAvailable: () => columnAvailable,

    async load(email) {
      const key = normalizeEmail(email);
      if (!key) {
        return { config: null, storage: 'local' };
      }
      try {
        const found = await findRow(key);
        if (!found) {
          return { config: loadLocalProjectSearchConfig(key), storage: 'local' };
        }
        const config = parseStoredConfig(found.row[PROJECT_SEARCH_CONFIG_COLUMN]);
        return { config: config || loadLocalProjectSearchConfig(key), storage: 'profile' };
      } catch (error) {
        if (isMissingColumnError(error)) {
          columnAvailable = false;
          return { config: loadLocalProjectSearchConfig(key), storage: 'local', reason: 'missingColumn' };
        }
        return { config: loadLocalProjectSearchConfig(key), storage: 'local', reason: 'error' };
      }
    },

    // Réessayé par la file (retryQueue) en cas de panne réseau ; une colonne absente ou un profil
    // inexistant ne sont pas des pannes : la configuration est alors gardée dans le navigateur.
    // Aucune ligne de profil n'est créée ici : un profil sans « onboarding terminé » rouvrirait
    // l'écran d'accueil de la première connexion.
    async save(email, config) {
      const key = normalizeEmail(email);
      saveLocalProjectSearchConfig(key, config);
      if (!key || !columnAvailable) {
        return { storage: 'local' };
      }
      try {
        const found = await findRow(key);
        if (!found) {
          return { storage: 'local' };
        }
        await spMerge(`${itemsPath()}(${Number(found.row.Id)})`, {
          [PROJECT_SEARCH_CONFIG_COLUMN]: config ? JSON.stringify(config) : '',
          UpdatedAt: new Date().toISOString()
        }, { etag: found.etag });
        return { storage: 'profile' };
      } catch (error) {
        if (isMissingColumnError(error)) {
          columnAvailable = false;
          return { storage: 'local', reason: 'missingColumn' };
        }
        throw error;
      }
    }
  };
};

const createLocalProjectSearchConfigStore = () => ({
  isColumnAvailable: () => false,
  async load(email) {
    return { config: loadLocalProjectSearchConfig(email), storage: 'local' };
  },
  async save(email, config) {
    saveLocalProjectSearchConfig(email, config);
    return { storage: 'local' };
  }
});

export const projectSearchConfigStore = isSharePointMode()
  ? createSharePointProjectSearchConfigStore()
  : createLocalProjectSearchConfigStore();
