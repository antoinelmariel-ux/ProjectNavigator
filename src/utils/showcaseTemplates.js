// Modèles de vitrine : une structure de départ définie dans le back-office pour les projets
// dont le récit ne colle pas aux sections intégrées (un don n'a ni « problème » ni
// « solution »). Un modèle choisit les sections intégrées gardées, leur ordre, et y intercale
// des blocs personnalisés pré-intitulés. Logique pure, sans React : `npm test` la couvre.
import { resolveLocalizedText } from './localizedContent.js';
import { evaluateRule } from './rules.js';
import { normalizeRuleConditionGroups } from './ruleConditions.js';
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

// L'activation reprend la grammaire des règles (groupes ET entre eux, ET/OU à l'intérieur,
// mêmes opérateurs) et passe par `evaluateRule` : les deux ne peuvent pas diverger. Un modèle
// enregistré avec l'ancienne forme `{questionId, values}` est relu comme « question = l'une
// de ces réponses ».
const normalizeActivation = (activation) => {
  const raw = activation && typeof activation === 'object' ? activation : {};
  if (Array.isArray(raw.conditionGroups)) {
    return { conditionGroups: normalizeRuleConditionGroups({ conditionGroups: raw.conditionGroups }) };
  }

  const questionId = normalizeString(raw.questionId);
  const values = Array.isArray(raw.values)
    ? Array.from(new Set(raw.values.map(normalizeString).filter(Boolean)))
    : [];
  if (!questionId || values.length === 0) {
    return { conditionGroups: [] };
  }
  return {
    conditionGroups: normalizeRuleConditionGroups({
      conditionGroups: [{
        logic: 'any',
        conditions: values.map((value) => ({ type: 'question', question: questionId, operator: 'equals', value }))
      }]
    })
  };
};

// Une condition encore vide (question non choisie) est satisfaite par le moteur de règles :
// sans ce garde-fou, un modèle en cours de saisie s'appliquerait à tous les projets.
const isConditionDefined = (condition) => {
  if (!condition || typeof condition !== 'object') {
    return false;
  }
  if ((condition.type || 'question') === 'timing') {
    return Boolean(condition.startQuestion && condition.endQuestion);
  }
  return Boolean(condition.question);
};

export const hasShowcaseTemplateActivation = (template) => {
  const groups = template?.activation?.conditionGroups;
  return Array.isArray(groups)
    && groups.length > 0
    && groups.every((group) => Array.isArray(group.conditions)
      && group.conditions.length > 0
      && group.conditions.every(isConditionDefined));
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

// Premier modèle, dans l'ordre de la liste, dont les conditions sont remplies par les réponses
// du projet. Un modèle sans condition complète ne s'active jamais : il est en préparation.
// Le périmètre d'activité de la personne connectée n'est pas injecté : une vitrine se lit par
// n'importe qui, sa structure ne peut pas dépendre de qui la regarde.
export const resolveShowcaseTemplate = (answers, templates) => {
  const source = answers && typeof answers === 'object' ? answers : {};

  return normalizeShowcaseTemplates(templates).find((template) => (
    hasShowcaseTemplateActivation(template)
    && evaluateRule({ conditionGroups: template.activation.conditionGroups }, source).triggered
  )) || null;
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
    activation: { conditionGroups: [] },
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
