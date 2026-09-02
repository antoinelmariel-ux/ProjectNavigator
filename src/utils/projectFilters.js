const DEFAULT_FIELDS = [
  {
    id: 'teamLeadTeam',
    label: 'Équipe du lead projet',
    type: 'select',
    enabled: true,
    sourceQuestionId: 'teamLeadTeam',
    emptyOptionLabel: 'Toutes les équipes'
  },
  {
    id: 'dateOrder',
    label: 'Ordre des projets',
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

const sanitizeLabel = (label, fallback) => {
  if (typeof label !== 'string') {
    return fallback;
  }

  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
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

const sanitizeEmptyOptionLabel = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

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
          label: sanitizeLabel(field.label, defaultField.label),
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
            defaultField.emptyOptionLabel || 'Toutes les valeurs'
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
        label: sanitizeLabel(field.label, 'Filtre personnalisé'),
        type: normalizedType,
        enabled: sanitizeBoolean(field.enabled, true)
      };

      if (normalizedType === 'select') {
        normalizedField.emptyOptionLabel = sanitizeEmptyOptionLabel(
          field.emptyOptionLabel,
          'Toutes les valeurs'
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
      patch.label = sanitizeLabel(updates.label, field.label);
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
        patch.emptyOptionLabel = sanitizeEmptyOptionLabel(
          updates.emptyOptionLabel,
          field.emptyOptionLabel || 'Toutes les valeurs'
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
      patch.emptyOptionLabel = sanitizeEmptyOptionLabel(
        updates.emptyOptionLabel,
        field.emptyOptionLabel || 'Toutes les valeurs'
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
