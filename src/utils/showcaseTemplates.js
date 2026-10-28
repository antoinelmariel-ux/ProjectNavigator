// Modèles de vitrine : une structure de départ définie dans le back-office pour les projets
// dont le récit ne colle pas aux sections intégrées (un don n'a ni « problème » ni
// « solution »). Un modèle choisit les sections intégrées gardées, leur ordre, ce qu'elles
// affichent et sous quels titres, et y intercale des blocs dont chaque emplacement (titre,
// texte, chiffre, liste…) dit d'où vient son contenu. Logique pure, sans React : `npm test`
// la couvre.
import { resolveLocalizedText } from './localizedContent.js';
import { evaluateRule } from './rules.js';
import { normalizeRuleConditionGroups } from './ruleConditions.js';
import { SHOWCASE_SECTION_IDS } from './showcaseEditor.js';
import { THEME_ACCENT_FAMILY_ID } from './showcaseAccents.js';
import { formatAnswer, getNumberUnitOptions } from './questions.js';
import { sortMilestonesChronologically } from './showcaseMilestones.js';
import { getLocaleTag } from '../i18n/languages.js';

// Catalogue des mises en page d'un bloc. Les quatre dernières reprennent la forme des
// sections intégrées (hero, équipe, feuille de route) ou en ajoutent une (citation), pour
// qu'une vitrine entière puisse se construire en blocs.
export const SHOWCASE_TEMPLATE_BLOCK_TYPES = [
  'highlight',
  'figure',
  'columns',
  'document-viewer',
  'story',
  'checklist',
  'stack',
  'cover',
  'steps',
  'team',
  'quote'
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
    { id: 'showcaseImpactFigure', kind: 'figure' },
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

// Éléments d'une section intégrée qu'un modèle peut retirer. Ce qui donne son sens à la
// section (le nom du projet, le texte d'une section à un seul champ) n'y figure pas : le
// retirer revient à retirer la section, ce que la liste des sections fait déjà.
export const SHOWCASE_BUILTIN_OPTIONAL_PARTS = {
  hero: ['projectSlogan', 'heroHighlights', 'heroCta'],
  objectives: ['innovationProcess', 'impactFigure'],
  team: ['teamLead', 'teamLeadTeam', 'teamCoreMembers'],
  timeline: ['budget', 'launchCountdown', 'complianceDelays', 'roadmapMilestones']
};

// Champs de l'inspecteur que chaque élément affiche : un élément retiré ne laisse pas dans
// l'inspecteur un champ dont la saisie ne se verrait nulle part.
const BUILTIN_PART_FIELD_IDS = {
  projectSlogan: ['projectSlogan'],
  heroHighlights: ['targetAudience'],
  heroCta: [],
  innovationProcess: ['innovationProcess'],
  impactFigure: ['showcaseImpactFigure', 'showcaseImpactFigureUnit', 'showcaseImpactFigureCaption'],
  teamLead: ['teamLead'],
  teamLeadTeam: ['teamLeadTeam'],
  teamCoreMembers: ['teamCoreMembers'],
  budget: ['BUDGET'],
  launchCountdown: ['launchDate', 'campaignKickoffDate'],
  complianceDelays: [],
  roadmapMilestones: ['roadmapMilestones']
};

const PART_BY_FIELD_ID = Object.entries(BUILTIN_PART_FIELD_IDS).reduce((accumulator, [part, fieldIds]) => {
  fieldIds.forEach((fieldId) => {
    accumulator[fieldId] = part;
  });
  return accumulator;
}, {});

// Titres d'une section intégrée qu'un modèle peut renommer (« Le problème » devient « Le
// besoin »). Le hero n'a qu'un sur-titre : son titre est le nom du projet.
export const SHOWCASE_BUILTIN_LABEL_KEYS = {
  hero: ['eyebrow'],
  problem: ['eyebrow', 'headline'],
  solution: ['eyebrow', 'headline'],
  benefits: ['eyebrow', 'headline'],
  objectives: ['eyebrow', 'headline'],
  indicators: ['eyebrow', 'headline'],
  team: ['eyebrow', 'headline'],
  timeline: ['eyebrow', 'headline']
};

// Seuls ces gabarits avaient, avant les emplacements, un contenu qui tient en un seul texte
// lié à une question : un bloc enregistré dans un projet avec `sourceQuestionId` est relu
// comme un emplacement « texte » lié.
export const SHOWCASE_TEMPLATE_LINKABLE_BLOCK_TYPES = ['highlight', 'story'];

// Emplacements de chaque gabarit de bloc, dans l'ordre où la vitrine les affiche. Leur
// identifiant est le champ de la section qui les porte. `text` reçoit une valeur, `list`
// une suite d'éléments (un par option cochée, un par ligne de texte, un par jalon).
// `labelKey` nomme l'emplacement quand le champ joue un autre rôle que son nom (le
// sous-titre d'une équipe est son responsable).
export const SHOWCASE_BLOCK_SLOTS = {
  highlight: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'description', kind: 'text' }
  ],
  figure: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'figure', kind: 'text' },
    { id: 'description', kind: 'text' }
  ],
  columns: [
    { id: 'subtitle', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'columns', kind: 'list' }
  ],
  'document-viewer': [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'subtitle', kind: 'text' },
    { id: 'description', kind: 'text' }
  ],
  story: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'description', kind: 'text' }
  ],
  checklist: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'description', kind: 'text' },
    { id: 'items', kind: 'list' }
  ],
  stack: [
    { id: 'subtitle', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'items', kind: 'list' }
  ],
  cover: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'subtitle', kind: 'text', labelKey: 'tagline' },
    { id: 'items', kind: 'list', labelKey: 'badges' }
  ],
  steps: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'items', kind: 'list', labelKey: 'steps' }
  ],
  team: [
    { id: 'accent', kind: 'text' },
    { id: 'title', kind: 'text' },
    { id: 'subtitle', kind: 'text', labelKey: 'lead' },
    { id: 'description', kind: 'text', labelKey: 'leadRole' },
    { id: 'items', kind: 'list', labelKey: 'members' }
  ],
  quote: [
    { id: 'description', kind: 'text', labelKey: 'quote' },
    { id: 'subtitle', kind: 'text', labelKey: 'author' },
    { id: 'accent', kind: 'text', labelKey: 'authorRole' }
  ]
};

// Séparateur entre la date (ou l'étiquette) d'une étape et son texte : c'est celui que
// produit un jalon du questionnaire, et celui qu'on tape naturellement dans un texte.
export const STEP_LABEL_SEPARATOR = ' — ';

export const getBlockSlotDefinitions = (type) => SHOWCASE_BLOCK_SLOTS[type] || SHOWCASE_BLOCK_SLOTS.highlight;

// `used` : affiché, et modifiable par le porteur quand il le peut ; `locked` : affiché tel
// que le modèle le dit ; `hidden` : ni affiché, ni proposé à la saisie.
export const SHOWCASE_SLOT_STATES = ['used', 'locked', 'hidden'];

// Types de question qu'un emplacement sait afficher. Les jalons, fichiers et classements
// ont un rendu propre que ni un titre ni une liste ne restituent.
export const SHOWCASE_SLOT_QUESTION_TYPES = ['text', 'long_text', 'choice', 'multi_choice', 'number', 'date', 'milestone_list'];

// Ce que la vitrine fait d'un emplacement pour le porteur :
// - owner   : il l'écrit lui-même (texte de départ du modèle) ;
// - linked  : réponse texte d'une question, qu'il modifie dans la vitrine comme au questionnaire ;
// - derived : calculé depuis le questionnaire (nombre, choix, date, phrase composée) — il change
//             les réponses, pas l'emplacement ;
// - locked  : fixé par le modèle ;
// - hidden  : absent.
export const SLOT_MODES = {
  OWNER: 'owner',
  LINKED: 'linked',
  DERIVED: 'derived',
  LOCKED: 'locked',
  HIDDEN: 'hidden'
};

const QUESTION_TYPES_BY_SOURCE_KIND = {
  text: ['text', 'long_text'],
  choice: ['choice', 'multi_choice'],
  figure: ['text', 'number'],
  block: ['text', 'long_text', 'choice', 'multi_choice'],
  slot: SHOWCASE_SLOT_QUESTION_TYPES
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

const isLocalizedEmpty = (value) => {
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (value && typeof value === 'object') {
    return Object.values(value).every((text) => typeof text !== 'string' || text.trim() === '');
  }
  return true;
};

const findQuestion = (questions, id) => (
  Array.isArray(questions) ? questions.find((question) => question?.id === id) || null : null
);

// --- Textes composés -------------------------------------------------------------------

// `{{donationAmount}}` dans un texte du modèle est remplacé par la réponse à cette question,
// mise en forme. Un identifiant de question ne contient ni espace ni accolade.
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}\s]+)\s*\}\}/g;

export const buildSlotPlaceholder = (questionId) => `{{${questionId}}}`;

export const extractSlotPlaceholders = (text) => {
  if (typeof text !== 'string' || text === '') {
    return [];
  }
  const ids = [];
  text.replace(PLACEHOLDER_PATTERN, (match, id) => {
    if (!ids.includes(id)) {
      ids.push(id);
    }
    return match;
  });
  return ids;
};

const extractLocalizedPlaceholders = (value) => {
  if (typeof value === 'string') {
    return extractSlotPlaceholders(value);
  }
  if (value && typeof value === 'object') {
    return Array.from(new Set(Object.values(value).flatMap((text) => extractSlotPlaceholders(text))));
  }
  return [];
};

export const composeSlotText = (text, resolveValue) => {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(PLACEHOLDER_PATTERN, (match, id) => {
    const value = typeof resolveValue === 'function' ? resolveValue(id) : '';
    return typeof value === 'string' ? value : '';
  });
};

// --- Mise en forme d'une réponse pour un emplacement -----------------------------------

const isEmptyAnswer = (value) => (
  value === undefined
  || value === null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0)
);

const parseNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getMultiChoiceValues = (answer) => {
  if (Array.isArray(answer)) {
    return answer;
  }
  if (answer && typeof answer === 'object' && Array.isArray(answer.values)) {
    return answer.values;
  }
  return [];
};

// Une option d'un choix multiple, mise en forme seule : ses sous-options et son texte
// « Autre » l'accompagnent, exactement comme dans la synthèse.
const formatSingleMultiChoiceValue = (question, answer, value, language) => {
  if (Array.isArray(answer)) {
    return formatAnswer(question, [value], language);
  }
  const key = value == null ? '' : String(value);
  return formatAnswer(question, {
    ...answer,
    values: [value],
    children: answer.children && Array.isArray(answer.children[key]) ? { [key]: answer.children[key] } : {},
    childrenOtherText: answer.childrenOtherText && typeof answer.childrenOtherText[key] === 'string'
      ? { [key]: answer.childrenOtherText[key] }
      : {}
  }, language);
};

/**
 * Réponse d'une question telle qu'un emplacement l'affiche : `text` pour un titre, un
 * chiffre ou un paragraphe ; `items` pour une liste (une entrée par option cochée). Un
 * nombre est mis en forme dans la langue du lecteur, suivi de son unité — celle choisie
 * par le répondant quand la question en propose plusieurs.
 */
export const formatSlotQuestionValue = (question, answer, { language, unit } = {}) => {
  if (!question || isEmptyAnswer(answer)) {
    return { text: '', items: [] };
  }

  const type = question.type || 'text';

  if (type === 'number') {
    const parsed = parseNumber(answer);
    if (parsed === null) {
      const raw = String(answer).trim();
      return { text: raw, items: raw ? [raw] : [] };
    }
    const unitOptions = getNumberUnitOptions(question, language);
    const resolvedUnit = typeof unit === 'string' && unitOptions.includes(unit) ? unit : (unitOptions[0] || '');
    const formatted = parsed.toLocaleString(getLocaleTag(language));
    const text = resolvedUnit ? `${formatted}\u00a0${resolvedUnit}` : formatted;
    // `value`/`unit` séparés : un grand chiffre porte son unité dans un style à part.
    return { text, items: [text], value: formatted, unit: resolvedUnit };
  }

  // Une liste de jalons donne une étape par jalon, dans l'ordre chronologique, sous la forme
  // « date — texte » que la mise en page « Étapes » sait découper.
  if (type === 'milestone_list') {
    const items = sortMilestonesChronologically(Array.isArray(answer) ? answer : [])
      .map((entry) => formatAnswer(question, [entry], language))
      .map((label) => (typeof label === 'string' ? label.trim() : ''))
      .filter(Boolean);
    return { text: items.join('\n'), items };
  }

  if (type === 'multi_choice') {
    const items = getMultiChoiceValues(answer)
      .map((value) => formatSingleMultiChoiceValue(question, answer, value, language))
      .map((label) => (typeof label === 'string' ? label.trim() : ''))
      .filter(Boolean);
    return { text: items.join(', '), items };
  }

  const formatted = formatAnswer(question, answer, language);
  const text = typeof formatted === 'string' ? formatted.trim() : '';
  return { text, items: text ? [text] : [] };
};

// --- Emplacements des blocs ------------------------------------------------------------

const normalizeSlot = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const state = SHOWCASE_SLOT_STATES.includes(source.state) ? source.state : 'used';
  const text = normalizeLocalized(source.text);
  const questionId = normalizeString(source.questionId);
  if (source.source === 'question' && questionId) {
    return { state, source: 'question', questionId, text };
  }
  return { state, source: 'text', text };
};

// Un bloc enregistré avant les emplacements portait `title`, `description` et parfois
// `sourceQuestionId` : ils deviennent les emplacements correspondants.
const legacySlotsFromBlock = (entry, type) => {
  const legacy = {};
  if (entry.title !== undefined) {
    legacy.title = { text: entry.title };
  }
  const sourceQuestionId = normalizeString(entry.sourceQuestionId);
  if (sourceQuestionId && SHOWCASE_TEMPLATE_LINKABLE_BLOCK_TYPES.includes(type)) {
    legacy.description = { source: 'question', questionId: sourceQuestionId, text: entry.description };
  } else if (entry.description !== undefined) {
    legacy.description = { text: entry.description };
  }
  return legacy;
};

export const normalizeBlockSlots = (type, rawSlots) => {
  const source = rawSlots && typeof rawSlots === 'object' ? rawSlots : {};
  return getBlockSlotDefinitions(type).reduce((accumulator, definition) => {
    accumulator[definition.id] = normalizeSlot(source[definition.id]);
    return accumulator;
  }, {});
};

const slotHasContent = (slot) => (
  slot.state !== 'hidden' && (slot.source === 'question' || !isLocalizedEmpty(slot.text))
);

// Ce qu'une section de projet doit garder de ses emplacements : un emplacement que le
// porteur écrit vit dans le champ de la section, inutile de le recopier.
export const compactBlockSlots = (slots) => {
  if (!slots || typeof slots !== 'object') {
    return {};
  }
  return Object.entries(slots).reduce((accumulator, [slotId, rawSlot]) => {
    const slot = normalizeSlot(rawSlot);
    const isPlainOwnerText = slot.state === 'used'
      && slot.source === 'text'
      && extractLocalizedPlaceholders(slot.text).length === 0;
    if (!isPlainOwnerText) {
      accumulator[slotId] = slot;
    }
    return accumulator;
  }, {});
};

const isQuestionUsableInSlot = (question) => isQuestionCompatibleWithSourceKind(question, 'slot');

/**
 * Ce que la vitrine fait de cet emplacement (voir SLOT_MODES). `findQuestion` renvoie la
 * question telle que la vitrine la voit. Une question supprimée du référentiel, ou d'un
 * type que l'emplacement ne sait pas afficher, rend l'emplacement à son texte.
 */
export const resolveSlotMode = (slot, definition, { language, findQuestion: find } = {}) => {
  if (!slot) {
    return SLOT_MODES.OWNER;
  }
  if (slot.state === 'hidden') {
    return SLOT_MODES.HIDDEN;
  }
  if (slot.state === 'locked') {
    return SLOT_MODES.LOCKED;
  }
  if (slot.source === 'question') {
    const question = typeof find === 'function' ? find(slot.questionId) : null;
    if (isQuestionUsableInSlot(question)) {
      return definition?.kind !== 'list' && (question.type === 'text' || question.type === 'long_text')
        ? SLOT_MODES.LINKED
        : SLOT_MODES.DERIVED;
    }
  }
  return extractSlotPlaceholders(resolveLocalizedText(slot.text, language)).length > 0
    ? SLOT_MODES.DERIVED
    : SLOT_MODES.OWNER;
};

const splitLines = (text) => (typeof text === 'string' ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : []);

/**
 * Contenu affiché par un emplacement qui ne s'écrit pas dans la vitrine (lié, calculé,
 * verrouillé) ; `null` pour un emplacement que le porteur écrit lui-même (son contenu est
 * dans la section). `readQuestion(id)` renvoie `{text, items}` (voir formatSlotQuestionValue)
 * et `missing(id)` ce qui tient lieu d'une réponse absente.
 */
export const resolveSlotContent = (slot, definition, { mode, language, findQuestion: find, readQuestion, missing } = {}) => {
  if (!slot || mode === SLOT_MODES.OWNER || mode === SLOT_MODES.HIDDEN) {
    return null;
  }
  const read = (id) => (typeof readQuestion === 'function' ? readQuestion(id) : null) || { text: '', items: [] };
  const fallback = (id) => (typeof missing === 'function' ? missing(id) : '');
  const isList = definition?.kind === 'list';

  const question = slot.source === 'question' && typeof find === 'function' ? find(slot.questionId) : null;
  if (isQuestionUsableInSlot(question)) {
    const value = read(slot.questionId);
    if (isList) {
      return { items: value.items };
    }
    if (value.text && value.unit) {
      return { text: value.text, value: value.value, unit: value.unit };
    }
    return { text: value.text || fallback(slot.questionId) };
  }

  const template = resolveLocalizedText(slot.text, language);
  const resolve = (id) => {
    const value = read(id);
    return value.text || fallback(id);
  };
  if (isList) {
    return { items: splitLines(template).map((line) => composeSlotText(line, resolve)).filter((line) => line.trim() !== '') };
  }
  return { text: composeSlotText(template, resolve) };
};

// Questions que les emplacements d'une section lisent (liés, calculés, ou cités dans un
// texte composé), emplacements masqués exclus. `editableOnly` écarte ceux que le modèle
// verrouille : le porteur ne peut pas les modifier depuis la vitrine.
export const collectSlotQuestionIds = (slots, { editableOnly = false } = {}) => {
  if (!slots || typeof slots !== 'object') {
    return [];
  }
  const ids = [];
  Object.values(slots).forEach((rawSlot) => {
    const slot = normalizeSlot(rawSlot);
    if (slot.state === 'hidden' || (editableOnly && slot.state === 'locked')) {
      return;
    }
    const candidates = slot.source === 'question'
      ? [slot.questionId]
      : extractLocalizedPlaceholders(slot.text);
    candidates.forEach((id) => {
      if (id && !ids.includes(id)) {
        ids.push(id);
      }
    });
  });
  return ids;
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

const areConditionGroupsDefined = (groups) => (
  Array.isArray(groups)
  && groups.length > 0
  && groups.every((group) => Array.isArray(group.conditions)
    && group.conditions.length > 0
    && group.conditions.every(isConditionDefined))
);

export const hasShowcaseTemplateActivation = (template) => areConditionGroupsDefined(template?.activation?.conditionGroups);

// Condition d'affichage d'une section, même grammaire que l'activation. Absente, vide ou
// encore incomplète, elle ne masque rien : une condition en cours de saisie ne doit pas
// faire disparaître une section de toutes les vitrines.
const normalizeDisplayCondition = (raw) => {
  const groups = raw && typeof raw === 'object' && Array.isArray(raw.conditionGroups)
    ? normalizeRuleConditionGroups({ conditionGroups: raw.conditionGroups })
    : [];
  return groups.length > 0 ? { conditionGroups: groups } : null;
};

export const hasSectionDisplayCondition = (entry) => areConditionGroupsDefined(entry?.displayCondition?.conditionGroups);

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

const normalizeHiddenParts = (sectionId, rawParts) => {
  const allowed = SHOWCASE_BUILTIN_OPTIONAL_PARTS[sectionId] || [];
  const parts = Array.isArray(rawParts) ? rawParts.map(normalizeString) : [];
  return allowed.filter((part) => parts.includes(part));
};

const normalizeLabels = (sectionId, rawLabels) => {
  const allowed = SHOWCASE_BUILTIN_LABEL_KEYS[sectionId] || [];
  const source = rawLabels && typeof rawLabels === 'object' ? rawLabels : {};
  return allowed.reduce((accumulator, key) => {
    const value = normalizeLocalized(source[key]);
    if (!isLocalizedEmpty(value)) {
      accumulator[key] = value;
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
    const normalized = { kind: 'builtin', id };
    const fieldSources = normalizeFieldSources(id, entry.fieldSources);
    if (Object.keys(fieldSources).length > 0) {
      normalized.fieldSources = fieldSources;
    }
    const hiddenParts = normalizeHiddenParts(id, entry.hiddenParts);
    if (hiddenParts.length > 0) {
      normalized.hiddenParts = hiddenParts;
    }
    const labels = normalizeLabels(id, entry.labels);
    if (Object.keys(labels).length > 0) {
      normalized.labels = labels;
    }
    const displayCondition = id === SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID ? null : normalizeDisplayCondition(entry.displayCondition);
    if (displayCondition) {
      normalized.displayCondition = displayCondition;
    }
    return normalized;
  }

  if (entry.kind === 'block') {
    const type = SHOWCASE_TEMPLATE_BLOCK_TYPES.includes(entry.type) ? entry.type : SHOWCASE_TEMPLATE_BLOCK_TYPES[0];
    const rawSlots = entry.slots && typeof entry.slots === 'object'
      ? entry.slots
      : legacySlotsFromBlock(entry, type);
    const displayCondition = normalizeDisplayCondition(entry.displayCondition);
    return {
      kind: 'block',
      id: normalizeString(entry.id) || `block-${index + 1}`,
      type,
      slots: normalizeBlockSlots(type, rawSlots),
      ...(displayCondition ? { displayCondition } : {})
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

// --- Sections intégrées : éléments retirés et titres -----------------------------------

const findBuiltInEntry = (template, sectionId) => (
  template && Array.isArray(template.sections)
    ? template.sections.find((entry) => entry.kind === 'builtin' && entry.id === sectionId) || null
    : null
);

export const isBuiltInPartHidden = (template, sectionId, part) => {
  const entry = findBuiltInEntry(template, sectionId);
  return Boolean(entry && Array.isArray(entry.hiddenParts) && entry.hiddenParts.includes(part));
};

// Champs de l'inspecteur qui n'ont plus rien à afficher dans la vitrine de ce modèle.
export const getTemplateHiddenFieldIds = (template) => {
  const hidden = new Set();
  if (!template || !Array.isArray(template.sections)) {
    return hidden;
  }
  template.sections.forEach((entry) => {
    if (entry.kind !== 'builtin' || !Array.isArray(entry.hiddenParts)) {
      return;
    }
    entry.hiddenParts.forEach((part) => {
      (BUILTIN_PART_FIELD_IDS[part] || []).forEach((fieldId) => hidden.add(fieldId));
    });
  });
  return hidden;
};

export const resolveBuiltInSectionLabel = (template, sectionId, key, language) => {
  const entry = findBuiltInEntry(template, sectionId);
  const value = entry?.labels?.[key];
  return value === undefined ? '' : resolveLocalizedText(value, language).trim();
};

// Conditions d'affichage complètes du modèle, par identifiant de section de la vitrine.
// Comme les emplacements, elles suivent le modèle même dans une vitrine personnalisée.
export const getTemplateSectionDisplayConditions = (template) => {
  if (!template || !Array.isArray(template.sections)) {
    return {};
  }
  return template.sections.reduce((accumulator, entry) => {
    if (!hasSectionDisplayCondition(entry)) {
      return accumulator;
    }
    const sectionId = entry.kind === 'block' ? buildTemplateBlockSectionId(template.id, entry.id) : entry.id;
    accumulator[sectionId] = entry.displayCondition.conditionGroups;
    return accumulator;
  }, {});
};

// Sections que les réponses du projet masquent. Le périmètre d'activité de la personne
// connectée n'est pas injecté, pour la même raison que dans resolveShowcaseTemplate.
export const getSectionsHiddenByCondition = (displayConditions, answers) => {
  const source = answers && typeof answers === 'object' ? answers : {};
  return new Set(
    Object.entries(displayConditions || {})
      .filter(([, conditionGroups]) => !evaluateRule({ conditionGroups }, source).triggered)
      .map(([sectionId]) => sectionId)
  );
};

// Identifiant stable d'un bloc issu d'un modèle : l'ordre enregistré d'une vitrine peut
// le référencer alors que les blocs eux-mêmes viennent encore du modèle.
export const buildTemplateBlockSectionId = (templateId, blockId) => `template-${templateId}-${blockId}`;

const buildBlockSection = (template, entry, language) => {
  const fields = {
    accent: '',
    title: '',
    subtitle: '',
    description: '',
    figure: '',
    items: [],
    columns: []
  };
  getBlockSlotDefinitions(entry.type).forEach((definition) => {
    const slot = entry.slots?.[definition.id];
    if (!slot || slot.state !== 'used' || slot.source !== 'text') {
      return;
    }
    const value = resolveLocalizedText(slot.text, language);
    if (extractSlotPlaceholders(value).length > 0) {
      return;
    }
    fields[definition.id] = definition.kind === 'list' ? splitLines(value) : value;
  });
  const slots = compactBlockSlots(entry.slots);
  return {
    id: buildTemplateBlockSectionId(template.id, entry.id),
    type: entry.type,
    ...fields,
    accentFamily: THEME_ACCENT_FAMILY_ID,
    documentUrl: '',
    documentType: 'pdf',
    columnCount: Math.max(1, Math.min(4, fields.columns.length || 1)),
    ...(Object.keys(slots).length > 0 ? { slots } : {})
  };
};

/**
 * Réponses vues par la vitrine : tant que le porteur n'a pas enregistré ses propres blocs
 * (`customShowcaseSections`) ni son propre ordre (`showcaseSectionOrder`), ceux du modèle en
 * tiennent lieu. Rien n'est écrit dans le projet : un modèle retouché en back-office atteint
 * donc toutes les vitrines que personne n'a encore personnalisées, et une vitrine
 * personnalisée appartient à son porteur — à ceci près que les emplacements d'un bloc venu
 * du modèle continuent de suivre le modèle (voir getTemplateBlockSlots).
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
    .filter((entry) => entry.kind === 'block' && Object.values(entry.slots || {}).some(slotHasContent))
    .map((entry) => buildBlockSection(template, entry, language));
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

// Emplacements de chaque bloc du modèle, par identifiant de section : ils font autorité sur
// la copie qu'un porteur a enregistrée, si bien qu'un emplacement corrigé en back-office
// (une question changée, un texte verrouillé reformulé) atteint aussi les vitrines
// personnalisées.
export const getTemplateBlockSlots = (template) => {
  if (!template || !Array.isArray(template.sections)) {
    return {};
  }
  return template.sections.reduce((accumulator, entry) => {
    if (entry.kind === 'block') {
      accumulator[buildTemplateBlockSectionId(template.id, entry.id)] = entry.slots;
    }
    return accumulator;
  }, {});
};

// Emplacements d'une section de la vitrine : ceux du modèle quand le bloc en vient, sinon
// ceux qu'elle a gardés en copie, sinon l'ancien lien `sourceQuestionId` ; un bloc ajouté
// par le porteur n'en a aucun.
export const resolveSectionSlots = (section, templateBlockSlots = {}) => {
  if (!section || typeof section !== 'object') {
    return null;
  }
  const fromTemplate = section.id ? templateBlockSlots?.[section.id] : null;
  if (fromTemplate) {
    return normalizeBlockSlots(section.type, fromTemplate);
  }
  if (section.slots && typeof section.slots === 'object' && Object.keys(section.slots).length > 0) {
    return normalizeBlockSlots(section.type, section.slots);
  }
  if (isLinkedBlockLinkable(section)) {
    return normalizeBlockSlots(section.type, {
      description: { source: 'question', questionId: normalizeString(section.sourceQuestionId) }
    });
  }
  return null;
};

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
 * du référentiel rend son champ à sa question d'origine plutôt que de le vider. Un champ
 * dont le modèle retire l'élément n'est pas relié : il n'apparaît nulle part.
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
      const part = PART_BY_FIELD_ID[fieldId];
      if (part && Array.isArray(entry.hiddenParts) && entry.hiddenParts.includes(part)) {
        return;
      }
      const question = findQuestion(questions, questionId);
      if (isQuestionCompatibleWithSourceKind(question, getShowcaseSourceFieldKind(fieldId))) {
        accumulator[fieldId] = questionId;
      }
    });
    return accumulator;
  }, {});
};

/**
 * Questions lues par les emplacements des blocs, chacune rangée sous une clé propre
 * (buildLinkedBlockFieldId) : la vitrine les affiche et les fait modifier comme ses
 * propres champs, et la publication réécrit la question. `excludedIds` : questions que la
 * vitrine édite déjà sous leur propre identifiant (nom du projet…), lues directement.
 */
export const resolveLinkedBlockFieldSources = (sections, questions, { templateBlockSlots = {}, excludedIds = [] } = {}) => {
  const excluded = new Set(excludedIds);
  return (Array.isArray(sections) ? sections : []).reduce((accumulator, section) => {
    const slots = resolveSectionSlots(section, templateBlockSlots);
    collectSlotQuestionIds(slots).forEach((questionId) => {
      if (excluded.has(questionId)) {
        return;
      }
      if (isQuestionUsableInSlot(findQuestion(questions, questionId))) {
        accumulator[buildLinkedBlockFieldId(questionId)] = questionId;
      }
    });
    return accumulator;
  }, {});
};

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

// --- Sections intégrées comme préréglages ------------------------------------------------

// Chaque section intégrée a un bloc équivalent dans le catalogue : mêmes données, mêmes
// titres, mais des emplacements que le modèle règle un par un. `lost` nomme ce que le bloc
// ne sait pas reprendre (calculs propres à la section), pour que le back-office le dise
// avant la conversion.
const BUILTIN_BLOCK_PRESETS = {
  hero: {
    type: 'cover',
    eyebrow: { slot: 'accent', key: 'projectShowcase.heroEyebrow' },
    fields: { title: 'projectName', subtitle: 'projectSlogan', items: 'targetAudience' },
    parts: { subtitle: 'projectSlogan', items: 'heroHighlights' },
    lost: ['heroCta', 'heroContext']
  },
  problem: {
    type: 'story',
    eyebrow: { slot: 'accent', key: 'projectShowcase.sectionOptions.problem' },
    headline: { slot: 'title', key: 'projectShowcase.problemHeadline' },
    fields: { description: 'problemPainPoints' }
  },
  solution: {
    type: 'highlight',
    eyebrow: { slot: 'accent', key: 'projectShowcase.solutionEyebrow' },
    headline: { slot: 'title', key: 'projectShowcase.solutionHeadline' },
    fields: { description: 'solutionDescription' }
  },
  benefits: {
    type: 'stack',
    eyebrow: { slot: 'subtitle', key: 'projectShowcase.solutionBenefitsEyebrow' },
    headline: { slot: 'title', key: 'projectShowcase.solutionBenefitsHeadline' },
    fields: { items: 'solutionBenefits' }
  },
  objectives: {
    type: 'checklist',
    eyebrow: { slot: 'accent', key: 'projectShowcase.sectionOptions.objectives' },
    headline: { slot: 'title', key: 'projectShowcase.objectivesHeadline' },
    fields: { items: 'innovationProcess' },
    parts: { items: 'innovationProcess' },
    lost: ['impactFigure']
  },
  indicators: {
    type: 'columns',
    eyebrow: { slot: 'subtitle', key: 'projectShowcase.valueIndicatorsEyebrow' },
    headline: { slot: 'title', key: 'projectShowcase.valueIndicatorsHeadline' },
    fields: { columns: 'visionStatement' }
  },
  team: {
    type: 'team',
    eyebrow: { slot: 'accent', key: 'projectShowcase.sectionOptions.team' },
    headline: { slot: 'title', key: 'projectShowcase.teamHeadline' },
    fields: { subtitle: 'teamLead', description: 'teamLeadTeam', items: 'teamCoreMembers' },
    parts: { subtitle: 'teamLead', description: 'teamLeadTeam', items: 'teamCoreMembers' }
  },
  timeline: {
    type: 'steps',
    eyebrow: { slot: 'accent', key: 'projectShowcase.sectionOptions.timeline' },
    headline: { slot: 'title', key: 'projectShowcase.roadmapHeadline' },
    fields: { items: 'roadmapMilestones' },
    parts: { items: 'roadmapMilestones' },
    lost: ['launchCountdown', 'complianceDelays', 'budget']
  }
};

export const getBuiltInBlockPreset = (sectionId) => {
  const preset = BUILTIN_BLOCK_PRESETS[sectionId];
  return preset ? { type: preset.type, lost: preset.lost || [] } : null;
};

/**
 * Bloc du catalogue qui reprend une section intégrée du modèle : ses titres (ceux du modèle,
 * sinon ceux de l'application, dans toutes les langues, via `translate(key)` qui renvoie un
 * objet {en, fr, de, es}) en texte fixe, ses champs (ou les questions que le modèle leur a
 * substituées) en réponses, ses éléments retirés en emplacements masqués, sa condition
 * d'affichage telle quelle.
 */
export const convertBuiltInToBlock = (entry, existingBlockIds = [], translate = () => '') => {
  const preset = entry && BUILTIN_BLOCK_PRESETS[entry.id];
  if (!preset) {
    return null;
  }
  const hiddenParts = Array.isArray(entry.hiddenParts) ? entry.hiddenParts : [];
  const slots = {};
  const lockedLabel = (descriptor, labelKey) => {
    if (!descriptor) {
      return;
    }
    const custom = entry.labels?.[labelKey];
    slots[descriptor.slot] = { state: 'locked', source: 'text', text: custom || translate(descriptor.key) };
  };
  lockedLabel(preset.eyebrow, 'eyebrow');
  lockedLabel(preset.headline, 'headline');
  Object.entries(preset.fields).forEach(([slotId, fieldId]) => {
    const part = preset.parts?.[slotId];
    const questionId = entry.fieldSources?.[fieldId] || fieldId;
    slots[slotId] = {
      state: part && hiddenParts.includes(part) ? 'hidden' : 'used',
      source: 'question',
      questionId,
      text: ''
    };
  });
  const usedIds = new Set(existingBlockIds);
  let id = `from-${entry.id}`;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `from-${entry.id}-${counter}`;
    counter += 1;
  }
  return {
    kind: 'block',
    id,
    type: preset.type,
    slots: normalizeBlockSlots(preset.type, slots),
    ...(entry.displayCondition ? { displayCondition: entry.displayCondition } : {})
  };
};

// --- Aperçu du back-office -------------------------------------------------------------

const PREVIEW_TEXT_BY_LANGUAGE = {
  fr: 'Exemple de réponse',
  en: 'Sample answer',
  de: 'Beispielantwort',
  es: 'Respuesta de ejemplo'
};

const buildPreviewAnswer = (question, language) => {
  const type = question.type || 'text';
  const optionValues = (Array.isArray(question.options) ? question.options : [])
    .map((option) => (option && typeof option === 'object' ? option.value : option))
    .filter((value) => value !== undefined && value !== null && value !== '');
  if (type === 'number') {
    return '25000';
  }
  if (type === 'choice') {
    return optionValues[0];
  }
  if (type === 'multi_choice') {
    return optionValues.slice(0, 2);
  }
  if (type === 'date') {
    const date = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 15));
    return date.toISOString().slice(0, 10);
  }
  const label = resolveLocalizedText(question.question, language).trim();
  return `${PREVIEW_TEXT_BY_LANGUAGE[language] || PREVIEW_TEXT_BY_LANGUAGE.fr}${label ? ` — ${label}` : ''}`;
};

/**
 * Réponses fictives pour prévisualiser un modèle : les réponses d'exemple fournies, puis une
 * réponse inventée, selon son type, pour chaque question que le modèle lit encore sans
 * réponse. Rien de tout cela n'est enregistré : c'est un jeu de données d'aperçu.
 */
export const buildShowcaseTemplatePreviewAnswers = (template, questions, baseAnswers = {}, language = 'fr') => {
  const answers = { ...(baseAnswers && typeof baseAnswers === 'object' ? baseAnswers : {}) };
  if (!template || !Array.isArray(template.sections)) {
    return answers;
  }
  const questionIds = new Set();
  template.sections.forEach((entry) => {
    if (entry.kind === 'block') {
      collectSlotQuestionIds(entry.slots).forEach((id) => questionIds.add(id));
    } else if (entry.fieldSources) {
      Object.values(entry.fieldSources).forEach((id) => questionIds.add(id));
    }
  });
  questionIds.forEach((questionId) => {
    const question = findQuestion(questions, questionId);
    if (!question || !isEmptyAnswer(answers[questionId])) {
      return;
    }
    const value = buildPreviewAnswer(question, language);
    if (!isEmptyAnswer(value)) {
      answers[questionId] = value;
    }
  });
  return answers;
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
  return { kind: 'block', id: `block-${counter}`, type: 'highlight', slots: normalizeBlockSlots('highlight', {}) };
};
