import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';

const TARGET_OPTIONS = [
  { value: 'PS', label: { fr: 'PS', en: 'HCP', de: 'Gesundheitsfachperson', es: 'Profesional sanitario' } },
  { value: 'Patient', label: { fr: 'Patient', en: 'Patient', de: 'Patient', es: 'Paciente' } },
  { value: 'GP', label: { fr: 'GP', en: 'General public', de: 'Allgemeine Öffentlichkeit', es: 'Público general' } }
];

const TYPOLOGY_OPTIONS = [
  { value: 'Digital', label: { fr: 'Digital', en: 'Digital', de: 'Digital', es: 'Digital' } },
  { value: 'Print', label: { fr: 'Print', en: 'Print', de: 'Print', es: 'Print' } }
];

const THERAPEUTIC_AREA_OPTIONS = [
  { value: 'Immunologie', label: { fr: 'Immunologie', en: 'Immunology', de: 'Immunologie', es: 'Inmunología' } },
  { value: 'Hémostase', label: { fr: 'Hémostase', en: 'Hemostasis', de: 'Hämostase', es: 'Hemostasia' } },
  { value: 'Soins intensifs', label: { fr: 'Soins intensifs', en: 'Intensive care', de: 'Intensivpflege', es: 'Cuidados intensivos' } }
];

const COUNTRY_OPTIONS = [
  { value: 'France', label: { fr: 'France', en: 'France', de: 'Frankreich', es: 'Francia' } },
  { value: 'Europe', label: { fr: 'Europe', en: 'Europe', de: 'Europa', es: 'Europa' } },
  { value: 'États-Unis', label: { fr: 'États-Unis', en: 'United States', de: 'Vereinigte Staaten', es: 'Estados Unidos' } },
  { value: 'Autre', label: { fr: 'Autre', en: 'Other', de: 'Andere', es: 'Otro' } }
];

const VISIBILITY_OPTIONS = [
  { value: 'personal', label: { fr: 'Personnel', en: 'Personal', de: 'Persönlich', es: 'Personal' } },
  { value: 'shared', label: { fr: 'Partagé', en: 'Shared', de: 'Geteilt', es: 'Compartido' } }
];

const DEFAULT_INSPIRATION_FILTERS = {
  fields: [
    {
      id: 'labName',
      label: { fr: 'Nom du labo', en: 'Lab name', de: 'Name des Labors', es: 'Nombre del laboratorio' },
      type: 'select',
      enabled: true,
      sourceQuestionId: 'labName'
    },
    {
      id: 'target',
      label: { fr: 'Cible du projet', en: 'Project target', de: 'Zielgruppe des Projekts', es: 'Público objetivo del proyecto' },
      type: 'select',
      enabled: true,
      options: TARGET_OPTIONS,
      sourceQuestionId: 'target'
    },
    {
      id: 'typology',
      label: { fr: 'Typologie', en: 'Typology', de: 'Typologie', es: 'Tipología' },
      type: 'select',
      enabled: true,
      options: TYPOLOGY_OPTIONS,
      sourceQuestionId: 'typology'
    },
    {
      id: 'therapeuticArea',
      label: { fr: 'Aire thérapeutique', en: 'Therapeutic area', de: 'Therapiegebiet', es: 'Área terapéutica' },
      type: 'select',
      enabled: true,
      options: THERAPEUTIC_AREA_OPTIONS,
      sourceQuestionId: 'therapeuticArea'
    },
    {
      id: 'country',
      label: { fr: 'Pays', en: 'Country', de: 'Land', es: 'País' },
      type: 'select',
      enabled: true,
      options: COUNTRY_OPTIONS,
      sourceQuestionId: 'country'
    }
  ]
};

const DEFAULT_INSPIRATION_FORM_FIELDS = {
  fields: [
    {
      id: 'title',
      label: { fr: 'Titre du projet', en: 'Project title', de: 'Projekttitel', es: 'Título del proyecto' },
      type: 'text',
      required: true,
      enabled: true
    },
    {
      id: 'labName',
      label: {
        fr: 'Nom du laboratoire / association',
        en: 'Lab / association name',
        de: 'Name des Labors / der Vereinigung',
        es: 'Nombre del laboratorio / asociación'
      },
      type: 'text',
      required: true,
      enabled: true
    },
    {
      id: 'target',
      label: { fr: 'Cible du projet', en: 'Project target', de: 'Zielgruppe des Projekts', es: 'Público objetivo del proyecto' },
      type: 'select',
      required: true,
      enabled: true,
      options: TARGET_OPTIONS
    },
    {
      id: 'typology',
      label: { fr: 'Typologie', en: 'Typology', de: 'Typologie', es: 'Tipología' },
      type: 'select',
      required: true,
      enabled: true,
      options: TYPOLOGY_OPTIONS
    },
    {
      id: 'therapeuticArea',
      label: { fr: 'Aire thérapeutique', en: 'Therapeutic area', de: 'Therapiegebiet', es: 'Área terapéutica' },
      type: 'select',
      required: true,
      enabled: true,
      options: THERAPEUTIC_AREA_OPTIONS
    },
    {
      id: 'country',
      label: { fr: 'Pays', en: 'Country', de: 'Land', es: 'País' },
      type: 'select',
      required: true,
      enabled: true,
      options: COUNTRY_OPTIONS
    },
    {
      id: 'visibility',
      label: {
        fr: 'Portée de l’inspiration',
        en: 'Scope of the inspiration',
        de: 'Reichweite der Inspiration',
        es: 'Alcance de la inspiración'
      },
      type: 'select',
      required: true,
      enabled: true,
      options: VISIBILITY_OPTIONS
    },
    {
      id: 'description',
      label: { fr: 'Description du projet', en: 'Project description', de: 'Projektbeschreibung', es: 'Descripción del proyecto' },
      type: 'long_text',
      required: false,
      enabled: true
    },
    {
      id: 'link',
      label: { fr: 'Lien utile', en: 'Useful link', de: 'Nützlicher Link', es: 'Enlace útil' },
      type: 'url',
      required: false,
      enabled: true
    },
    {
      id: 'documents',
      label: { fr: 'Documents', en: 'Documents', de: 'Dokumente', es: 'Documentos' },
      type: 'documents',
      required: false,
      enabled: true
    },
    {
      id: 'review',
      label: { fr: 'Avis sur le projet', en: 'Review of the project', de: 'Bewertung des Projekts', es: 'Opinión sobre el proyecto' },
      type: 'long_text',
      required: false,
      enabled: true
    }
  ]
};

const clone = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
};

const sanitizeIdentifier = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

// Comme pour les questions du questionnaire projet (src/data/questions.js), un libellé peut être
// soit une simple chaîne héritée (contenu historique, toujours en français), soit un objet
// {en, fr, de, es} — résolu à l'affichage via resolveLocalizedText / édité via getLocalizedRaw
// + setLocalizedText (src/utils/localizedContent.js). On ne force jamais la conversion ici pour
// ne pas casser les configurations déjà enregistrées (localStorage / SharePoint).
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

const sanitizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

// La valeur stable d'une option (ce qui est réellement enregistré dans le projet et comparé par
// les filtres) reste indépendante de son libellé traduit — même principe que `value`/`label` sur
// les options de questions.js.
const sanitizeOptionValue = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeOption = (option) => {
  if (typeof option === 'string') {
    const trimmed = option.trim();
    return trimmed.length > 0 ? { value: trimmed, label: trimmed } : null;
  }

  if (option && typeof option === 'object') {
    const value = sanitizeOptionValue(option.value)
      || sanitizeOptionValue(typeof option.label === 'string' ? option.label : '');

    if (!value) {
      return null;
    }

    return { value, label: sanitizeLocalizedValue(option.label, value) };
  }

  return null;
};

const sanitizeOptionsList = (options) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map(sanitizeOption).filter(Boolean);
};

const sanitizeEmptyOptionLabel = (value, fallback = 'Toutes les valeurs') => sanitizeLocalizedValue(value, fallback);

const normalizeFilterField = (field) => {
  if (!field || typeof field !== 'object') {
    return null;
  }

  const id = sanitizeIdentifier(field.id);
  if (!id) {
    return null;
  }

  const rawType = typeof field.type === 'string' ? field.type : 'text';
  const type = rawType === 'select' ? 'select' : 'text';

  const normalized = {
    id,
    label: sanitizeLocalizedValue(field.label, id),
    type,
    enabled: sanitizeBoolean(field.enabled, true)
  };

  const sourceQuestionId = sanitizeIdentifier(field.sourceQuestionId);
  if (sourceQuestionId) {
    normalized.sourceQuestionId = sourceQuestionId;
  }

  if (type === 'select') {
    normalized.options = sanitizeOptionsList(field.options);
    if (Object.prototype.hasOwnProperty.call(field, 'emptyOptionLabel')) {
      normalized.emptyOptionLabel = sanitizeEmptyOptionLabel(field.emptyOptionLabel);
    }
  }

  return normalized;
};

const normalizeFormField = (field) => {
  if (!field || typeof field !== 'object') {
    return null;
  }

  const id = sanitizeIdentifier(field.id);
  if (!id) {
    return null;
  }

  const type = typeof field.type === 'string' ? field.type : 'text';

  const normalized = {
    id,
    label: sanitizeLocalizedValue(field.label, id),
    type,
    enabled: sanitizeBoolean(field.enabled, true)
  };

  if (typeof field.required === 'boolean') {
    normalized.required = field.required;
  }

  if (typeof field.placeholder === 'string') {
    normalized.placeholder = field.placeholder;
  }

  if (type === 'select' || type === 'multi_select') {
    normalized.options = sanitizeOptionsList(field.options);
  }

  return normalized;
};

const normalizeFilterConfig = (config, fallback) => {
  if (!config || typeof config !== 'object') {
    return clone(fallback);
  }

  if (!Array.isArray(config.fields)) {
    return clone(fallback);
  }

  const fields = config.fields.map(normalizeFilterField).filter(Boolean);
  return { fields };
};

const normalizeFormConfig = (config, fallback) => {
  const base = config && typeof config === 'object' ? config : {};
  const fields = Array.isArray(base.fields) ? base.fields.map(normalizeFormField).filter(Boolean) : [];

  if (fields.length === 0) {
    return clone(fallback);
  }

  return { fields };
};

export const createDefaultInspirationFiltersConfig = () => clone(DEFAULT_INSPIRATION_FILTERS);

export const createDefaultInspirationFormConfig = () => clone(DEFAULT_INSPIRATION_FORM_FIELDS);

export const normalizeInspirationFiltersConfig = (config) =>
  normalizeFilterConfig(config, DEFAULT_INSPIRATION_FILTERS);

export const normalizeInspirationFormConfig = (config) =>
  normalizeFormConfig(config, DEFAULT_INSPIRATION_FORM_FIELDS);

export const resetInspirationFiltersConfig = () => createDefaultInspirationFiltersConfig();

export const resetInspirationFormConfig = () => createDefaultInspirationFormConfig();

export const updateInspirationFilterField = (config, fieldId, updates) => {
  const normalized = normalizeInspirationFiltersConfig(config);
  const nextFields = normalized.fields.map((field) => {
    if (field.id !== fieldId) {
      return field;
    }

    const updated = { ...field };

    if (Object.prototype.hasOwnProperty.call(updates, 'label')) {
      updated.label = updates.label;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'enabled')) {
      updated.enabled = updates.enabled;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'type')) {
      updated.type = updates.type === 'select' ? 'select' : 'text';
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'options') && updated.type === 'select') {
      updated.options = updates.options;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'emptyOptionLabel') && updated.type === 'select') {
      updated.emptyOptionLabel = updates.emptyOptionLabel;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'sourceQuestionId')) {
      updated.sourceQuestionId = updates.sourceQuestionId;
    }

    return normalizeFilterField(updated) || field;
  });

  return { ...normalized, fields: nextFields };
};

export const updateInspirationFormField = (config, fieldId, updates) => {
  const normalized = normalizeInspirationFormConfig(config);
  const nextFields = normalized.fields.map((field) => {
    if (field.id !== fieldId) {
      return field;
    }

    const updated = { ...field, ...updates };
    return normalizeFormField(updated) || field;
  });

  return { ...normalized, fields: nextFields };
};
