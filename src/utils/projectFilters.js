import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';

export const DEFAULT_ALL_VALUES_LABEL = { fr: 'Toutes les valeurs', en: 'All values', de: 'Alle Werte', es: 'Todos los valores' };
export const DEFAULT_ALL_TEAMS_LABEL = { fr: 'Toutes les équipes', en: 'All teams', de: 'Alle Teams', es: 'Todos los equipos' };
const CUSTOM_FILTER_FALLBACK_LABEL = { fr: 'Filtre personnalisé', en: 'Custom filter', de: 'Benutzerdefinierter Filter', es: 'Filtro personalizado' };

const DEFAULT_FIELDS = [
  {
    id: 'teamLeadTeam',
    label: { fr: 'Équipe du lead projet', en: 'Project lead team', de: 'Team der Projektleitung', es: 'Equipo del líder del proyecto' },
    type: 'select',
    enabled: true,
    sourceQuestionId: 'teamLeadTeam',
    emptyOptionLabel: DEFAULT_ALL_TEAMS_LABEL
  },
  {
    id: 'dateOrder',
    label: { fr: 'Ordre des projets', en: 'Project order', de: 'Reihenfolge der Projekte', es: 'Orden de los proyectos' },
    type: 'sort',
    enabled: true,
    defaultValue: 'desc'
  }
];

const DEFAULT_SORT_VALUE = 'desc';

const DEFAULT_FIELD_MAP = new Map(DEFAULT_FIELDS.map((field) => [field.id, field]));

// 'projectName' et 'teamLead' faisaient doublon avec la recherche générale de l'accueil et ont été
// retirés des filtres par défaut ; cette fonction nettoie les configurations déjà enregistrées par
// un administrateur pour qu'elles ne réapparaissent pas depuis un ancien état persisté.
const RETIRED_FIELD_IDS = new Set(['projectName', 'teamLead']);

export const stripRetiredProjectFilterFields = (config) => {
  if (!config || typeof config !== 'object' || !Array.isArray(config.fields)) {
    return config;
  }

  return {
    ...config,
    fields: config.fields.filter((field) => !RETIRED_FIELD_IDS.has(field?.id))
  };
};

const sanitizeIdentifier = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

export const createDefaultProjectFiltersConfig = () => ({
  fields: DEFAULT_FIELDS.map((field) => ({ ...field })),
  sortOrder: DEFAULT_SORT_VALUE
});

// Comme pour les questions du questionnaire projet (src/data/questions.js) et les filtres
// d'inspiration (inspirationConfig.js), un libellé peut être soit une simple chaîne héritée
// (contenu historique, toujours en français), soit un objet {en, fr, de, es} — résolu à
// l'affichage via resolveLocalizedText / édité via getLocalizedRaw + setLocalizedText.
const sanitizeLocalizedValue = (value, fallback) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (value && typeof value === 'object') {
    const sanitized = {};
    SUPPORTED_LANGUAGES.forEach((code) => {
      const entry = value[code];
      if (typeof entry === 'string' && entry.trim().length > 0) {
        sanitized[code] = entry.trim();
      }
    });

    if (Object.keys(sanitized).length > 0) {
      return sanitized;
    }
  }

  return fallback;
};

// Avant la traduction de ces filtres, les libellés étaient de simples chaînes françaises
// persistées telles quelles (référentiel delta-only, voir referentialStore.js). Une config déjà
// enregistrée les garde inchangées : resolveLocalizedText afficherait alors ce texte quelle que
// soit la langue choisie. Si la chaîne persistée correspond au texte français par défaut, on la
// remplace par l'objet {en, fr, de, es} à jour ; sinon (texte réellement personnalisé par un
// administrateur) on la convertit en {fr: ...} pour rester cohérent avec resolveLocalizedText
// plutôt que de l'afficher indéfiniment en français.
const upgradeLegacyLocalizedValue = (rawValue, fallbackValue) => {
  if (typeof rawValue !== 'string') {
    return rawValue;
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return rawValue;
  }

  if (fallbackValue && typeof fallbackValue === 'object' && fallbackValue.fr === trimmed) {
    return fallbackValue;
  }

  return { fr: trimmed };
};

const sanitizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

const sanitizeSortValue = (value, fallback = DEFAULT_SORT_VALUE) => {
  return value === 'asc' || value === 'desc' ? value : fallback;
};

const sanitizeEmptyOptionLabel = (value, fallback) =>
  sanitizeLocalizedValue(upgradeLegacyLocalizedValue(value, fallback), fallback);

const sanitizeOptionsList = (options) => {
  if (!Array.isArray(options)) {
    return undefined;
  }

  const sanitized = Array.from(
    new Set(
      options
        .map((option) => (typeof option === 'string' ? option.trim() : ''))
        .filter((option) => option.length > 0)
    )
  );

  return sanitized.length > 0 ? sanitized : undefined;
};

export const normalizeProjectFilterConfig = (config) => {
  const base = createDefaultProjectFiltersConfig();

  if (!config || typeof config !== 'object') {
    return base;
  }

  const normalizedFields = [];
  const seenIds = new Set();

  if (Array.isArray(config.fields)) {
    config.fields.forEach((field) => {
      if (!field || typeof field !== 'object') {
        return;
      }

      const rawId = sanitizeIdentifier(field.id);
      if (rawId.length === 0 || seenIds.has(rawId)) {
        return;
      }

      const defaultField = DEFAULT_FIELD_MAP.get(rawId);

      if (defaultField) {
        const normalizedField = {
          ...defaultField,
          label: sanitizeLocalizedValue(upgradeLegacyLocalizedValue(field.label, defaultField.label), defaultField.label),
          enabled: sanitizeBoolean(field.enabled, defaultField.enabled)
        };

        if (defaultField.type === 'sort') {
          normalizedField.defaultValue = sanitizeSortValue(
            field.defaultValue,
            defaultField.defaultValue || DEFAULT_SORT_VALUE
          );
        }

        if (defaultField.sourceQuestionId) {
          normalizedField.sourceQuestionId = sanitizeIdentifier(field.sourceQuestionId) || defaultField.sourceQuestionId;
        }

        if (defaultField.type === 'select') {
          normalizedField.emptyOptionLabel = sanitizeEmptyOptionLabel(
            field.emptyOptionLabel,
            defaultField.emptyOptionLabel || DEFAULT_ALL_VALUES_LABEL
          );
          const presetOptions = sanitizeOptionsList(field.options);
          if (presetOptions) {
            normalizedField.options = presetOptions;
          }
        }

        normalizedFields.push(normalizedField);
        seenIds.add(rawId);
        return;
      }

      const normalizedType = field.type === 'select' ? 'select' : 'text';
      const sourceQuestionId = sanitizeIdentifier(field.sourceQuestionId) || rawId;
      const normalizedField = {
        id: rawId,
        label: sanitizeLocalizedValue(upgradeLegacyLocalizedValue(field.label, CUSTOM_FILTER_FALLBACK_LABEL), CUSTOM_FILTER_FALLBACK_LABEL),
        type: normalizedType,
        enabled: sanitizeBoolean(field.enabled, true)
      };

      if (normalizedType === 'select') {
        normalizedField.emptyOptionLabel = sanitizeEmptyOptionLabel(
          field.emptyOptionLabel,
          DEFAULT_ALL_VALUES_LABEL
        );
        const presetOptions = sanitizeOptionsList(field.options);
        if (presetOptions) {
          normalizedField.options = presetOptions;
        }
      }

      if (sourceQuestionId) {
        normalizedField.sourceQuestionId = sourceQuestionId;
      }

      normalizedFields.push(normalizedField);
      seenIds.add(rawId);
    });
  }

  if (normalizedFields.length === 0) {
    return {
      fields: [],
      sortOrder: sanitizeSortValue(config.sortOrder, DEFAULT_SORT_VALUE)
    };
  }

  const sortField = normalizedFields.find((field) => field && field.type === 'sort');
  const sortOrder = sanitizeSortValue(config.sortOrder, DEFAULT_SORT_VALUE);

  if (sortField && sortField.type === 'sort') {
    sortField.defaultValue = sanitizeSortValue(
      sortField.defaultValue,
      DEFAULT_FIELD_MAP.get(sortField.id)?.defaultValue || DEFAULT_SORT_VALUE
    );
  }

  return {
    fields: normalizedFields,
    sortOrder
  };
};

export const updateProjectFilterField = (config, fieldId, updates = {}) => {
  const normalized = normalizeProjectFilterConfig(config);
  const fields = normalized.fields.map((field) => {
    if (field.id !== fieldId) {
      return field;
    }

    const patch = { ...field };

    if (Object.prototype.hasOwnProperty.call(updates, 'label')) {
      patch.label = sanitizeLocalizedValue(updates.label, field.label);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'enabled')) {
      patch.enabled = sanitizeBoolean(updates.enabled, field.enabled);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'type')) {
      const normalizedType = updates.type === 'select' ? 'select' : updates.type === 'sort' ? 'sort' : 'text';
      patch.type = normalizedType;

      if (normalizedType === 'sort') {
        patch.defaultValue = sanitizeSortValue(updates.defaultValue, field.defaultValue || DEFAULT_SORT_VALUE);
      } else if (normalizedType === 'select') {
        patch.emptyOptionLabel = sanitizeLocalizedValue(
          updates.emptyOptionLabel,
          field.emptyOptionLabel || DEFAULT_ALL_VALUES_LABEL
        );
        const presetOptions = sanitizeOptionsList(updates.options);
        if (presetOptions) {
          patch.options = presetOptions;
        } else {
          delete patch.options;
        }
      } else {
        delete patch.emptyOptionLabel;
        delete patch.options;
      }
    }

    if (field.type === 'sort' && Object.prototype.hasOwnProperty.call(updates, 'defaultValue')) {
      patch.defaultValue = sanitizeSortValue(updates.defaultValue, field.defaultValue);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'emptyOptionLabel') && field.type === 'select') {
      patch.emptyOptionLabel = sanitizeLocalizedValue(
        updates.emptyOptionLabel,
        field.emptyOptionLabel || DEFAULT_ALL_VALUES_LABEL
      );
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'options') && field.type === 'select') {
      const presetOptions = sanitizeOptionsList(updates.options);
      if (presetOptions) {
        patch.options = presetOptions;
      } else {
        delete patch.options;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'sourceQuestionId')) {
      const sanitizedSource = sanitizeIdentifier(updates.sourceQuestionId);
      if (sanitizedSource) {
        patch.sourceQuestionId = sanitizedSource;
      } else {
        delete patch.sourceQuestionId;
      }
    }

    return patch;
  });

  return {
    ...normalized,
    fields
  };
};

export const resetProjectFiltersConfig = () => createDefaultProjectFiltersConfig();
