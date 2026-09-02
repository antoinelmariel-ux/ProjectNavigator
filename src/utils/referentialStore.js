import {
  getLibraryServerRelativeUrl,
  sharepointConfig
} from '../config/sharepointConfig.js';
import { SharePointError } from './errors.js';
import { odataQuote, spGet, spGetAll, spGetWithEtag, spPost, spPut } from './spRestClient.js';

const SETTINGS_KEYS = [
  'adminEmails',
  'onboardingTourConfig',
  'validationCommitteeConfig',
  'inspirationFormFields',
  'projectFilters',
  'inspirationFilters'
];

export const REFERENTIAL_FILES = {
  questions: { file: 'questions.json', label: 'Questions' },
  rules: { file: 'rules.json', label: 'Règles' },
  riskLevelRules: { file: 'risk-level-rules.json', label: 'Niveaux de risque' },
  riskWeights: { file: 'risk-weighting.json', label: 'Pondérations de risque' },
  teams: { file: 'teams.json', label: 'Équipes' },
  showcaseThemes: { file: 'showcase-themes.json', label: 'Thèmes de vitrine' },
  settings: { file: 'settings.json', label: 'Réglages généraux', keys: SETTINGS_KEYS }
};

const JSON_CONTENT_TYPE = 'application/json;charset=utf-8';

const etags = new Map();

export const resetReferentialStore = () => {
  etags.clear();
};

const configFolderPath = () => getLibraryServerRelativeUrl('config');

const folderApi = () =>
  `/_api/web/GetFolderByServerRelativeUrl('${odataQuote(configFolderPath())}')`;

const fileApi = (fileName) =>
  `/_api/web/GetFileByServerRelativeUrl('${odataQuote(`${configFolderPath()}/${fileName}`)}')`;

const readEtag = async (fileName) => {
  const meta = await spGet(fileApi(fileName), { metadata: 'minimal' });
  return (meta && meta['odata.etag']) || null;
};

export const readReferentialFile = async (fileName) => {
  try {
    const result = await spGetWithEtag(`${fileApi(fileName)}/$value`, { raw: true });
    const etag = result.etag || (await readEtag(fileName));
    let data;
    try {
      data = JSON.parse(result.data);
    } catch {
      throw new SharePointError(`Le fichier ${fileName} de CN-Config n’est pas un JSON valide.`, 422);
    }
    return { data, etag, missing: false };
  } catch (error) {
    if (error && error.status === 404) {
      return { data: null, etag: null, missing: true };
    }
    throw error;
  }
};

export const writeReferentialFile = async (fileName, data, etag) => {
  const body = JSON.stringify(data, null, 2);

  if (etag) {
    await spPut(`${fileApi(fileName)}/$value`, body, { etag, contentType: JSON_CONTENT_TYPE });
  } else {
    await spPost(`${folderApi()}/Files/add(url='${odataQuote(fileName)}',overwrite=true)`, undefined, {
      rawBody: body,
      contentType: JSON_CONTENT_TYPE
    });
  }

  return readEtag(fileName);
};

// Regroupe l’état applicatif en un fichier par référentiel (les petits réglages partagent
// settings.json, pour éviter sept allers-retours supplémentaires au démarrage).
export const buildReferentialPayload = (state = {}) => {
  const payload = {};

  Object.entries(REFERENTIAL_FILES).forEach(([key, definition]) => {
    if (definition.keys) {
      const bucket = {};
      definition.keys.forEach((name) => {
        if (state[name] !== undefined) {
          bucket[name] = state[name];
        }
      });
      payload[key] = bucket;
      return;
    }
    if (state[key] !== undefined) {
      payload[key] = state[key];
    }
  });

  return payload;
};

export const flattenReferentials = (loaded = {}) => {
  const slices = {};

  Object.entries(REFERENTIAL_FILES).forEach(([key, definition]) => {
    const value = loaded[key];
    if (value === undefined || value === null) {
      return;
    }
    if (definition.keys) {
      Object.assign(slices, value);
      return;
    }
    slices[key] = value;
  });

  return slices;
};

export const describeSize = (value) => {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).length;
  }
  return 0;
};

// Un fichier illisible ne doit pas empêcher le démarrage : on remonte l’incident et
// l’appelant retombe sur les défauts embarqués pour la tranche concernée.
export const loadReferentials = async () => {
  const entries = Object.entries(REFERENTIAL_FILES);
  const outcomes = await Promise.all(
    entries.map(async ([key, definition]) => {
      try {
        const file = await readReferentialFile(definition.file);
        return { key, definition, file };
      } catch (error) {
        return { key, definition, error };
      }
    })
  );

  const data = {};
  const missing = [];
  const errors = [];

  outcomes.forEach(({ key, definition, file, error }) => {
    if (error) {
      errors.push({ key, file: definition.file, message: error.message });
      return;
    }
    if (file.missing) {
      missing.push(definition.file);
      return;
    }
    etags.set(key, file.etag);
    data[key] = file.data;
  });

  return { data, slices: flattenReferentials(data), missing, errors };
};

export const saveReferential = async (key, value) => {
  const definition = REFERENTIAL_FILES[key];
  if (!definition) {
    throw new Error(`Référentiel inconnu : ${key}`);
  }
  const nextEtag = await writeReferentialFile(definition.file, value, etags.get(key) || null);
  etags.set(key, nextEtag);
  return { key, file: definition.file, etag: nextEtag };
};

export const publishAllReferentials = async (state) => {
  const payload = buildReferentialPayload(state);
  const results = [];

  for (const [key, definition] of Object.entries(REFERENTIAL_FILES)) {
    const value = payload[key];
    if (value === undefined) {
      results.push({ key, file: definition.file, label: definition.label, status: 'skipped' });
      continue;
    }
    try {
      await saveReferential(key, value);
      results.push({
        key,
        file: definition.file,
        label: definition.label,
        status: 'published',
        count: describeSize(value)
      });
    } catch (error) {
      results.push({
        key,
        file: definition.file,
        label: definition.label,
        status: error && error.name === 'ConflictError' ? 'conflict' : 'error',
        message: error && error.message
      });
    }
  }

  return results;
};

const listConfigFileNames = async () => {
  try {
    const payload = await spGet(`${folderApi()}/Files?$select=Name`);
    return new Set(((payload && payload.value) || []).map((entry) => entry.Name));
  } catch {
    return null;
  }
};

export const diagnoseInstallation = async () => {
  const rows = await spGetAll('/_api/web/lists?$select=Title&$top=500');
  const titles = new Set(rows.map((row) => row.Title));

  const lists = Object.values(sharepointConfig.lists).map((name) => ({
    name,
    present: titles.has(name)
  }));
  const libraries = Object.values(sharepointConfig.libraries).map((name) => ({
    name,
    present: titles.has(name)
  }));

  const fileNames = await listConfigFileNames();
  const files = Object.values(REFERENTIAL_FILES).map((definition) => ({
    name: definition.file,
    label: definition.label,
    present: fileNames ? fileNames.has(definition.file) : false
  }));

  const missing = [...lists, ...libraries].filter((entry) => !entry.present).map((entry) => entry.name);

  return { lists, libraries, files, missing, ok: missing.length === 0 };
};
