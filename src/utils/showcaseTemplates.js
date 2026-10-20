// Modèles de vitrine : une structure de départ définie dans le back-office pour les projets
// dont le récit ne colle pas aux sections intégrées (un don n'a ni « problème » ni
// « solution »). Un modèle choisit les sections intégrées gardées, leur ordre, et y intercale
// des blocs personnalisés pré-intitulés. Logique pure, sans React : `npm test` la couvre.
import { resolveLocalizedText } from './localizedContent.js';
import { extractAnswerValues } from './showcase.js';
import { SHOWCASE_SECTION_IDS } from './showcaseEditor.js';
import { THEME_ACCENT_FAMILY_ID } from './showcaseAccents.js';

export const SHOWCASE_TEMPLATE_BLOCK_TYPES = [
  'highlight',
  'figure',
  'columns',
  'document-viewer',
  'story',
  'checklist',
  'stack'
];

// Le bandeau « réponses incomplètes » n'est pas une section du récit : il s'affiche de
// lui-même selon l'état du projet, aucun modèle ne doit pouvoir le faire disparaître.
export const SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID = 'notice';

const DEFAULT_ACTIVATION_QUESTION_ID = 'ProjectType';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeLocalized = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [language, text]) => {
      if (typeof text === 'string') {
        accumulator[language] = text;
      }
      return accumulator;
    }, {});
  }
  return '';
};

const normalizeActivation = (activation) => {
  const raw = activation && typeof activation === 'object' ? activation : {};
  const values = Array.isArray(raw.values)
    ? Array.from(new Set(raw.values.map(normalizeString).filter(Boolean)))
    : [];
  return {
    questionId: normalizeString(raw.questionId) || DEFAULT_ACTIVATION_QUESTION_ID,
    values
  };
};

const normalizeEntry = (entry, index) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (entry.kind === 'builtin') {
    const id = normalizeString(entry.id);
    return SHOWCASE_SECTION_IDS.includes(id) ? { kind: 'builtin', id } : null;
  }

  if (entry.kind === 'block') {
    const type = SHOWCASE_TEMPLATE_BLOCK_TYPES.includes(entry.type) ? entry.type : SHOWCASE_TEMPLATE_BLOCK_TYPES[0];
    return {
      kind: 'block',
      id: normalizeString(entry.id) || `block-${index + 1}`,
      type,
      title: normalizeLocalized(entry.title),
      description: normalizeLocalized(entry.description)
    };
  }

  return null;
};

export const normalizeShowcaseTemplate = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const seenBuiltIns = new Set();
  const seenBlocks = new Set();
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .map(normalizeEntry)
    .filter(Boolean)
    .filter((entry) => {
      const seen = entry.kind === 'builtin' ? seenBuiltIns : seenBlocks;
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    });

  if (!seenBuiltIns.has(SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID)) {
    sections.unshift({ kind: 'builtin', id: SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID });
  }

  return {
    id: normalizeString(raw.id) || `showcase-template-${index + 1}`,
    name: normalizeLocalized(raw.name),
    activation: normalizeActivation(raw.activation),
    sections
  };
};

export const normalizeShowcaseTemplates = (rawTemplates) => {
  if (!Array.isArray(rawTemplates)) {
    return [];
  }
  const seen = new Set();
  return rawTemplates
    .map(normalizeShowcaseTemplate)
    .filter(Boolean)
    .filter((template) => {
      if (seen.has(template.id)) {
        return false;
      }
      seen.add(template.id);
      return true;
    });
};

// Premier modèle dont une valeur d'activation figure parmi les réponses à la question visée.
// Un modèle sans valeur ne s'active jamais : il est en cours de préparation.
export const resolveShowcaseTemplate = (answers, templates) => {
  const normalized = normalizeShowcaseTemplates(templates);
  const source = answers && typeof answers === 'object' ? answers : {};

  return normalized.find((template) => {
    const { questionId, values } = template.activation;
    if (values.length === 0) {
      return false;
    }
    const selected = extractAnswerValues(source[questionId]);
    return selected.some((value) => values.includes(value));
  }) || null;
};

// Les options revendiquées par plusieurs modèles : seul le premier s'appliquera.
export const getShowcaseTemplateActivationConflicts = (templates) => {
  const claims = new Map();
  normalizeShowcaseTemplates(templates).forEach((template) => {
    template.activation.values.forEach((value) => {
      const key = `${template.activation.questionId}::${value}`;
      const current = claims.get(key) || { questionId: template.activation.questionId, value, templateIds: [] };
      current.templateIds.push(template.id);
      claims.set(key, current);
    });
  });
  return Array.from(claims.values()).filter((claim) => claim.templateIds.length > 1);
};

export const getTemplateBuiltInSectionIds = (template) => {
  if (!template || !Array.isArray(template.sections)) {
    return SHOWCASE_SECTION_IDS;
  }
  return template.sections.filter((entry) => entry.kind === 'builtin').map((entry) => entry.id);
};

// Identifiant stable d'un bloc issu d'un modèle : l'ordre enregistré d'une vitrine peut
// le référencer alors que les blocs eux-mêmes viennent encore du modèle.
export const buildTemplateBlockSectionId = (templateId, blockId) => `template-${templateId}-${blockId}`;

const buildBlockSection = (template, entry, language) => ({
  id: buildTemplateBlockSectionId(template.id, entry.id),
  type: entry.type,
  title: resolveLocalizedText(entry.title, language),
  subtitle: '',
  description: resolveLocalizedText(entry.description, language),
  accent: '',
  accentFamily: THEME_ACCENT_FAMILY_ID,
  figure: '',
  documentUrl: '',
  documentType: 'pdf',
  items: [],
  columnCount: 1,
  columns: []
});

/**
 * Réponses vues par la vitrine : tant que le porteur n'a pas enregistré ses propres blocs
 * (`customShowcaseSections`) ni son propre ordre (`showcaseSectionOrder`), ceux du modèle en
 * tiennent lieu. Rien n'est écrit dans le projet : un modèle retouché en back-office atteint
 * donc toutes les vitrines que personne n'a encore personnalisées, et une vitrine
 * personnalisée appartient à son porteur.
 */
export const applyShowcaseTemplate = (answers, template, language) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  if (!template || !Array.isArray(template.sections)) {
    return base;
  }

  const hasStoredSections = Array.isArray(base.customShowcaseSections);
  const hasStoredOrder = Array.isArray(base.showcaseSectionOrder);
  if (hasStoredSections && hasStoredOrder) {
    return base;
  }

  const blocks = template.sections
    .filter((entry) => entry.kind === 'block')
    .map((entry) => buildBlockSection(template, entry, language))
    .filter((section) => section.title.trim() !== '' || section.description.trim() !== '');
  const blockIds = new Set(blocks.map((section) => section.id));
  const order = template.sections
    .map((entry) => (entry.kind === 'builtin' ? entry.id : buildTemplateBlockSectionId(template.id, entry.id)))
    .filter((id) => SHOWCASE_SECTION_IDS.includes(id) || blockIds.has(id));

  return {
    ...base,
    customShowcaseSections: hasStoredSections ? base.customShowcaseSections : blocks,
    showcaseSectionOrder: hasStoredOrder ? base.showcaseSectionOrder : order
  };
};

export const createShowcaseTemplate = (existingTemplates = []) => {
  const ids = new Set((Array.isArray(existingTemplates) ? existingTemplates : []).map((template) => template?.id));
  let counter = ids.size + 1;
  while (ids.has(`showcase-template-${counter}`)) {
    counter += 1;
  }
  return normalizeShowcaseTemplate({
    id: `showcase-template-${counter}`,
    name: '',
    activation: { questionId: DEFAULT_ACTIVATION_QUESTION_ID, values: [] },
    sections: SHOWCASE_SECTION_IDS.map((id) => ({ kind: 'builtin', id }))
  });
};

export const createShowcaseTemplateBlock = (template) => {
  const ids = new Set((template?.sections || []).filter((entry) => entry.kind === 'block').map((entry) => entry.id));
  let counter = ids.size + 1;
  while (ids.has(`block-${counter}`)) {
    counter += 1;
  }
  return { kind: 'block', id: `block-${counter}`, type: 'highlight', title: '', description: '' };
};
