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
  'media-gallery',
  'story',
  'checklist',
  'stack'
];

// Le bandeau « réponses incomplètes » n'est pas une section du récit : il s'affiche de
// lui-même selon l'état du projet, aucun modèle ne doit pouvoir le faire disparaître.
export const SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID = 'notice';

// Champs des sections intégrées qu'un modèle peut faire lire dans une autre question du
// questionnaire. Les dates, le budget, les jalons et le thème restent fixes : leur rendu
// dépend de leur format propre. Le nom du projet aussi, car il nomme le projet partout.
export const SHOWCASE_TEMPLATE_SOURCE_FIELDS = {
  hero: [
    { id: 'projectSlogan', kind: 'text' },
    { id: 'targetAudience', kind: 'choice' }
  ],
  problem: [{ id: 'problemPainPoints', kind: 'text' }],
  solution: [{ id: 'solutionDescription', kind: 'text' }],
  benefits: [{ id: 'solutionBenefits', kind: 'text' }],
  objectives: [
    { id: 'innovationProcess', kind: 'text' },
    { id: 'showcaseImpactFigure', kind: 'text' },
    { id: 'showcaseImpactFigureUnit', kind: 'text' },
    { id: 'showcaseImpactFigureCaption', kind: 'text' }
  ],
  indicators: [{ id: 'visionStatement', kind: 'text' }],
  team: [
    { id: 'teamLead', kind: 'text' },
    { id: 'teamLeadTeam', kind: 'choice' },
    { id: 'teamCoreMembers', kind: 'text' }
  ]
};

// Seuls ces gabarits ont un contenu qui tient en un seul texte ; les autres portent des
// colonnes, des éléments, un chiffre ou un document.
export const SHOWCASE_TEMPLATE_LINKABLE_BLOCK_TYPES = ['highlight', 'story'];

const QUESTION_TYPES_BY_SOURCE_KIND = {
  text: ['text', 'long_text'],
  choice: ['choice', 'multi_choice'],
  block: ['text', 'long_text', 'choice', 'multi_choice']
};

export const isQuestionCompatibleWithSourceKind = (question, kind) => {
  const types = QUESTION_TYPES_BY_SOURCE_KIND[kind] || [];
  return Boolean(question && typeof question.id === 'string' && types.includes(question.type || 'text'));
};

const SOURCE_FIELD_KIND_BY_ID = Object.values(SHOWCASE_TEMPLATE_SOURCE_FIELDS)
  .flat()
  .reduce((accumulator, field) => {
    accumulator[field.id] = field.kind;
    return accumulator;
  }, {});

export const getShowcaseSourceFieldKind = (fieldId) => SOURCE_FIELD_KIND_BY_ID[fieldId] || null;

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

// Seuls les champs que la section affiche vraiment sont gardés, et un champ renvoyé vers
// sa propre question ne crée pas de correspondance.
const normalizeFieldSources = (sectionId, rawSources) => {
  const allowed = SHOWCASE_TEMPLATE_SOURCE_FIELDS[sectionId] || [];
  const source = rawSources && typeof rawSources === 'object' ? rawSources : {};
  return allowed.reduce((accumulator, field) => {
    const questionId = normalizeString(source[field.id]);
    if (questionId && questionId !== field.id) {
      accumulator[field.id] = questionId;
    }
    return accumulator;
  }, {});
};

const normalizeEntry = (entry, index) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (entry.kind === 'builtin') {
    const id = normalizeString(entry.id);
    if (!SHOWCASE_SECTION_IDS.includes(id)) {
      return null;
    }
    const fieldSources = normalizeFieldSources(id, entry.fieldSources);
    return Object.keys(fieldSources).length > 0 ? { kind: 'builtin', id, fieldSources } : { kind: 'builtin', id };
  }

  if (entry.kind === 'block') {
    const type = SHOWCASE_TEMPLATE_BLOCK_TYPES.includes(entry.type) ? entry.type : SHOWCASE_TEMPLATE_BLOCK_TYPES[0];
    const block = {
      kind: 'block',
      id: normalizeString(entry.id) || `block-${index + 1}`,
      type,
      title: normalizeLocalized(entry.title),
      description: normalizeLocalized(entry.description)
    };
    const sourceQuestionId = normalizeString(entry.sourceQuestionId);
    return sourceQuestionId ? { ...block, sourceQuestionId } : block;
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
  ...(entry.sourceQuestionId ? { sourceQuestionId: entry.sourceQuestionId } : {}),
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
    .filter((section) => section.title.trim() !== '' || section.description.trim() !== '' || section.sourceQuestionId);
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

const findQuestion = (questions, id) => (
  Array.isArray(questions) ? questions.find((question) => question?.id === id) || null : null
);

// Clé sous laquelle la vitrine range la réponse d'une question liée à un bloc : distincte de
// tout identifiant de question, pour qu'elle ne se confonde jamais avec un champ intégré.
const LINKED_BLOCK_FIELD_PREFIX = '__showcase_block_source__';

export const buildLinkedBlockFieldId = (questionId) => `${LINKED_BLOCK_FIELD_PREFIX}${questionId}`;

export const isLinkedBlockLinkable = (section) => (
  Boolean(section && normalizeString(section.sourceQuestionId))
  && SHOWCASE_TEMPLATE_LINKABLE_BLOCK_TYPES.includes(section.type)
);

/**
 * Correspondances « champ de la vitrine -> question » d'un modèle, réduites à celles dont la
 * question existe encore et a un type que le champ sait afficher : une question supprimée
 * du référentiel rend son champ à sa question d'origine plutôt que de le vider.
 */
export const resolveShowcaseTemplateFieldSources = (template, questions) => {
  if (!template || !Array.isArray(template.sections)) {
    return {};
  }
  return template.sections.reduce((accumulator, entry) => {
    if (entry.kind !== 'builtin' || !entry.fieldSources) {
      return accumulator;
    }
    Object.entries(entry.fieldSources).forEach(([fieldId, questionId]) => {
      const question = findQuestion(questions, questionId);
      if (isQuestionCompatibleWithSourceKind(question, getShowcaseSourceFieldKind(fieldId))) {
        accumulator[fieldId] = questionId;
      }
    });
    return accumulator;
  }, {});
};

// Même chose pour les blocs liés à une question. Le lien voyage avec le bloc : il reste
// valable une fois les blocs du modèle recopiés dans le projet par son porteur.
export const resolveLinkedBlockFieldSources = (sections, questions) => (
  (Array.isArray(sections) ? sections : []).reduce((accumulator, section) => {
    if (!isLinkedBlockLinkable(section)) {
      return accumulator;
    }
    const questionId = normalizeString(section.sourceQuestionId);
    if (isQuestionCompatibleWithSourceKind(findQuestion(questions, questionId), 'block')) {
      accumulator[buildLinkedBlockFieldId(questionId)] = questionId;
    }
    return accumulator;
  }, {})
);

/**
 * Réponses vues par la vitrine : chaque champ lié lit la réponse de sa question. Une
 * question encore sans réponse laisse le champ vide, jamais la réponse de la question
 * d'origine.
 */
export const applyShowcaseFieldSources = (answers, fieldSources) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  const entries = Object.entries(fieldSources || {});
  if (entries.length === 0) {
    return base;
  }
  const next = { ...base };
  entries.forEach(([fieldId, questionId]) => {
    next[fieldId] = base[questionId];
  });
  return next;
};

// Questions vues par la vitrine : la question liée prend l'identifiant du champ, si bien que
// l'affichage, l'inspecteur et la publication la traitent comme le champ d'origine. Elle est
// marquée obligatoire pour qu'une réponse absente s'affiche « information manquante ».
export const applyShowcaseFieldSourcesToQuestions = (questions, fieldSources) => {
  const list = Array.isArray(questions) ? questions : [];
  const entries = Object.entries(fieldSources || {});
  if (entries.length === 0) {
    return list;
  }
  const aliases = entries
    .map(([fieldId, questionId]) => {
      const question = findQuestion(list, questionId);
      return question ? { ...question, id: fieldId, required: true } : null;
    })
    .filter(Boolean);
  const aliasIds = new Set(aliases.map((question) => question.id));
  return [...list.filter((question) => !aliasIds.has(question?.id)), ...aliases];
};

// Publication : ce que le porteur a modifié dans un champ lié est écrit dans la question
// elle-même, donc dans le questionnaire (et l'analyse de risque qui en découle).
export const mapShowcaseUpdatesToSources = (updates, fieldSources) => {
  if (!updates || typeof updates !== 'object') {
    return {};
  }
  const sources = fieldSources || {};
  return Object.entries(updates).reduce((accumulator, [key, value]) => {
    accumulator[sources[key] || key] = value;
    return accumulator;
  }, {});
};

const isEmptyAnswer = (value) => (
  value === undefined
  || value === null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0)
);

// Rendu lecteur : un champ texte lié dont la question n'a pas de réponse affiche le libellé
// « information manquante » au lieu de faire disparaître sa section.
export const fillMissingSourcedTextFields = (answers, fieldSources, missingLabel) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  const fieldIds = Object.keys(fieldSources || {})
    .filter((fieldId) => getShowcaseSourceFieldKind(fieldId) === 'text' && isEmptyAnswer(base[fieldId]));
  if (fieldIds.length === 0 || !missingLabel) {
    return base;
  }
  const next = { ...base };
  fieldIds.forEach((fieldId) => {
    next[fieldId] = missingLabel;
  });
  return next;
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
