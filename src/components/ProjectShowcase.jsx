import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { ShowcaseSignatureFx } from './ShowcaseSignatureFx.jsx';
import {
  Edit,
  Plus,
  Trash2
} from './icons.js';
import { SectionFrame } from './showcase/SectionFrame.jsx';
import { SectionInserter } from './showcase/SectionInserter.jsx';
import { ShowcaseEditorBar } from './showcase/ShowcaseEditorBar.jsx';
import { ShowcaseOutline } from './showcase/ShowcaseOutline.jsx';
import { InlineRichText } from './showcase/InlineRichText.jsx';
import {
  SHOWCASE_SECTION_IDS,
  buildPreviewAnswers,
  canRedoHistory,
  canUndoHistory,
  clearShowcaseDraft,
  createHistory,
  loadShowcaseDraft,
  moveArrayItem,
  normalizeSectionOrder,
  pushHistory,
  redoHistory,
  saveShowcaseDraft,
  undoHistory
} from '../utils/showcaseEditor.js';
import {
  buildNumberUnitAnswerId,
  formatAnswer,
  getNumberUnitOptions,
  getQuestionOptionEntries,
  normalizeQuestionOptions
} from '../utils/questions.js';
import { renderTextWithLinks } from '../utils/linkify.js';
import { splitRichTextIntoBlocks } from '../utils/richText.js';
import { hasChronologicalDate, sortMilestonesChronologically } from '../utils/showcaseMilestones.js';
import { initialShowcaseThemes } from '../data/showcaseThemes.js';
import {
  THEME_ACCENT_FAMILY_ID,
  buildAccentFamilies,
  normalizeAccentFamilyId,
  resolveAccentFamily
} from '../utils/showcaseAccents.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import { resolveThemeFromActivation } from '../utils/showcase.js';
import { createAttachmentFromFile, getFileExtension } from '../utils/documentStore.js';
import { IMAGE_DOCUMENT_TYPES, resolveDocumentEmbedSrc } from '../utils/documentEmbed.js';
import { getOrigin, getWebUrl, isSharePointMode } from '../config/sharepointConfig.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';

const SHOWCASE_SECTION_OPTIONS = SHOWCASE_SECTION_IDS.map(id => ({ id }));

const LIGHT_VISIBILITY_OPTIONS = [
  ...SHOWCASE_SECTION_OPTIONS,
  { id: 'budget' }
];

const getSectionOptionLabel = (t, sectionId) => t(`projectShowcase.sectionOptions.${sectionId}`);

const MAX_CUSTOM_SECTION_COLUMNS = 4;

const SECTION_TEMPLATES = [
  { id: 'highlight' },
  { id: 'figure' },
  { id: 'columns' },
  { id: 'document-viewer' },
  { id: 'story' },
  { id: 'checklist' },
  { id: 'stack' }
];

const getTemplateMeta = (t, templateId) => {
  switch (templateId) {
    case 'highlight':
      return {
        name: t('projectShowcase.templates.highlight.name'),
        description: t('projectShowcase.templates.highlight.description'),
        placeholder: {
          title: t('projectShowcase.templates.highlight.placeholderTitle'),
          description: t('projectShowcase.templates.highlight.placeholderDescription'),
          badge: t('projectShowcase.templates.highlight.placeholderBadge')
        }
      };
    case 'figure':
      return {
        name: t('projectShowcase.templates.figure.name'),
        description: t('projectShowcase.templates.figure.description'),
        placeholder: {
          title: t('projectShowcase.templates.figure.placeholderTitle'),
          description: t('projectShowcase.templates.figure.placeholderDescription'),
          badge: t('projectShowcase.templates.figure.placeholderBadge')
        }
      };
    case 'columns':
      return {
        name: t('projectShowcase.templates.columns.name'),
        description: t('projectShowcase.templates.columns.description'),
        placeholder: {
          title: t('projectShowcase.templates.columns.placeholderTitle'),
          subtitle: t('projectShowcase.templates.columns.placeholderSubtitle'),
          columns: [
            t('projectShowcase.templates.columns.placeholderColumn1'),
            t('projectShowcase.templates.columns.placeholderColumn2'),
            t('projectShowcase.templates.columns.placeholderColumn3')
          ],
          columnCount: 3
        }
      };
    case 'document-viewer':
      return {
        name: t('projectShowcase.templates.documentViewer.name'),
        description: t('projectShowcase.templates.documentViewer.description'),
        placeholder: {
          title: t('projectShowcase.templates.documentViewer.placeholderTitle'),
          subtitle: t('projectShowcase.templates.documentViewer.placeholderSubtitle'),
          description: t('projectShowcase.templates.documentViewer.placeholderDescription'),
          accent: 'SharePoint'
        }
      };
    case 'story':
      return {
        name: t('projectShowcase.templates.story.name'),
        description: t('projectShowcase.templates.story.description'),
        placeholder: {
          title: t('projectShowcase.templates.story.placeholderTitle'),
          description: t('projectShowcase.templates.story.placeholderDescription')
        }
      };
    case 'checklist':
      return {
        name: t('projectShowcase.templates.checklist.name'),
        description: t('projectShowcase.templates.checklist.description'),
        placeholder: {
          title: t('projectShowcase.templates.checklist.placeholderTitle'),
          description: t('projectShowcase.templates.checklist.placeholderDescription'),
          items: [
            t('projectShowcase.templates.checklist.placeholderItem1'),
            t('projectShowcase.templates.checklist.placeholderItem2'),
            t('projectShowcase.templates.checklist.placeholderItem3')
          ]
        }
      };
    case 'stack':
    default:
      return {
        name: t('projectShowcase.templates.stack.name'),
        description: t('projectShowcase.templates.stack.description'),
        placeholder: {
          title: t('projectShowcase.templates.stack.placeholderTitle'),
          subtitle: t('projectShowcase.templates.stack.placeholderSubtitle'),
          items: [
            t('projectShowcase.templates.stack.placeholderItem1'),
            t('projectShowcase.templates.stack.placeholderItem2'),
            t('projectShowcase.templates.stack.placeholderItem3')
          ]
        }
      };
  }
};

// Les pastilles ne portent pas de nom de couleur : les teintes viennent du thème et deux
// d'entre elles peuvent parfaitement être deux nuances d'une même couleur, qu'un nom rendrait
// indiscernables. Le rang sert de libellé, et c'est aussi l'identifiant stocké.
const getColorFamilyLabel = (t, family, index) =>
  family.id === THEME_ACCENT_FAMILY_ID
    ? t('projectShowcase.themeColorLabel')
    : t('projectShowcase.colorSwatchLabel', { index });

// Seules les sections intégrées ont un accent configurable ici ; les blocs personnalisés
// gardent leur propre champ `accentFamily`. Une valeur « thème » n'est pas stockée : c'est
// le défaut, et l'omettre garde la vitrine alignée si la palette de la marque change.
const ACCENT_CONFIGURABLE_SECTIONS = ['problem', 'solution', 'benefits', 'objectives', 'indicators', 'team'];

// Chaque section scindée hérite de la couleur du bloc dont elle est issue : sans ce repli,
// une vitrine déjà colorée repasserait à l'accent du thème sur la moitié nouvellement créée.
const ACCENT_LEGACY_SOURCES = {
  benefits: ['solution'],
  objectives: ['innovation'],
  indicators: ['innovation-metrics', 'innovation']
};

const ACCENT_SECTION_GROUPS = ACCENT_CONFIGURABLE_SECTIONS.reduce((acc, sectionId) => {
  acc[sectionId] = [sectionId];
  return acc;
}, {});

const normalizeSectionAccents = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalized = {};
  ACCENT_CONFIGURABLE_SECTIONS.forEach((sectionId) => {
    const candidates = [sectionId, ...(ACCENT_LEGACY_SOURCES[sectionId] || [])];
    const storedKey = candidates.find((key) => value[key] !== undefined && value[key] !== null);
    const familyId = normalizeAccentFamilyId(storedKey ? value[storedKey] : undefined);
    // « thème » est le défaut : le stocker rendrait la section sourde à un changement de palette.
    if (familyId && familyId !== THEME_ACCENT_FAMILY_ID) {
      normalized[sectionId] = familyId;
    }
  });
  return normalized;
};

const SECTION_TEMPLATE_CONFIG = {
  highlight: {
    showSubtitle: false,
    showAccent: false,
    showBadge: true,
    showDescription: true,
    showColumns: false,
    showDocument: false,
    showItems: false
  },
  'figure': {
    showSubtitle: false,
    showAccent: false,
    showBadge: true,
    showDescription: true,
    showColumns: false,
    showDocument: false,
    showItems: false
  },
  columns: {
    showSubtitle: true,
    showAccent: false,
    showBadge: false,
    showDescription: false,
    showColumns: true,
    showDocument: false,
    showItems: false
  },
  'document-viewer': {
    showSubtitle: true,
    showAccent: true,
    showBadge: false,
    showDescription: true,
    showColumns: false,
    showDocument: true,
    showItems: false
  },
  story: {
    showSubtitle: false,
    showAccent: false,
    showBadge: false,
    showDescription: true,
    showColumns: false,
    showDocument: false,
    showItems: false
  },
  checklist: {
    showSubtitle: false,
    showAccent: false,
    showBadge: false,
    showDescription: true,
    showColumns: false,
    showDocument: false,
    showItems: true
  },
  stack: {
    showSubtitle: true,
    showAccent: false,
    showBadge: false,
    showDescription: false,
    showColumns: false,
    showDocument: false,
    showItems: true
  }
};

const buildLightVisibilityIds = (sectionIds = []) => {
  const merged = [...sectionIds, ...LIGHT_VISIBILITY_OPTIONS.map(option => option.id)];
  return Array.from(new Set(merged));
};

const buildDefaultLightSectionSelection = (sectionIds = LIGHT_VISIBILITY_OPTIONS.map(section => section.id)) =>
  sectionIds.reduce((acc, sectionId) => {
    acc[sectionId] = true;
    return acc;
  }, {});

const DOCUMENT_VIEWER_TYPES = ['pdf', 'jpg', 'png', 'pptx'];

const resolveCustomSectionColumnCount = (value, columns = []) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(MAX_CUSTOM_SECTION_COLUMNS, parsed);
  }
  if (Array.isArray(columns) && columns.length > 0) {
    return Math.min(MAX_CUSTOM_SECTION_COLUMNS, columns.length);
  }
  return 1;
};

// Le nombre de blocs et le nombre de colonnes sont deux réglages distincts : la grille
// affiche N colonnes et accueille autant de blocs que l'auteur en ajoute, comme les items
// des autres gabarits. Aligner la longueur du tableau sur `columnCount` (ce que faisait
// cette fonction) rendait tout quatrième bloc impossible à créer.
const normalizeCustomSectionColumns = (columns) =>
  (Array.isArray(columns)
    ? columns.map(column => (typeof column === 'string' ? column.trim() : ''))
    : []);

// Titre lisible d'une section personnalisée : son champ « titre » est du texte riche,
// inutilisable tel quel dans le plan, une infobulle ou un libellé accessible.
const toPlainText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

// Sous cette largeur, l'inspecteur n'est plus une colonne mais une feuille basse posée
// sur le canvas : la déployer d'office masquerait la vitrine que l'utilisateur vient
// d'ouvrir pour la modifier. Doit rester aligné sur la bascule de showcase-editor.css.
// Fabrique unique d'une section à partir d'un gabarit. Elle sert à trois endroits qui
// doivent impérativement produire le même bloc : la vignette du sélecteur, l'aperçu
// fantôme au survol, et la section réellement insérée. Deux implémentations séparées
// finiraient par diverger — et le fantôme montrerait autre chose que ce qu'on obtient.
const buildSectionFromTemplate = (t, templateId, id) => {
  const template = SECTION_TEMPLATES.find(entry => entry.id === templateId) || SECTION_TEMPLATES[0];
  const meta = getTemplateMeta(t, template.id);
  const placeholder = meta.placeholder || {};
  const columnCount = resolveCustomSectionColumnCount(placeholder.columnCount, placeholder.columns);

  return {
    id,
    type: template.id,
    title: placeholder.title || meta.name || '',
    subtitle: placeholder.subtitle || '',
    description: placeholder.description || '',
    accent: placeholder.badge || placeholder.accent || '',
    accentFamily: THEME_ACCENT_FAMILY_ID,
    // Le gabarit « chiffre » n'a aucun sens sans valeur : on en pose une d'exemple,
    // remplaçable directement au clavier dans le canvas.
    figure: template.id === 'figure' ? placeholder.figure || '87 %' : '',
    documentUrl: '',
    documentType: 'pdf',
    items: Array.isArray(placeholder.items) ? [...placeholder.items] : [],
    columnCount,
    columns: normalizeCustomSectionColumns(placeholder.columns)
  };
};

const SIDE_INSPECTOR_MEDIA_QUERY = '(min-width: 1180px)';

const prefersSideInspector = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(SIDE_INSPECTOR_MEDIA_QUERY).matches;
};

const resolveTemplateConfig = (templateId) =>
  SECTION_TEMPLATE_CONFIG[templateId] || SECTION_TEMPLATE_CONFIG.highlight;

const sanitizeCustomSections = (rawSections) => {
  if (!Array.isArray(rawSections)) {
    return [];
  }

  return rawSections
    .map((section, index) => {
      if (!section || typeof section !== 'object') {
        return null;
      }

      const id = typeof section.id === 'string' && section.id.trim().length > 0
        ? section.id.trim()
        : `custom-section-${index}`;

      const title = typeof section.title === 'string' ? section.title.trim() : '';
      const subtitle = typeof section.subtitle === 'string' ? section.subtitle.trim() : '';
      const description = typeof section.description === 'string' ? section.description.trim() : '';
      const accent = typeof section.accent === 'string' ? section.accent.trim() : '';
      const documentUrl = typeof section.documentUrl === 'string' ? section.documentUrl.trim() : '';
      const documentType = typeof section.documentType === 'string' ? section.documentType.trim() : '';
      const figure = typeof section.figure === 'string' ? section.figure.trim() : '';
      const accentFamily = normalizeAccentFamilyId(section.accentFamily) || THEME_ACCENT_FAMILY_ID;
      const items = Array.isArray(section.items)
        ? section.items.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [];
      const rawType = typeof section.type === 'string' ? section.type : SECTION_TEMPLATES[0].id;
      // ancien identifiant du gabarit « Chiffre en avant », conservé dans les projets déjà enregistrés
      const type = rawType === 'aurora-section__inner' ? 'figure' : rawType;
      const columnCount = resolveCustomSectionColumnCount(section.columnCount, section.columns);
      const columns = normalizeCustomSectionColumns(section.columns).filter(Boolean);
      const hasColumnContent = columns.length > 0;

      if (!title && !subtitle && !description && !documentUrl && !figure && items.length === 0 && !hasColumnContent) {
        return null;
      }

      return {
        id,
        type,
        title,
        subtitle,
        description,
        accent,
        accentFamily,
        figure,
        documentUrl,
        documentType,
        items,
        columnCount,
        columns
      };
    })
    .filter(Boolean);
};

const areCustomSectionsEqual = (previous, next) => {
  if (!Array.isArray(previous) && !Array.isArray(next)) {
    return true;
  }

  if (!Array.isArray(previous) || !Array.isArray(next) || previous.length !== next.length) {
    return false;
  }

  return previous.every((entry, index) => {
    const candidate = next[index];
    if (!candidate) {
      return false;
    }

    return entry.id === candidate.id
      && entry.title === candidate.title
      && entry.subtitle === candidate.subtitle
      && entry.description === candidate.description
      && entry.accent === candidate.accent
      && entry.accentFamily === candidate.accentFamily
      && entry.figure === candidate.figure
      && entry.documentUrl === candidate.documentUrl
      && entry.documentType === candidate.documentType
      && JSON.stringify(entry.items || []) === JSON.stringify(candidate.items || [])
      && entry.columnCount === candidate.columnCount
      && JSON.stringify(entry.columns || []) === JSON.stringify(candidate.columns || [])
      && entry.type === candidate.type;
  });
};

// Différence entre le brouillon en cours et ce qui est réellement enregistré. Un seul
// calcul sert à deux usages : publier, et savoir s'il reste quelque chose à publier —
// les faire diverger, c'est afficher « tout est publié » sur des modifications perdues.
const computeShowcaseUpdates = ({
  answers,
  editableFields,
  draftValues,
  customSections,
  sectionOrder,
  sectionAccents
}) => {
  const updates = {};

  editableFields.forEach(field => {
    const { id } = field;
    if (!id) {
      return;
    }

    const type = field.question?.type || field.fallbackType || 'text';
    const emptyValue = type === 'multi_choice' || type === 'milestone_list' ? [] : '';
    const rawPreviousValue = getRawAnswer(answers, id);
    const previousValue =
      rawPreviousValue === undefined || rawPreviousValue === null
        ? emptyValue
        : formatValueForDraft(type, rawPreviousValue);
    const nextValue = draftValues[id] !== undefined ? draftValues[id] : emptyValue;

    if (areFieldValuesEqual(type, previousValue, nextValue)) {
      return;
    }

    updates[id] = formatValueForUpdate(type, nextValue);
  });

  const previousCustomSections = sanitizeCustomSections(answers?.customShowcaseSections);
  const nextCustomSections = sanitizeCustomSections(customSections);
  const previousSectionOrder = normalizeSectionOrder(answers?.showcaseSectionOrder, previousCustomSections);
  const nextSectionOrder = normalizeSectionOrder(sectionOrder, nextCustomSections);

  if (!areCustomSectionsEqual(previousCustomSections, nextCustomSections)) {
    updates.customShowcaseSections = nextCustomSections;
  }

  if (previousSectionOrder.join('|') !== nextSectionOrder.join('|')) {
    updates.showcaseSectionOrder = nextSectionOrder;
  }

  const previousSectionAccents = normalizeSectionAccents(answers?.showcaseSectionAccents);
  const nextSectionAccents = normalizeSectionAccents(sectionAccents);
  if (JSON.stringify(previousSectionAccents) !== JSON.stringify(nextSectionAccents)) {
    updates.showcaseSectionAccents = nextSectionAccents;
  }

  return updates;
};

const findQuestionById = (questions, id) => {
  if (!Array.isArray(questions)) {
    return null;
  }

  return questions.find(question => question?.id === id) || null;
};

const getFormattedAnswer = (questions, answers, id, missingInfoLabel, language) => {
  const question = findQuestionById(questions, id);
  if (!question) {
    return '';
  }

  const formatted = formatAnswer(question, answers?.[id], language);

  if (typeof formatted === 'string') {
    const trimmed = formatted.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  } else if (formatted) {
    return formatted;
  }

  return question.required ? missingInfoLabel : '';
};

// Pour q27 (« Dans quels pays ce projet sera-t-il déployé ? »), la chip vitrine ne doit
// montrer que les pays concrets — pas le libellé du regroupement parent (« Pays liés à des
// filiales hors France ») ni « Autre » : on descend donc directement aux sous-pays cochés et
// au texte libre « Autre » plutôt que de réutiliser formatAnswer(), qui garde le libellé parent.
const formatDeploymentCountries = (question, answer, language) => {
  if (!question || answer === null || answer === undefined) {
    return '';
  }

  const labelByValue = new Map(
    getQuestionOptionEntries(question, { language }).map((entry) => [entry.value, entry.label])
  );
  const resolveLabel = (value) => labelByValue.get(value == null ? '' : String(value)) || '';

  if (Array.isArray(answer)) {
    return answer.map(resolveLabel).filter(Boolean).join(', ');
  }

  if (typeof answer !== 'object') {
    return '';
  }

  const values = Array.isArray(answer.values) ? answer.values : [];
  const children = answer.children && typeof answer.children === 'object' ? answer.children : {};
  const otherText = typeof answer.otherText === 'string' ? answer.otherText.trim() : '';
  const otherOptionValue = normalizeQuestionOptions(question, { language }).find((option) => option.isOther)?.value || '';

  const parts = [];
  values.forEach((value) => {
    const optionValue = value == null ? '' : String(value);

    if (otherOptionValue && optionValue === otherOptionValue) {
      if (otherText) {
        parts.push(otherText);
      }
      return;
    }

    const childValues = Array.isArray(children[optionValue]) ? children[optionValue] : [];
    if (childValues.length > 0) {
      childValues.forEach((childValue) => {
        const childLabel = resolveLabel(childValue);
        if (childLabel) {
          parts.push(childLabel);
        }
      });
      return;
    }

    const label = resolveLabel(optionValue);
    if (label) {
      parts.push(label);
    }
  });

  return parts.join(', ');
};

// Contrairement aux autres chips du hero, celle-ci ne doit jamais afficher le libellé
// « information manquante » : tant qu'aucun pays n'a été renseigné, la chip reste absente
// plutôt que d'occuper de la place avec un texte d'espace réservé.
const getFormattedDeploymentCountries = (questions, answers, id, language) => {
  const question = findQuestionById(questions, id);
  if (!question) {
    return '';
  }

  return formatDeploymentCountries(question, answers?.[id], language).trim();
};

const getRawAnswer = (answers, id) => {
  if (!answers) {
    return undefined;
  }

  return answers[id];
};

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const formatNumberFR = (value, options = {}, language) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return numericValue.toLocaleString(getLocaleTag(language), options);
};

const formatWeeksValue = (weeks, language, t) => {
  if (weeks === undefined || weeks === null) {
    return '';
  }

  const rounded = Math.round(weeks * 10) / 10;
  const hasDecimal = Math.abs(rounded - Math.round(rounded)) > 0.0001;

  return `${formatNumberFR(
    rounded,
    { minimumFractionDigits: hasDecimal ? 1 : 0, maximumFractionDigits: hasDecimal ? 1 : 0 },
    language
  )} ${t('projectShowcase.weeksAbbrev')}`;
};

const formatDaysValue = (days, language, t) => {
  if (days === undefined || days === null) {
    return '';
  }

  return `${formatNumberFR(Math.round(days), {}, language)} ${t('projectShowcase.daysAbbrev')}`;
};

const resolveQuestionTitle = (questions, id, language) => {
  if (!id) {
    return '';
  }

  const question = findQuestionById(questions, id);
  if (!question) {
    return id;
  }

  return resolveLocalizedText(question.question, language) || id;
};

const formatTimingRequirementSummary = (questions, constraint, language, t) => {
  if (!constraint || typeof constraint !== 'object') {
    return '';
  }

  const startLabel = resolveQuestionTitle(questions, constraint.startQuestion, language);
  const endLabel = resolveQuestionTitle(questions, constraint.endQuestion, language);

  const requirementParts = [];
  if (typeof constraint.minimumWeeks === 'number') {
    requirementParts.push(t('synthesisReport.weeksValueTemplate', { value: formatNumberFR(constraint.minimumWeeks, {}, language) }));
  }
  if (typeof constraint.minimumDays === 'number') {
    requirementParts.push(t('synthesisReport.daysValueTemplate', { value: formatNumberFR(constraint.minimumDays, {}, language) }));
  }

  const hasRequirement = requirementParts.length > 0;
  const hasStart = Boolean(startLabel);
  const hasEnd = Boolean(endLabel);

  if (!hasRequirement && !hasStart && !hasEnd) {
    return '';
  }

  if (hasRequirement && hasStart && hasEnd) {
    return t('synthesisReport.respectMinimumBetweenTemplate', {
      requirement: requirementParts.join(' / '),
      start: startLabel,
      end: endLabel
    });
  }

  if (hasRequirement && hasStart && !hasEnd) {
    return t('synthesisReport.respectMinimumAfterTemplate', { requirement: requirementParts.join(' / '), start: startLabel });
  }

  if (hasRequirement && !hasStart && hasEnd) {
    return t('synthesisReport.respectMinimumBeforeTemplate', { requirement: requirementParts.join(' / '), end: endLabel });
  }

  if (hasRequirement) {
    return t('synthesisReport.respectMinimumGenericTemplate', { requirement: requirementParts.join(' / ') });
  }

  if (hasStart && hasEnd) {
    return t('synthesisReport.monitorDelayBetweenTemplate', { start: startLabel, end: endLabel });
  }

  const singleLabel = startLabel || endLabel;
  if (singleLabel) {
    return t('synthesisReport.monitorDateTemplate', { value: singleLabel });
  }

  return '';
};

const formatVigilanceStatusMessage = (alert, language, t) => {
  if (!alert || typeof alert !== 'object') {
    return '';
  }

  if (alert.status === 'unknown') {
    return t('projectShowcase.missingDatesMessage');
  }

  if (alert.status === 'breach') {
    const diffWeeks = alert.diff && typeof alert.diff.diffInWeeks === 'number'
      ? alert.diff.diffInWeeks
      : null;
    const diffDays = alert.diff && typeof alert.diff.diffInDays === 'number'
      ? alert.diff.diffInDays
      : null;

    const requiredWeeks = typeof alert.requiredWeeks === 'number' ? alert.requiredWeeks : null;
    const requiredDays = typeof alert.requiredDays === 'number' ? alert.requiredDays : null;

    const requiredParts = [];
    if (requiredWeeks !== null) {
      requiredParts.push(t('synthesisReport.weeksValueTemplate', { value: formatNumberFR(requiredWeeks, {}, language) }));
    }
    if (requiredDays !== null) {
      requiredParts.push(t('synthesisReport.daysValueTemplate', { value: formatNumberFR(requiredDays, {}, language) }));
    }

    const missingParts = [];
    if (requiredWeeks !== null && diffWeeks !== null) {
      const missingWeeks = requiredWeeks - diffWeeks;
      if (missingWeeks > 0.0001) {
        missingParts.push(formatWeeksValue(missingWeeks, language, t));
      }
    }
    if (requiredDays !== null && diffDays !== null) {
      const missingDays = requiredDays - diffDays;
      if (missingDays > 0.0001) {
        missingParts.push(formatDaysValue(missingDays, language, t));
      }
    }

    if (missingParts.length > 0 && requiredParts.length > 0) {
      return t('projectShowcase.gapToCloseWithMinimumTemplate', {
        missing: missingParts.join(' / '),
        required: requiredParts.join(' / ')
      });
    }

    if (missingParts.length > 0) {
      return t('projectShowcase.gapToCloseTemplate', { missing: missingParts.join(' / ') });
    }

    const diffParts = [];
    if (diffWeeks !== null) {
      diffParts.push(formatWeeksValue(diffWeeks, language, t));
    }
    if (diffDays !== null) {
      diffParts.push(formatDaysValue(diffDays, language, t));
    }

    if (diffParts.length === 0 && requiredParts.length === 0) {
      return t('projectShowcase.insufficientDelayGeneric');
    }

    if (diffParts.length === 0) {
      return t('projectShowcase.insufficientDelayWithMinimumTemplate', { required: requiredParts.join(' / ') });
    }

    const diffLabel = diffParts.join(' / ');
    if (requiredParts.length === 0) {
      return t('projectShowcase.observedDelayAdjustTemplate', { diff: diffLabel });
    }

    return t('projectShowcase.observedDelayWithMinimumAdjustTemplate', { diff: diffLabel, required: requiredParts.join(' / ') });
  }

  if (alert.status === 'satisfied' && alert.diff) {
    const parts = [];
    if (typeof alert.diff.diffInWeeks === 'number') {
      parts.push(formatWeeksValue(alert.diff.diffInWeeks, language, t));
    }
    if (typeof alert.diff.diffInDays === 'number') {
      parts.push(formatDaysValue(alert.diff.diffInDays, language, t));
    }

    const diffLabel = parts.length > 0 ? parts.join(' / ') : '';
    if (diffLabel) {
      return t('projectShowcase.currentDelayMaintainTemplate', { diff: diffLabel });
    }

    return t('projectShowcase.currentDelayCompliantMessage');
  }

  return '';
};

const buildVigilanceAlerts = (analysis, questions, resolveTeamLabel, language, t) => {
  const rawAlerts = Array.isArray(analysis?.timeline?.vigilance)
    ? analysis.timeline.vigilance
    : [];

  return rawAlerts
    .filter(alert => alert && typeof alert === 'object')
    .map((alert, index) => {
      const title = alert.riskDescription && alert.riskDescription.trim().length > 0
        ? alert.riskDescription.trim()
        : alert.ruleName;

      const normalizedRuleId = alert?.ruleId != null
        ? (() => {
            const value = String(alert.ruleId).trim();
            return value.length > 0 ? value : null;
          })()
        : null;
      const normalizedRiskId = alert?.riskId != null
        ? (() => {
            const value = String(alert.riskId).trim();
            return value.length > 0 ? value : null;
          })()
        : null;
      const normalizedRiskDescription = typeof alert?.riskDescription === 'string'
        ? alert.riskDescription.trim()
        : '';

      return {
        id: alert.id || `${alert.ruleId || 'rule'}-${alert.riskId || index}`,
        ruleId: normalizedRuleId,
        ruleName: alert.ruleName,
        riskId: normalizedRiskId,
        riskDescription: normalizedRiskDescription,
        title,
        priority: alert.priority || '',
        requirementSummary: formatTimingRequirementSummary(questions, alert.timingConstraint, language, t),
        statusMessage: formatVigilanceStatusMessage(alert, language, t),
        status: alert.status || 'unknown',
        teamId: alert.teamId || '',
        teamLabel: typeof resolveTeamLabel === 'function'
          ? resolveTeamLabel(alert.teamId)
          : (alert.teamId || '')
      };
    })
    .filter(entry => entry.title || entry.requirementSummary || entry.statusMessage);
};

const mergeTimelineSummariesWithAlerts = (summaries, alerts) => {
  const safeSummaries = Array.isArray(summaries) ? summaries : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  if (safeSummaries.length === 0) {
    return { summaries: safeSummaries, unmatchedAlerts: safeAlerts };
  }

  const alertKeyMap = new Map();

  const registerKey = (map, key, entry) => {
    if (key === null || key === undefined) {
      return;
    }

    const stringKey = typeof key === 'string' ? key : String(key);
    if (stringKey.length === 0) {
      return;
    }

    if (!map.has(stringKey)) {
      map.set(stringKey, entry);
    }

    const normalized = stringKey.trim().toLowerCase();
    if (normalized.length > 0 && !map.has(normalized)) {
      map.set(normalized, entry);
    }
  };

  const registerTextKey = (map, text, entry) => {
    if (typeof text !== 'string') {
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }

    registerKey(map, trimmed, entry);
  };

  const registerCompositeKey = (map, parts, entry) => {
    if (!Array.isArray(parts)) {
      return;
    }

    const normalizedParts = parts
      .map(part => {
        if (part === null || part === undefined) {
          return null;
        }

        if (typeof part === 'string') {
          const trimmed = part.trim();
          return trimmed.length > 0 ? trimmed : null;
        }

        const stringified = String(part);
        return stringified.length > 0 ? stringified : null;
      })
      .filter(Boolean);

    if (normalizedParts.length === 0) {
      return;
    }

    registerKey(map, normalizedParts.join('::'), entry);
  };

  safeAlerts.forEach((alert, index) => {
    if (!alert || typeof alert !== 'object') {
      return;
    }

    const entry = { alert, index };

    registerTextKey(alertKeyMap, alert.id, entry);
    registerTextKey(alertKeyMap, alert.ruleId, entry);
    registerTextKey(alertKeyMap, alert.ruleName, entry);
    registerTextKey(alertKeyMap, alert.title, entry);
    registerTextKey(alertKeyMap, alert.riskDescription, entry);

    if (alert.ruleId) {
      if (alert.riskId != null) {
        const riskId = String(alert.riskId);
        registerKey(alertKeyMap, `${alert.ruleId}-${riskId}`, entry);
        registerKey(alertKeyMap, `${alert.ruleId}__${riskId}`, entry);
        registerCompositeKey(alertKeyMap, [alert.ruleId, riskId], entry);
      } else {
        registerKey(alertKeyMap, `${alert.ruleId}-risk`, entry);
      }

      if (typeof alert.title === 'string' && alert.title.trim().length > 0) {
        registerCompositeKey(alertKeyMap, [alert.ruleId, alert.title], entry);
      }

      if (typeof alert.riskDescription === 'string' && alert.riskDescription.trim().length > 0) {
        registerCompositeKey(alertKeyMap, [alert.ruleId, alert.riskDescription], entry);
      }

      if (typeof alert.ruleName === 'string' && alert.ruleName.trim().length > 0) {
        registerCompositeKey(alertKeyMap, [alert.ruleId, alert.ruleName], entry);
      }
    }
  });

  const matchedAlertIndexes = new Set();

  const mergedSummaries = safeSummaries.map(summary => {
    if (!summary || typeof summary !== 'object') {
      return summary;
    }

    const candidateKeys = [];

    if (summary.id) {
      candidateKeys.push(summary.id);
    }

    if (summary.source) {
      candidateKeys.push(summary.source);
    }

    if (summary.ruleId) {
      candidateKeys.push(summary.ruleId);

      if (summary.ruleLabel) {
        candidateKeys.push(`${summary.ruleId}::${summary.ruleLabel}`);
      }

      if (summary.ruleName && typeof summary.ruleName === 'string') {
        candidateKeys.push(`${summary.ruleId}::${summary.ruleName}`);
      }

      if (summary.riskDescription) {
        candidateKeys.push(`${summary.ruleId}::${summary.riskDescription}`);
      }

      if (!summary.riskId && summary.source) {
        candidateKeys.push(`${summary.ruleId}-${summary.source}`);
        candidateKeys.push(`${summary.ruleId}::${summary.source}`);
      }
    }

    if (summary.ruleLabel) {
      candidateKeys.push(summary.ruleLabel);
    }

    if (summary.ruleName && typeof summary.ruleName === 'string') {
      candidateKeys.push(summary.ruleName);
    }

    if (summary.riskDescription) {
      candidateKeys.push(summary.riskDescription);
    }

    if (summary.riskId != null) {
      candidateKeys.push(summary.riskId);

      if (summary.ruleId) {
        candidateKeys.push(`${summary.ruleId}-${summary.riskId}`);
        candidateKeys.push(`${summary.ruleId}__${summary.riskId}`);
        candidateKeys.push(`${summary.ruleId}::${summary.riskId}`);
      }
    }

    let matchedEntry = null;

    for (const key of candidateKeys) {
      if (!key) {
        continue;
      }

      if (alertKeyMap.has(key)) {
        matchedEntry = alertKeyMap.get(key);
        break;
      }

      if (typeof key === 'string') {
        const normalizedKey = key.trim().toLowerCase();
        if (alertKeyMap.has(normalizedKey)) {
          matchedEntry = alertKeyMap.get(normalizedKey);
          break;
        }
      }
    }

    if (matchedEntry) {
      matchedAlertIndexes.add(matchedEntry.index);
      return {
        ...summary,
        alert: matchedEntry.alert
      };
    }

    return summary;
  });

  const unmatchedAlerts = safeAlerts.filter((_, index) => !matchedAlertIndexes.has(index));

  return {
    summaries: mergedSummaries,
    unmatchedAlerts
  };
};

const FALLBACK_SHOWCASE_THEME = initialShowcaseThemes[0] || {
  id: 'aurora',
  label: 'Aurora néon',
  description: 'Jeux de lumières et ambiance futuriste pour un rendu premium.',
  palette: {}
};

const normalizeColorValue = (value, fallback) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
};

const toRgba = (value, alpha = 1, fallback = 'rgba(0, 0, 0, 1)') => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const normalized = value.trim();

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
    let hex = normalized.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    const numeric = parseInt(hex, 16);
    const r = (numeric >> 16) & 255;
    const g = (numeric >> 8) & 255;
    const b = numeric & 255;
    const safeAlpha = Math.min(1, Math.max(0, typeof alpha === 'number' ? alpha : 1));

    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }

  if (/^rgba?\(/i.test(normalized)) {
    if (normalized.startsWith('rgb(') && typeof alpha === 'number') {
      return normalized.replace(/^rgb\((.*)\)$/i, `rgba($1, ${Math.min(1, Math.max(0, alpha))})`);
    }

    return normalized;
  }

  return fallback;
};

const parseHexChannels = (value) => {
  if (typeof value !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())) {
    return null;
  }

  let hex = value.trim().slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const numeric = parseInt(hex, 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
};

const toRgbTriplet = (value, fallback) => {
  const channels = parseHexChannels(value);
  return channels ? channels.join(', ') : fallback;
};

const relativeLuminance = (value) => {
  const channels = parseHexChannels(value);
  if (!channels) {
    return 0;
  }

  const [r, g, b] = channels.map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const shadeColor = (value, factor, fallback) => {
  const channels = parseHexChannels(value);
  if (!channels) {
    return fallback;
  }

  const hex = channels
    .map(channel => Math.round(Math.min(255, Math.max(0, channel * factor))).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
};

// La direction artistique « signature » ne lit pas la palette directement : elle expose des
// points d'accroche `--showcase-signature-*` (sinon elle retombe sur ses couleurs d'origine
// et tous les thèmes rendent à l'identique). On les alimente ici depuis la palette.
const buildSignatureVariables = (palette) => {
  const accentPrimary = normalizeColorValue(palette.accentPrimary, '#2563eb');
  const accentSecondary = normalizeColorValue(palette.accentSecondary, '#06b6d4');
  const highlight = normalizeColorValue(palette.highlight, accentSecondary);
  const glowPrimary = normalizeColorValue(palette.glowPrimary, accentPrimary);
  const glowSecondary = normalizeColorValue(palette.glowSecondary, accentSecondary);
  const backgroundStart = normalizeColorValue(palette.backgroundStart, '#1b1b1b');
  const inkStrong = normalizeColorValue(palette.inkStrong, '#1b1b1b');
  const surfaceLight = normalizeColorValue(palette.surfaceLight, '#ffffff');
  const surfaceLightAlt = normalizeColorValue(palette.surfaceLightAlt, '#f5f4f1');
  const inkSoft = normalizeColorValue(palette.inkSoft, '#4e4d4d');
  // Sur un thème clair le fond de page ne peut pas servir de socle sombre : on prend
  // alors l'encre forte, qui reste teintée par la marque.
  const ground = relativeLuminance(backgroundStart) <= relativeLuminance(inkStrong)
    ? backgroundStart
    : inkStrong;

  return {
    // `--sg-plasma` domine les halos clairs du fond animé et sert d'aplat d'accent : c'est
    // lui qui doit porter la couleur signature de la marque, `--sg-don` la secondaire.
    '--showcase-signature-don': accentSecondary,
    '--showcase-signature-plasma': accentPrimary,
    // Fond des cartes : le texte y est blanc, donc l'accent est assombri jusqu'à tenir
    // le ratio 4.5:1 même sur les marques les plus claires (orange Willfact, turquoise FibClot).
    '--showcase-signature-plasma-deep': shadeColor(accentPrimary, 0.88, '#996b14'),
    '--showcase-signature-plasma-deeper': shadeColor(accentPrimary, 0.63, '#6d511a'),
    // `--sg-gold` termine le dégradé du titre et colore les boutons : c'est le point le
    // plus visible, d'où la teinte lumineuse de la palette (`highlight`) plutôt qu'un
    // accent sombre qui disparaîtrait sur le fond profond.
    '--showcase-signature-gold': highlight,
    '--showcase-signature-gold-light': surfaceLightAlt,
    '--showcase-signature-vie': glowPrimary,
    '--showcase-signature-bleu': glowSecondary,
    '--showcase-signature-rose': accentPrimary,
    '--showcase-signature-rose-vif': highlight,
    '--showcase-signature-cloud': surfaceLightAlt,
    '--showcase-signature-cloud-soft': surfaceLight,
    '--showcase-signature-title-sheen': surfaceLightAlt,
    '--showcase-signature-ink-soft': inkSoft,
    '--showcase-signature-ink': ground,
    '--showcase-signature-ink-rgb': toRgbTriplet(ground, '27, 27, 27'),
    '--showcase-signature-don-rgb': toRgbTriplet(accentSecondary, '225, 9, 67'),
    '--showcase-signature-plasma-rgb': toRgbTriplet(accentPrimary, '246, 174, 76'),
    '--showcase-signature-bleu-rgb': toRgbTriplet(glowSecondary, '26, 97, 171'),
    '--showcase-signature-vie-rgb': toRgbTriplet(glowPrimary, '49, 175, 128'),
    '--showcase-signature-warn-bg': normalizeColorValue(palette.statusWarnStart, '#feead5'),
    '--showcase-signature-warn-line': normalizeColorValue(palette.statusWarnEnd, '#f8c587'),
    '--showcase-signature-warn-ink': normalizeColorValue(palette.statusWarnText, '#5e220e'),
    '--showcase-signature-warn-accent': normalizeColorValue(palette.statusAlertStrongStart, '#e84a16')
  };
};

const buildThemeVariables = (theme) => {
  const palette = (theme && typeof theme === 'object' ? theme.palette : null) || {};
  const accentPrimary = normalizeColorValue(palette.accentPrimary, '#2563eb');
  const accentSecondary = normalizeColorValue(palette.accentSecondary, '#06b6d4');
  const borderBase = normalizeColorValue(palette.border, '#94a3b8');
  const highlightBase = normalizeColorValue(palette.highlight, accentSecondary);
  const inkStrong = normalizeColorValue(palette.inkStrong, '#0f172a');
  const inkSoft = normalizeColorValue(palette.inkSoft, '#1e293b');
  const inkMuted = normalizeColorValue(palette.inkMuted, '#475569');
  const inkSubtle = normalizeColorValue(palette.inkSubtle, '#94a3b8');
  const surfaceLight = normalizeColorValue(palette.surfaceLight, '#f8fafc');
  const surfaceLightAlt = normalizeColorValue(palette.surfaceLightAlt, '#e2e8f0');
  const titleGradientStart = normalizeColorValue(palette.titleGradientStart, accentPrimary);
  const titleGradientMid = normalizeColorValue(palette.titleGradientMid, highlightBase);
  const titleGradientEnd = normalizeColorValue(palette.titleGradientEnd, accentSecondary);
  const ctaStart = normalizeColorValue(palette.ctaStart, accentPrimary);
  const ctaEnd = normalizeColorValue(palette.ctaEnd, accentSecondary);
  const heroStart = normalizeColorValue(palette.heroBackgroundStart, '#000000');
  const heroMid = normalizeColorValue(palette.heroBackgroundMid, '#090d15');
  const heroEnd = normalizeColorValue(palette.heroBackgroundEnd, '#0b1f2c');
  const panelSoftStart = normalizeColorValue(palette.panelSoftStart, '#101728');
  const panelSoftEnd = normalizeColorValue(palette.panelSoftEnd, '#1b2230');
  const panelStrongStart = normalizeColorValue(palette.panelStrongStart, '#0b2f41');
  const panelStrongEnd = normalizeColorValue(palette.panelStrongEnd, '#0e5560');
  const statusOkStart = normalizeColorValue(palette.statusOkStart, '#d1fae5');
  const statusOkEnd = normalizeColorValue(palette.statusOkEnd, '#a7f3d0');
  const statusWarnStart = normalizeColorValue(palette.statusWarnStart, '#ecfdf5');
  const statusWarnEnd = normalizeColorValue(palette.statusWarnEnd, '#d1fae5');
  const statusAlertStart = normalizeColorValue(palette.statusAlertStart, '#fee2e2');
  const statusAlertEnd = normalizeColorValue(palette.statusAlertEnd, '#fecaca');
  const statusAlertStrongStart = normalizeColorValue(palette.statusAlertStrongStart, '#f05959');
  const statusAlertStrongEnd = normalizeColorValue(palette.statusAlertStrongEnd, '#be1717');
  const statusOkText = normalizeColorValue(palette.statusOkText, '#064e3b');
  const statusWarnText = normalizeColorValue(palette.statusWarnText, '#064e3b');
  const statusAlertText = normalizeColorValue(palette.statusAlertText, '#7f1d1d');

  return {
    '--showcase-bg-start': normalizeColorValue(palette.backgroundStart, '#020309'),
    '--showcase-bg-mid': normalizeColorValue(palette.backgroundMid, '#050b18'),
    '--showcase-bg-end': normalizeColorValue(palette.backgroundEnd, '#020309'),
    '--showcase-glow-primary': toRgba(palette.glowPrimary || accentPrimary, 0.18, 'rgba(59, 130, 246, 0.18)'),
    '--showcase-glow-secondary': toRgba(palette.glowSecondary || accentSecondary, 0.16, 'rgba(14, 165, 233, 0.16)'),
    '--showcase-text-strong': normalizeColorValue(palette.textPrimary, '#f8fafc'),
    '--showcase-text-soft': normalizeColorValue(palette.textSecondary, '#e2e8f0'),
    '--showcase-accent-primary': accentPrimary,
    '--showcase-accent-secondary': accentSecondary,
    '--showcase-surface': toRgba(palette.surface, 0.78, 'rgba(8, 13, 22, 0.78)'),
    '--showcase-border-strong': toRgba(borderBase, 0.25, 'rgba(148, 163, 184, 0.25)'),
    '--showcase-border-soft': toRgba(borderBase, 0.28, 'rgba(148, 163, 184, 0.28)'),
    '--showcase-highlight-strong': toRgba(highlightBase, 0.85, 'rgba(148, 197, 255, 0.85)'),
    '--showcase-highlight-soft': toRgba(highlightBase, 0.7, 'rgba(148, 197, 255, 0.7)'),
    '--showcase-shadow-soft': toRgba(accentSecondary, 0.32, 'rgba(14, 165, 233, 0.32)'),
    '--showcase-shadow-strong': toRgba(accentSecondary, 0.4, 'rgba(14, 165, 233, 0.4)'),
    '--showcase-ink-strong': inkStrong,
    '--showcase-ink-soft': inkSoft,
    '--showcase-ink-muted': inkMuted,
    '--showcase-ink-subtle': inkSubtle,
    '--showcase-surface-light': surfaceLight,
    '--showcase-surface-light-alt': surfaceLightAlt,
    '--showcase-surface-card': toRgba(surfaceLight, 0.82, 'rgba(255, 255, 255, 0.82)'),
    '--showcase-surface-card-soft': toRgba(surfaceLight, 0.72, 'rgba(255, 255, 255, 0.72)'),
    '--showcase-surface-panel': toRgba(surfaceLight, 0.78, 'rgba(255, 255, 255, 0.78)'),
    '--showcase-surface-panel-soft': toRgba(surfaceLight, 0.95, 'rgba(248, 250, 252, 0.95)'),
    '--showcase-border-light': toRgba(borderBase, 0.4, 'rgba(148, 197, 255, 0.4)'),
    '--showcase-title-gradient': `linear-gradient(120deg, ${titleGradientStart}, ${titleGradientMid}, ${titleGradientEnd})`,
    '--showcase-title-shadow': toRgba(accentSecondary, 0.35, 'rgba(14, 116, 144, 0.35)'),
    '--showcase-title-sheen': toRgba(surfaceLight, 0.65, 'rgba(255, 255, 255, 0.65)'),
    '--showcase-cta-gradient': `linear-gradient(120deg, ${ctaStart}, ${ctaEnd})`,
    '--showcase-cta-text': normalizeColorValue(palette.ctaText, '#ecfeff'),
    '--showcase-hero-gradient': `linear-gradient(135deg, ${heroStart} 0%, ${heroMid} 45%, ${heroEnd} 100%)`,
    '--showcase-hero-glow-primary': toRgba(highlightBase, 0.15, 'rgba(148, 197, 255, 0.15)'),
    '--showcase-hero-glow-secondary': toRgba(accentSecondary, 0.18, 'rgba(14, 165, 233, 0.18)'),
    '--showcase-highlight-panel': `linear-gradient(145deg, ${toRgba(highlightBase, 0.18, 'rgba(148, 197, 255, 0.18)')}, ${toRgba(palette.backgroundMid || '#0c1220', 0.38, 'rgba(15, 23, 42, 0.38)')})`,
    '--showcase-panel-soft-gradient': `linear-gradient(135deg, ${panelSoftStart} 0%, ${panelSoftEnd} 100%)`,
    '--showcase-panel-strong-gradient': `linear-gradient(135deg, ${panelStrongStart} 0%, ${panelStrongEnd} 100%)`,
    '--showcase-panel-light-gradient': `linear-gradient(135deg, ${surfaceLightAlt} 0%, ${surfaceLight} 100%)`,
    '--showcase-panel-soft-surface': `linear-gradient(140deg, ${toRgba(highlightBase, 0.16, 'rgba(148, 197, 255, 0.16)')}, ${toRgba(palette.backgroundMid || '#0c1220', 0.42, 'rgba(12, 18, 32, 0.42)')})`,
    '--showcase-panel-card-gradient': `linear-gradient(150deg, ${toRgba(highlightBase, 0.16, 'rgba(148, 197, 255, 0.16)')}, ${toRgba(palette.backgroundMid || '#0c1220', 0.4, 'rgba(15, 23, 42, 0.4)')})`,
    '--showcase-impact-gradient': `linear-gradient(140deg, ${toRgba(accentSecondary, 0.12, 'rgba(56, 189, 248, 0.12)')}, ${toRgba(accentPrimary, 0.32, 'rgba(30, 64, 175, 0.32)')}, ${toRgba(palette.backgroundEnd || '#020309', 0.8, 'rgba(2, 6, 23, 0.8)')})`,
    '--showcase-impact-card-gradient': `radial-gradient(circle at 12% 18%, ${toRgba(highlightBase, 0.26, 'rgba(191, 219, 254, 0.26)')}, transparent 55%), radial-gradient(circle at 88% 82%, ${toRgba(highlightBase, 0.24, 'rgba(147, 197, 253, 0.24)')}, transparent 52%), linear-gradient(155deg, ${toRgba(accentPrimary, 0.65, 'rgba(30, 64, 175, 0.65)')}, ${toRgba(accentSecondary, 0.55, 'rgba(15, 118, 110, 0.55)')})`,
    '--showcase-impact-vision-gradient': `radial-gradient(circle at 16% 22%, ${toRgba(highlightBase, 0.25, 'rgba(191, 219, 254, 0.25)')}, transparent 50%), linear-gradient(150deg, ${toRgba(accentSecondary, 0.24, 'rgba(56, 189, 248, 0.24)')}, ${toRgba(accentPrimary, 0.55, 'rgba(30, 58, 138, 0.55)')})`,
    '--showcase-risk-halo-gradient': `radial-gradient(circle at 30% 30%, ${toRgba(accentPrimary, 0.55, 'rgba(92, 50, 0, 0.55)')}, ${toRgba(accentSecondary, 0.55, 'rgba(59, 37, 0, 0.55)')})`,
    '--showcase-risk-note': toRgba(surfaceLight, 0.9, 'rgba(255, 228, 196, 0.9)'),
    '--showcase-partner-bg': toRgba(accentPrimary, 0.12, 'rgba(78, 131, 255, 0.12)'),
    '--showcase-status-ok-gradient': `linear-gradient(135deg, ${statusOkStart} 0%, ${statusOkEnd} 100%)`,
    '--showcase-status-warn-gradient': `linear-gradient(135deg, ${statusWarnStart} 0%, ${statusWarnEnd} 100%)`,
    '--showcase-status-alert-gradient': `linear-gradient(135deg, ${statusAlertStart} 0%, ${statusAlertEnd} 100%)`,
    '--showcase-status-alert-strong-gradient': `linear-gradient(135deg, ${statusAlertStrongStart} 0%, ${statusAlertStrongEnd} 100%)`,
    '--showcase-status-ok-text': statusOkText,
    '--showcase-status-warn-text': statusWarnText,
    '--showcase-status-alert-text': statusAlertText,
    '--showcase-accent-soft': toRgba(highlightBase, 0.85, 'rgba(147, 197, 253, 0.85)'),
    '--showcase-accent-strong': toRgba(accentPrimary, 0.9, 'rgba(59, 130, 246, 0.9)'),
    '--showcase-accent-muted': toRgba(accentPrimary, 0.75, 'rgba(79, 70, 229, 0.75)'),
    ...buildSignatureVariables(palette)
  };
};

const normalizeThemeKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const resolveShowcaseTheme = (themes, answer, answers) => {
  const availableThemes = Array.isArray(themes) && themes.length > 0 ? themes : initialShowcaseThemes;
  const activatedTheme = resolveThemeFromActivation(availableThemes, answers);

  if (activatedTheme) {
    return activatedTheme;
  }

  const normalizedAnswer = normalizeThemeKey(answer);

  if (normalizedAnswer.length > 0) {
    const matched = availableThemes.find(theme => {
      if (!theme) {
        return false;
      }

      const candidates = [theme.id, theme.label, ...(Array.isArray(theme.aliases) ? theme.aliases : [])]
        .filter(Boolean)
        .map(normalizeThemeKey);

      return candidates.includes(normalizedAnswer);
    });

    if (matched) {
      return matched;
    }
  }

  return availableThemes[0] || FALLBACK_SHOWCASE_THEME;
};

const SHOWCASE_FIELD_CONFIG = [
  { id: 'projectName', fallbackLabelKey: 'projectName', fallbackType: 'text' },
  { id: 'projectSlogan', fallbackLabelKey: 'projectSlogan', fallbackType: 'text' },
  { id: 'showcaseTheme', fallbackLabelKey: 'showcaseTheme', fallbackType: 'choice' },
  { id: 'targetAudience', fallbackLabelKey: 'targetAudience', fallbackType: 'multi_choice' },
  { id: 'problemPainPoints', fallbackLabelKey: 'problemPainPoints', fallbackType: 'long_text' },
  { id: 'solutionDescription', fallbackLabelKey: 'solutionDescription', fallbackType: 'long_text' },
  { id: 'solutionBenefits', fallbackLabelKey: 'solutionBenefits', fallbackType: 'long_text' },
  { id: 'innovationProcess', fallbackLabelKey: 'innovationProcess', fallbackType: 'long_text' },
  // Chiffre d'impact : propre à la vitrine, sans question au questionnaire. Vide par défaut —
  // c'est un résultat attendu, que seul le chef de projet peut décider d'avancer.
  {
    id: 'showcaseImpactFigure',
    fallbackLabelKey: 'showcaseImpactFigure',
    fallbackType: 'plain_text',
    fallbackPlaceholderKey: 'showcaseImpactFigure'
  },
  {
    id: 'showcaseImpactFigureUnit',
    fallbackLabelKey: 'showcaseImpactFigureUnit',
    fallbackType: 'plain_text',
    fallbackPlaceholderKey: 'showcaseImpactFigureUnit'
  },
  {
    id: 'showcaseImpactFigureCaption',
    fallbackLabelKey: 'showcaseImpactFigureCaption',
    fallbackType: 'plain_text',
    fallbackPlaceholderKey: 'showcaseImpactFigureCaption'
  },
  { id: 'visionStatement', fallbackLabelKey: 'visionStatement', fallbackType: 'long_text' },
  { id: 'BUDGET', fallbackLabelKey: 'budget', fallbackType: 'number' },
  { id: 'teamLead', fallbackLabelKey: 'teamLead', fallbackType: 'text' },
  { id: 'teamLeadTeam', fallbackLabelKey: 'teamLeadTeam', fallbackType: 'text' },
  { id: 'teamCoreMembers', fallbackLabelKey: 'teamCoreMembers', fallbackType: 'long_text' },
  { id: 'campaignKickoffDate', fallbackLabelKey: 'campaignKickoffDate', fallbackType: 'date' },
  { id: 'launchDate', fallbackLabelKey: 'launchDate', fallbackType: 'date' },
  { id: 'roadmapMilestones', fallbackLabelKey: 'roadmapMilestones', fallbackType: 'milestone_list' }
];

const FIELD_SECTION_MAP = {
  projectName: 'hero',
  projectSlogan: 'hero',
  showcaseTheme: 'hero',
  targetAudience: 'hero',
  problemPainPoints: 'problem',
  solutionDescription: 'solution',
  solutionBenefits: 'benefits',
  innovationProcess: 'objectives',
  showcaseImpactFigure: 'objectives',
  showcaseImpactFigureUnit: 'objectives',
  showcaseImpactFigureCaption: 'objectives',
  visionStatement: 'indicators',
  BUDGET: 'timeline',
  teamLead: 'team',
  teamLeadTeam: 'team',
  teamCoreMembers: 'team',
  campaignKickoffDate: 'timeline',
  launchDate: 'timeline',
  roadmapMilestones: 'timeline'
};

const createEmptyMilestoneDragState = () => ({
  fieldId: null,
  sourceIndex: null,
  targetIndex: null
});

const ensureStringArrayUniqueness = (values) => {
  const seen = new Set();
  return values.filter(value => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

const normalizeMultiChoiceValue = (rawValue) => {
  const normalizeEntry = (entry) => {
    if (entry === null || entry === undefined) {
      return '';
    }

    if (typeof entry === 'string') {
      return entry.trim();
    }

    return String(entry).trim();
  };

  if (Array.isArray(rawValue)) {
    const normalized = rawValue
      .map(normalizeEntry)
      .filter(entry => entry.length > 0);

    return ensureStringArrayUniqueness(normalized);
  }

  if (typeof rawValue === 'string') {
    const splitValues = rawValue
      .split(/\r?\n|·|•|;|,/)
      .map(entry => entry.replace(/^[-•\s]+/, '').trim())
      .filter(entry => entry.length > 0);

    return ensureStringArrayUniqueness(splitValues);
  }

  return [];
};

const sanitizeMilestoneEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const cleaned = entries
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date.trim() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : ''
    }))
    .filter(entry => entry.date.length > 0 || entry.description.length > 0)
    .map(entry => ({ date: entry.date, description: entry.description }));

  return sortMilestonesChronologically(cleaned);
};

const formatMilestoneDraftState = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const cleaned = entries
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date : '',
      description: typeof item?.description === 'string' ? item.description : ''
    }))
    .filter(entry => entry.date.trim().length > 0 || entry.description.trim().length > 0);

  return sortMilestonesChronologically(cleaned);
};

// Une réponse à une question à choix unique est stockée par le questionnaire sous la forme
// { value, label, otherText, children } (voir QuestionnaireScreen.jsx#onAnswer), jamais comme
// une simple chaîne — seules les données de démo (demoProject.js) utilisent encore la chaîne
// brute. Sans cette extraction, `String(rawValue)` produit "[object Object]", qui ne
// correspond à aucune <option> du menu déroulant de l'éditeur : le champ paraît vide alors que
// la réponse existe bel et bien (cas vécu avec "À quelle équipe est-il rattaché ?" et
// "S'agit-il d'un projet produit ou environnement ?"). Quand une sous-option est sélectionnée
// (ex. un produit précis sous « Produit »), c'est elle la valeur pertinente pour le menu à plat
// de l'éditeur, pas la catégorie parente.
const extractChoiceAnswerValue = (rawValue) => {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const children = Array.isArray(rawValue.children) ? rawValue.children : [];
    const childValue = children.find(child => typeof child === 'string' && child.trim().length > 0);
    if (childValue) {
      return childValue;
    }
    if (typeof rawValue.value === 'string') {
      return rawValue.value;
    }
    if (typeof rawValue.name === 'string') {
      return rawValue.name;
    }
    return '';
  }

  return rawValue;
};

const formatValueForDraft = (type, rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return type === 'multi_choice' || type === 'milestone_list' ? [] : '';
  }

  if (type === 'multi_choice') {
    return normalizeMultiChoiceValue(rawValue);
  }

  if (type === 'choice') {
    return String(extractChoiceAnswerValue(rawValue) ?? '');
  }

  if (type === 'date') {
    const parsed = rawValue instanceof Date ? rawValue : new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      return String(rawValue);
    }
    return parsed.toISOString().slice(0, 10);
  }

  if (type === 'milestone_list') {
    return formatMilestoneDraftState(rawValue);
  }

  return String(rawValue);
};

const formatValueForUpdate = (type, draftValue) => {
  if (type === 'multi_choice') {
    return normalizeMultiChoiceValue(draftValue);
  }

  if (type === 'date') {
    if (typeof draftValue !== 'string') {
      return null;
    }
    const trimmed = draftValue.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (type === 'milestone_list') {
    return sanitizeMilestoneEntries(draftValue);
  }

  if (typeof draftValue !== 'string') {
    return '';
  }

  return draftValue;
};

const areFieldValuesEqual = (type, previousValue, nextValue) => {
  if (type === 'multi_choice') {
    const previousArray = Array.isArray(previousValue)
      ? previousValue
      : normalizeMultiChoiceValue(previousValue);
    const nextArray = Array.isArray(nextValue)
      ? nextValue
      : normalizeMultiChoiceValue(nextValue);

    if (previousArray.length !== nextArray.length) {
      return false;
    }

    return previousArray.every((entry, index) => entry === nextArray[index]);
  }

  if (type === 'milestone_list') {
    const previousEntries = sanitizeMilestoneEntries(previousValue);
    const nextEntries = sanitizeMilestoneEntries(nextValue);

    if (previousEntries.length !== nextEntries.length) {
      return false;
    }

    return previousEntries.every((entry, index) => {
      const nextEntry = nextEntries[index];
      if (!nextEntry) {
        return false;
      }

      return entry.date === nextEntry.date && entry.description === nextEntry.description;
    });
  }

  return previousValue === nextValue;
};

const buildDraftValues = (fields, answers, fallbackProjectName) => {
  const draft = {};

  fields.forEach(field => {
    const question = field.question;
    const fieldType = question?.type || field.fallbackType || 'text';
    const rawValue = getRawAnswer(answers, field.id);
    if (rawValue === undefined || rawValue === null) {
      draft[field.id] = fieldType === 'multi_choice' || fieldType === 'milestone_list' ? [] : '';
    } else {
      draft[field.id] = formatValueForDraft(fieldType, rawValue);
    }
  });

  if (typeof fallbackProjectName === 'string' && fallbackProjectName.trim().length > 0) {
    if (!hasText(draft.projectName)) {
      draft.projectName = fallbackProjectName.trim();
    }
  }

  return draft;
};

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;
// Coupe en fin de phrase (. ! ? …) uniquement quand ce qui suit ressemble au
// début d'une nouvelle phrase (majuscule, chiffre, guillemet) : évite de
// couper sur des abréviations ou décimales isolées.
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Ý0-9«"“(])/;

// "The Problem" découpe plus finement que les autres sections : chaque bloc
// déjà séparé par splitRichTextIntoBlocks (saut de ligne / <br> / puce) est
// en plus coupé phrase par phrase quand c'est un simple paragraphe sans mise
// en forme — jamais sur une virgule, qui coupait des phrases en plein
// milieu. Un bloc qui porte déjà du HTML (gras, lien) est laissé intact pour
// ne pas casser son balisage.
const parseProblemPainPoints = (value) => {
  const blocks = splitRichTextIntoBlocks(value);

  return blocks.flatMap(block => {
    if (HTML_TAG_PATTERN.test(block)) {
      return [block];
    }

    return block
      .split(SENTENCE_BOUNDARY_PATTERN)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  });
};

const SOLUTION_BULLET_PATTERN = /^[-•*·]\s+/;

// « En clair » mélange souvent une accroche narrative puis une liste
// introduite par une ligne du type « Le site proposera : ». On sépare les
// deux registres quand ce motif existe déjà dans la réponse, sans jamais
// exiger que l'utilisateur change sa façon de répondre : si aucune puce
// n'est détectée, tout retombe sur un simple paragraphe (hook seul).
const splitSolutionDescription = (value) => {
  if (!hasText(value)) {
    return { hook: '', listLabel: '', items: [], trailing: '' };
  }

  const lines = String(value)
    .split(/\r?\n/)
    .map(line => line.trim());

  const firstBulletIndex = lines.findIndex(line => SOLUTION_BULLET_PATTERN.test(line));

  if (firstBulletIndex <= 0) {
    return { hook: value.trim(), listLabel: '', items: [], trailing: '' };
  }

  const introLines = lines.slice(0, firstBulletIndex).filter(hasText);
  let hookLines = introLines;
  let listLabel = '';

  const lastIntroLine = introLines[introLines.length - 1];
  if (lastIntroLine && lastIntroLine.length <= 80 && /:\s*$/.test(lastIntroLine)) {
    listLabel = lastIntroLine;
    hookLines = introLines.slice(0, -1);
  }

  const items = [];
  const trailingLines = [];
  let stillInList = true;

  for (let i = firstBulletIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (!hasText(line)) {
      continue;
    }
    if (SOLUTION_BULLET_PATTERN.test(line)) {
      items.push(line.replace(SOLUTION_BULLET_PATTERN, '').trim());
      stillInList = true;
    } else if (stillInList) {
      trailingLines.push(line);
      stillInList = false;
    } else {
      trailingLines.push(line);
    }
  }

  return {
    hook: hookLines.join(' ').trim(),
    listLabel,
    items,
    trailing: trailingLines.join(' ').trim()
  };
};

const formatDate = (value, language) => {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(getLocaleTag(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
};

const formatMilestoneDisplayDate = (value, language) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '';
  }

  const formatted = formatDate(value, language);
  if (formatted && formatted.length > 0) {
    return formatted;
  }

  return value.trim();
};

const buildManualMilestones = (entries, language) => {
  const sanitized = sanitizeMilestoneEntries(entries);

  return sanitized.map((entry, index) => {
    const formattedDate = formatMilestoneDisplayDate(entry.date, language);

    return {
      id: `manual-milestone-${index}`,
      date: entry.date,
      formattedDate,
      description: entry.description
    };
  });
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const computeRunway = (answers, language) => {
  const launchRaw = answers?.launchDate;

  if (!launchRaw) {
    return null;
  }

  const launchDate = new Date(launchRaw);

  if (Number.isNaN(launchDate.getTime())) {
    return null;
  }

  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const launchNormalized = new Date(
    launchDate.getFullYear(),
    launchDate.getMonth(),
    launchDate.getDate()
  );

  const diffMs = launchNormalized.getTime() - todayNormalized.getTime();
  const diffInDays = Math.max(0, Math.round(diffMs / MS_IN_DAY));
  const diffInWeeks = diffInDays / 7;

  return {
    launchDate: launchNormalized,
    diffDays: diffInDays,
    diffWeeks: diffInWeeks,
    weeks: diffInWeeks,
    days: diffInDays,
    isToday: diffMs === 0,
    isOverdue: diffMs < 0,
    launchLabel: formatDate(launchNormalized, language)
  };
};

const formatCountdownUnit = (value, unit) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return `0 ${unit}`;
  }

  const rounded = Math.max(0, Math.round(value));
  return `${rounded} ${unit}`;
};

const useAnimatedCounter = (targetValue, options = {}) => {
  const { duration = 1000 } = options;
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef(null);
  const previousTargetRef = useRef(null);

  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (typeof targetValue !== 'number' || Number.isNaN(targetValue)) {
      previousTargetRef.current = null;
      setDisplayValue(0);
      return undefined;
    }

    const clampedTarget = Math.max(0, targetValue);

    if (duration <= 0) {
      setDisplayValue(clampedTarget);
      previousTargetRef.current = clampedTarget;
      return undefined;
    }

    if (previousTargetRef.current === clampedTarget) {
      setDisplayValue(clampedTarget);
      return undefined;
    }

    previousTargetRef.current = clampedTarget;
    let start = null;

    const step = (timestamp) => {
      if (start === null) {
        start = timestamp;
      }

      const progress = Math.min((timestamp - start) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = clampedTarget * easedProgress;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [targetValue, duration]);

  return displayValue;
};

const computeTimelineSummaries = (timelineDetails) => {
  if (!Array.isArray(timelineDetails)) {
    return [];
  }

  return timelineDetails
    .filter(detail => Boolean(detail?.diff) && detail?.satisfied === false)
    .map((detail, index) => {
      const diff = detail.diff;
      const weeks = Number.isFinite(diff?.diffInWeeks)
        ? Math.round(diff.diffInWeeks)
        : 0;
      const days = Number.isFinite(diff?.diffInDays)
        ? Math.round(diff.diffInDays)
        : 0;
      const riskLabel = typeof detail?.riskDescription === 'string'
        ? detail.riskDescription.trim()
        : '';
      const summaryLabel = riskLabel.length > 0 ? riskLabel : detail?.ruleName;
      const hasProfiles = Array.isArray(detail?.profiles) && detail.profiles.length > 0;
      const source = typeof detail?.source === 'string' ? detail.source : null;
      const ruleId = detail?.ruleId != null
        ? (() => {
            const value = String(detail.ruleId).trim();
            return value.length > 0 ? value : null;
          })()
        : null;
      const riskId = detail?.riskId != null
        ? (() => {
            const value = String(detail.riskId).trim();
            return value.length > 0 ? value : null;
          })()
        : null;
      const ruleLabel = typeof detail?.ruleName === 'string'
        ? detail.ruleName.trim()
        : '';
      const identifier = detail?.id
        || `${ruleId || ruleLabel || 'rule'}-${riskId || source || index}`;

      return {
        id: identifier,
        ruleId,
        ruleName: summaryLabel,
        ruleLabel,
        riskId,
        riskDescription: riskLabel,
        satisfied: detail?.satisfied ?? false,
        weeks,
        days,
        hasProfiles,
        source
      };
    });
};

const extractTimelineProfiles = (timelineDetails) => {
  if (!Array.isArray(timelineDetails)) {
    return [];
  }

  const detailWithProfiles = timelineDetails.find(
    (detail) => Array.isArray(detail?.profiles) && detail.profiles.length > 0
  );

  if (!detailWithProfiles) {
    return [];
  }

  return detailWithProfiles.profiles
    .map((profile) => ({
      id: profile?.id ?? null,
      label: typeof profile?.label === 'string' ? profile.label : '',
      description: typeof profile?.description === 'string' ? profile.description : ''
    }))
    .filter(profile => profile.label.length > 0 || profile.description.length > 0);
};

const REQUIRED_SHOWCASE_QUESTION_IDS = [
  'projectName',
  'projectSlogan',
  'targetAudience',
  'problemPainPoints',
  'solutionDescription',
  'solutionBenefits',
  'innovationProcess',
  'visionStatement',
  'BUDGET',
  'teamLead',
  'teamLeadTeam',
  'teamCoreMembers',
  'campaignKickoffDate',
  'launchDate',
  'roadmapMilestones'
];

const buildHeroHighlights = ({ targetAudience, projectEnvironment, deploymentCountries, t }) => {
  const highlights = [];

  if (hasText(targetAudience)) {
    highlights.push({
      id: 'audience',
      label: t('projectShowcase.audienceLabel'),
      value: targetAudience,
      caption: ''
    });
  }

  if (hasText(projectEnvironment)) {
    highlights.push({
      id: 'projectEnvironment',
      label: t('projectShowcase.projectEnvironmentLabel'),
      value: projectEnvironment,
      caption: ''
    });
  }

  if (hasText(deploymentCountries)) {
    highlights.push({
      id: 'deploymentCountries',
      label: t('projectShowcase.deploymentCountriesLabel'),
      value: deploymentCountries,
      caption: ''
    });
  }

  return highlights;
};

export const ProjectShowcase = ({
  projectId = null,
  projectName,
  onClose,
  analysis,
  relevantTeams,
  questions,
  answers,
  timelineDetails,
  renderInStandalone = false,
  onUpdateAnswers,
  tourContext = null,
  showcaseThemes = initialShowcaseThemes,
  hasIncompleteAnswers = false,
  onAnnotationScopeChange = null,
  onEditingStateChange = null,
  initialDisplayMode = 'full',
  displayModeLock = null,
  onDisplayModeChange = null,
  hideEditBar = false,
  hideNotice = false,
  canConfigureDisplayModes = true
}) => {
  const { t, language } = useTranslation();
  const missingInfoLabel = t('projectShowcase.missingInfoLabel');
  const answeredProjectNameRaw = getRawAnswer(answers, 'projectName');
  const answeredProjectName = typeof answeredProjectNameRaw === 'string' ? answeredProjectNameRaw.trim() : '';
  const fallbackProjectName = typeof projectName === 'string' ? projectName.trim() : '';
  // Le champ « Nom du projet » du formulaire d'édition écrit dans answers.projectName :
  // sans cette priorité, une modification enregistrée ne se reflèterait jamais dans le titre affiché.
  const rawProjectName = answeredProjectName.length > 0 ? answeredProjectName : fallbackProjectName;
  const isMissingInfoLabel = useCallback(
    (value) => typeof value === 'string' && value.trim() === missingInfoLabel,
    [missingInfoLabel]
  );
  const missingInfoClass = useCallback(
    (value) => (isMissingInfoLabel(value) ? 'text-rose-600' : ''),
    [isMissingInfoLabel]
  );
  const normalizedTeams = Array.isArray(relevantTeams) ? relevantTeams : [];
  const availableThemes = useMemo(
    () => (Array.isArray(showcaseThemes) && showcaseThemes.length > 0
      ? showcaseThemes
      : initialShowcaseThemes),
    [showcaseThemes]
  );
  // la vitrine n'a plus qu'un seul layout ; les thèmes ne portent que des palettes
  const showcaseLayout = 'signature';
  const signatureRootRef = useRef(null);
  const teamNameById = useMemo(() => {
    const map = new Map();
    normalizedTeams.forEach(team => {
      if (team && team.id) {
        map.set(team.id, resolveLocalizedText(team.name, language) || team.id);
      }
    });
    return map;
  }, [normalizedTeams, language]);

  const editableFields = useMemo(
    () =>
      SHOWCASE_FIELD_CONFIG.map(config => ({
        ...config,
        question: findQuestionById(questions, config.id)
      })),
    [questions]
  );

  const [isEditing, setIsEditing] = useState(false);
  // Section en cours d'édition : une seule à la fois, pour que l'inspecteur n'affiche
  // jamais plus que les champs de ce que l'utilisateur regarde.
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [isPreviewingInEditor, setIsPreviewingInEditor] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [inserterIndex, setInserterIndex] = useState(null);
  const [ghostTemplateId, setGhostTemplateId] = useState(null);
  const [canvasDragIndex, setCanvasDragIndex] = useState(null);
  const [canvasDropIndex, setCanvasDropIndex] = useState(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(true);
  const [editorHistory, setEditorHistory] = useState(() => createHistory(null));
  const isTimeTravellingRef = useRef(false);
  const [draftValues, setDraftValues] = useState(() =>
    buildDraftValues(editableFields, answers, rawProjectName)
  );
  const [customSections, setCustomSections] = useState(() =>
    sanitizeCustomSections(answers?.customShowcaseSections)
  );
  const [sectionOrder, setSectionOrder] = useState(() =>
    normalizeSectionOrder(answers?.showcaseSectionOrder, sanitizeCustomSections(answers?.customShowcaseSections))
  );
  const [milestoneDragState, setMilestoneDragState] = useState(createEmptyMilestoneDragState);
  const resolvedDisplayModeLock =
    displayModeLock === 'light' || displayModeLock === 'full' ? displayModeLock : null;
  const resolvedInitialDisplayMode = initialDisplayMode === 'light' ? 'light' : 'full';
  const [displayMode, setDisplayMode] = useState(resolvedDisplayModeLock || resolvedInitialDisplayMode);
  const [lightSections, setLightSections] = useState(() =>
    buildDefaultLightSectionSelection(buildLightVisibilityIds(sectionOrder))
  );
  const [pendingLightSections, setPendingLightSections] = useState(lightSections);
  const [sectionAccentsDraft, setSectionAccentsDraft] = useState(() =>
    normalizeSectionAccents(answers?.showcaseSectionAccents)
  );
  const [isLightConfigOpen, setIsLightConfigOpen] = useState(false);
  const [documentUploadErrors, setDocumentUploadErrors] = useState({});

  const resetMilestoneDragState = useCallback(() => {
    setMilestoneDragState(createEmptyMilestoneDragState());
  }, []);

  // Point d'entrée unique du dépôt de documents dans la vitrine (gabarit « Visionneuse
  // documentaire ») : mêmes garde-fous (taille, extensions) et même bascule SharePoint/local
  // que le formulaire « Projet inspirant », via createAttachmentFromFile.
  const handleDocumentUpload = useCallback(async (uploadKey, applyField, files) => {
    const file = files && files[0];
    if (!file) {
      return;
    }

    setDocumentUploadErrors(previous => ({ ...previous, [uploadKey]: '' }));

    try {
      const attachment = await createAttachmentFromFile(file, {
        entityType: 'showcase',
        entityId: projectId || 'sans-projet'
      });
      const extension = getFileExtension(attachment.name).toLowerCase();
      // 'jpeg' -> 'jpg' pour matcher DOCUMENT_VIEWER_TYPES ; tout format non reconnu (docx,
      // xlsx...) retombe sur 'pptx'. `documentType` ne sert plus qu'à choisir l'aperçu natif
      // <img> pour jpg/png (seul format sans dépendance externe) et le libellé de la barre —
      // jamais à tenter un aperçu intégré d'un PDF ou d'un fichier bureautique.
      const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
      const documentType = DOCUMENT_VIEWER_TYPES.includes(normalizedExtension)
        ? normalizedExtension
        : 'pptx';
      applyField('documentUrl', attachment.url);
      applyField('documentType', documentType);
    } catch (error) {
      setDocumentUploadErrors(previous => ({
        ...previous,
        [uploadKey]: error?.message || t('projectShowcase.documentUploadFailedMessage')
      }));
    }
  }, [projectId, t]);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
    const sanitizedSections = sanitizeCustomSections(answers?.customShowcaseSections);
    setCustomSections(sanitizedSections);
    setSectionOrder(normalizeSectionOrder(answers?.showcaseSectionOrder, sanitizedSections));
    setSectionAccentsDraft(normalizeSectionAccents(answers?.showcaseSectionAccents));
  }, [answers, editableFields, rawProjectName]);

  useEffect(() => {
    if (!isEditing) {
      resetMilestoneDragState();
    }
  }, [isEditing, resetMilestoneDragState]);

  useEffect(() => {
    setLightSections(previous => {
      const nextState = { ...previous };
      let changed = false;
      const visibilityIds = buildLightVisibilityIds(sectionOrder);

      visibilityIds.forEach(id => {
        if (nextState[id] === undefined) {
          nextState[id] = true;
          changed = true;
        }
      });

      Object.keys(nextState).forEach(id => {
        if (!visibilityIds.includes(id)) {
          delete nextState[id];
          changed = true;
        }
      });

      return changed ? nextState : previous;
    });
  }, [sectionOrder]);

  useEffect(() => {
    if (typeof onAnnotationScopeChange !== 'function') {
      return undefined;
    }

    const scope = inserterIndex !== null
      ? 'section-picker'
      : isLightConfigOpen
        ? 'light-config'
        : `display-${displayMode}`;

    onAnnotationScopeChange(scope);

    return () => {
      onAnnotationScopeChange('');
    };
  }, [displayMode, inserterIndex, isLightConfigOpen, onAnnotationScopeChange]);

  const handleDisplayModeChange = useCallback((mode) => {
    if (resolvedDisplayModeLock) {
      return;
    }

    if (mode === 'full' || mode === 'light') {
      setDisplayMode(mode);
    }
  }, [resolvedDisplayModeLock]);

  useEffect(() => {
    if (resolvedDisplayModeLock) {
      setDisplayMode(resolvedDisplayModeLock);
      setIsLightConfigOpen(false);
      return;
    }

    if (initialDisplayMode === 'light' || initialDisplayMode === 'full') {
      setDisplayMode(initialDisplayMode);
    }
  }, [initialDisplayMode, resolvedDisplayModeLock]);

  useEffect(() => {
    if (typeof onDisplayModeChange === 'function') {
      onDisplayModeChange(displayMode);
    }
  }, [displayMode, onDisplayModeChange]);

  const handleOpenLightConfig = useCallback(() => {
    setPendingLightSections(lightSections);
    setIsLightConfigOpen(true);
  }, [lightSections]);

  const handleCancelLightConfig = useCallback(() => {
    setPendingLightSections(lightSections);
    setIsLightConfigOpen(false);
  }, [lightSections]);

  const handleSectionAccentChange = useCallback((sectionId, familyId) => {
    setSectionAccentsDraft((previous) => {
      const next = { ...previous };
      // La famille « thème » est le défaut : on l'efface plutôt que de la stocker.
      if (familyId === THEME_ACCENT_FAMILY_ID) {
        delete next[sectionId];
      } else {
        next[sectionId] = familyId;
      }
      return next;
    });
  }, []);

  const handleTogglePendingSection = useCallback((sectionId) => {
    setPendingLightSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const handleSelectAllSections = useCallback(() => {
    setPendingLightSections(buildDefaultLightSectionSelection(buildLightVisibilityIds(sectionOrder)));
  }, [sectionOrder]);

  const handleValidateLightConfig = useCallback(() => {
    setLightSections(pendingLightSections);
    setIsLightConfigOpen(false);
  }, [pendingLightSections]);

  const sanitizedCustomSections = useMemo(
    () => sanitizeCustomSections(customSections),
    [customSections]
  );

  const customSectionMap = useMemo(() => {
    const map = new Map();
    sanitizedCustomSections.forEach(section => {
      map.set(section.id, section);
    });
    return map;
  }, [sanitizedCustomSections]);

  const customSectionFormMap = useMemo(() => {
    const map = new Map();
    customSections.forEach(section => {
      if (section?.id) {
        map.set(section.id, section);
      }
    });
    return map;
  }, [customSections]);

  const sectionFieldsById = useMemo(() => {
    return editableFields.reduce((acc, field) => {
      const sectionId = FIELD_SECTION_MAP[field.id];
      if (!sectionId) {
        return acc;
      }

      if (!acc[sectionId]) {
        acc[sectionId] = [];
      }

      acc[sectionId].push(field);
      return acc;
    }, {});
  }, [editableFields]);

  // `'end'` plutôt qu'un index : l'appelant (le guide interactif) ne connaît pas la
  // longueur courante de la vitrine, et la résoudre ici obligerait l'effet du guide à
  // dépendre de `sectionOrder`, donc à se rejouer à chaque réordonnancement.
  const handleOpenSectionPicker = useCallback((insertionIndex = 'end') => {
    setInserterIndex(insertionIndex);
    setGhostTemplateId(null);
  }, []);

  const handleCloseSectionPicker = useCallback(() => {
    setInserterIndex(null);
    setGhostTemplateId(null);
  }, []);

  useEffect(() => {
    if (typeof onEditingStateChange === 'function') {
      onEditingStateChange(isEditing);
    }

    return () => {
      if (typeof onEditingStateChange === 'function') {
        onEditingStateChange(false);
      }
    };
  }, [isEditing, onEditingStateChange]);

  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    const { activeStep } = tourContext;
    const shouldForceEditing = [
      'showcase-edit-topbar',
      'showcase-edit',
      'showcase-save-edits',
      'showcase-custom-sections'
    ].includes(activeStep);

    if (shouldForceEditing) {
      setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
      resetMilestoneDragState();
      setIsEditing(true);
      // Sans section sélectionnée, le panneau de réglages (étapes "topbar"/"edit" de la
      // visite guidée) reste vide et ne démontre rien : on présélectionne une section réelle.
      if (activeStep === 'showcase-edit-topbar' || activeStep === 'showcase-edit') {
        setActiveSectionId(
          (previous) => previous || sectionOrder.find((id) => id !== 'notice') || sectionOrder[0] || null
        );
      }
    } else if (isEditing) {
      setIsEditing(false);
    }

    if (typeof document === 'undefined') {
      return;
    }

    let selector = null;
    let scrollOptions = { behavior: 'smooth', block: 'center' };

    if (activeStep === 'showcase-top') {
      selector = '[data-tour-id="showcase-preview"]';
      scrollOptions = { behavior: 'smooth', block: 'start' };
    } else if (activeStep === 'showcase-bottom') {
      selector = '[data-tour-id="showcase-roadmap"]';
      scrollOptions = { behavior: 'smooth', block: 'center' };
    } else if (activeStep === 'showcase-comments-postits') {
      selector = '[data-tour-id="showcase-annotation-note"]';
      scrollOptions = { behavior: 'smooth', block: 'center' };
    } else if (activeStep === 'showcase-edit-trigger') {
      selector = '[data-tour-id="showcase-edit-trigger"]';
    } else if (activeStep === 'showcase-edit-topbar') {
      selector = '[data-tour-id="showcase-edit-topbar"]';
    } else if (activeStep === 'showcase-edit' || activeStep === 'showcase-save-edits') {
      selector = '[data-tour-id="showcase-edit-panel"]';
    } else if (activeStep === 'showcase-custom-sections') {
      selector = '[data-tour-id="showcase-add-section-panel"]';
    }

    if (selector) {
      let element = document.querySelector(selector);
      if (!element && activeStep === 'showcase-bottom') {
        element = document.querySelector('[data-tour-id="showcase-preview"]');
        scrollOptions = { behavior: 'smooth', block: 'center' };
      }
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView(scrollOptions);
      }
    }

    if (activeStep === 'showcase-custom-sections') {
      handleOpenSectionPicker('end');
    } else {
      handleCloseSectionPicker();
    }
  }, [
    tourContext,
    editableFields,
    buildDraftValues,
    answers,
    rawProjectName,
    resetMilestoneDragState,
    isEditing,
    setDraftValues,
    setActiveSectionId,
    sectionOrder,
    handleOpenSectionPicker,
    handleCloseSectionPicker
  ]);

  const isLightMode = displayMode === 'light';
  const lightVisibilityIds = useMemo(() => buildLightVisibilityIds(sectionOrder), [sectionOrder]);

  const canEdit = typeof onUpdateAnswers === 'function' && !hideEditBar;
  const isLiveEditing = isEditing && canEdit;
  // Chrome d'édition visible : on édite *et* on n'est pas passé en aperçu (touche P).
  // Toute la différence entre « je travaille » et « je juge le rendu » tient à ce booléen.
  const isEditorChromeVisible = isLiveEditing && !isPreviewingInEditor;

  const canShowBudget = isEditorChromeVisible || displayMode === 'full' || lightSections.budget !== false;

  // Pendant l'édition, une section masquée en vue Light reste rendue (grisée et barrée par
  // le cadre) : la retirer du canvas priverait l'utilisateur du seul moyen de la réafficher.
  const shouldDisplaySection = useCallback(
    (sectionId) => isEditorChromeVisible || displayMode === 'full' || lightSections[sectionId] !== false,
    [displayMode, isEditorChromeVisible, lightSections]
  );

  const isSectionHiddenInLight = useCallback(
    (sectionId) => lightSections[sectionId] === false,
    [lightSections]
  );

  const selectedLightSectionsCount = useMemo(
    () => lightVisibilityIds.filter((id) => lightSections[id] !== false).length,
    [lightSections, lightVisibilityIds]
  );

  const formId = 'project-showcase-edit-form';

  const handleStartEditing = useCallback(() => {
    const nextDraftValues = buildDraftValues(editableFields, answers, rawProjectName);
    const nextCustomSections = sanitizeCustomSections(answers?.customShowcaseSections);
    const nextSectionOrder = normalizeSectionOrder(answers?.showcaseSectionOrder, nextCustomSections);
    const nextSectionAccents = normalizeSectionAccents(answers?.showcaseSectionAccents);

    setDraftValues(nextDraftValues);
    setCustomSections(nextCustomSections);
    setSectionOrder(nextSectionOrder);
    setSectionAccentsDraft(nextSectionAccents);
    resetMilestoneDragState();
    setEditorHistory(createHistory({
      draftValues: nextDraftValues,
      customSections: nextCustomSections,
      sectionOrder: nextSectionOrder,
      sectionAccents: nextSectionAccents
    }));
    isTimeTravellingRef.current = true;
    setHasRestoredDraft(false);
    setIsPreviewingInEditor(false);
    setIsExitConfirmOpen(false);
    // « notice » n'est qu'un bandeau d'alerte : ouvrir l'inspecteur dessus n'aurait
    // rien à montrer. En feuille basse, on n'ouvre rien du tout : la vitrine doit rester
    // visible tant que l'utilisateur n'a pas désigné une section.
    const sideInspector = prefersSideInspector();
    setIsInspectorExpanded(sideInspector);
    setActiveSectionId(
      sideInspector ? (nextSectionOrder.find(id => id !== 'notice') || nextSectionOrder[0] || null) : null
    );
    setIsEditing(true);
  }, [answers, editableFields, rawProjectName, resetMilestoneDragState]);

  const handleCancelEditing = useCallback(() => {
    setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
    setIsEditing(false);
    setActiveSectionId(null);
    setInserterIndex(null);
    setGhostTemplateId(null);
    setIsPreviewingInEditor(false);
    setIsExitConfirmOpen(false);
    const sanitizedSections = sanitizeCustomSections(answers?.customShowcaseSections);
    setCustomSections(sanitizedSections);
    setSectionOrder(normalizeSectionOrder(answers?.showcaseSectionOrder, sanitizedSections));
    setSectionAccentsDraft(normalizeSectionAccents(answers?.showcaseSectionAccents));
  }, [answers, editableFields, rawProjectName]);

  const handleFieldChange = useCallback((fieldId, valueOrUpdater) => {
    setDraftValues(prev => {
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? valueOrUpdater(prev[fieldId], prev)
          : valueOrUpdater;

      if (prev[fieldId] === nextValue) {
        return prev;
      }

      return {
        ...prev,
        [fieldId]: nextValue
      };
    });
  }, []);

  const handleCustomSectionFieldChange = useCallback((sectionId, field, value) => {
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          [field]: value
        };
      })
    );
  }, []);

  const handleCustomSectionColumnCountChange = useCallback((sectionId, value) => {
    const nextCount = resolveCustomSectionColumnCount(value);
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        // Changer le nombre de colonnes ne touche jamais aux blocs : c'est une largeur de
        // grille, pas une capacité.
        return {
          ...section,
          columnCount: nextCount
        };
      })
    );
  }, []);

  const handleCustomSectionColumnChange = useCallback((sectionId, index, value) => {
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        const columns = Array.isArray(section.columns) ? [...section.columns] : [];
        while (columns.length <= index) {
          columns.push('');
        }
        columns[index] = value;

        return {
          ...section,
          columns
        };
      })
    );
  }, []);

  const handleCustomSectionColumnAdd = useCallback((sectionId) => {
    setCustomSections(prev =>
      prev.map(section => (
        section && section.id === sectionId
          ? { ...section, columns: [...(Array.isArray(section.columns) ? section.columns : []), ''] }
          : section
      ))
    );
  }, []);

  const handleCustomSectionColumnRemove = useCallback((sectionId, index) => {
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        const columns = Array.isArray(section.columns) ? [...section.columns] : [];
        columns.splice(index, 1);

        return {
          ...section,
          columns
        };
      })
    );
  }, []);

  const handleCustomSectionItemChange = useCallback((sectionId, index, value) => {
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        const items = Array.isArray(section.items) ? [...section.items] : [];
        items[index] = value;

        return {
          ...section,
          items
        };
      })
    );
  }, []);

  const handleCustomSectionItemAdd = useCallback((sectionId) => {
    setCustomSections(prev =>
      prev.map(section => (
        section && section.id === sectionId
          ? { ...section, items: [...(Array.isArray(section.items) ? section.items : []), ''] }
          : section
      ))
    );
  }, []);

  const handleCustomSectionItemRemove = useCallback((sectionId, index) => {
    setCustomSections(prev =>
      prev.map(section => {
        if (!section || section.id !== sectionId) {
          return section;
        }

        const items = Array.isArray(section.items) ? [...section.items] : [];
        items.splice(index, 1);

        return {
          ...section,
          items
        };
      })
    );
  }, []);

  const handleRemoveCustomSection = useCallback((sectionId) => {
    setCustomSections(previous => previous.filter(section => section.id !== sectionId));
    setSectionOrder(previous => previous.filter(entry => entry !== sectionId));
    setActiveSectionId(previous => (previous === sectionId ? null : previous));
  }, []);

  const handleSelectSection = useCallback((sectionId) => {
    setActiveSectionId(sectionId);
    setIsInspectorExpanded(true);
    setInserterIndex(null);
    setGhostTemplateId(null);
  }, []);

  const handleMoveSection = useCallback((fromIndex, toIndex) => {
    setSectionOrder(previous => moveArrayItem(previous, fromIndex, toIndex));
  }, []);

  const handleCanvasDragStart = useCallback((index) => {
    setCanvasDragIndex(index);
    setInserterIndex(null);
    setGhostTemplateId(null);
  }, []);

  const handleCanvasDragEnd = useCallback(() => {
    setCanvasDragIndex(null);
    setCanvasDropIndex(null);
  }, []);

  const handleCanvasDrop = useCallback((targetIndex) => {
    if (canvasDragIndex === null) {
      return;
    }
    setSectionOrder(previous => moveArrayItem(previous, canvasDragIndex, targetIndex));
    setCanvasDragIndex(null);
    setCanvasDropIndex(null);
  }, [canvasDragIndex]);

  const handleToggleSectionVisibility = useCallback((sectionId) => {
    setLightSections(previous => ({
      ...previous,
      [sectionId]: previous[sectionId] === false
    }));
  }, []);

  const handleDuplicateCustomSection = useCallback((sectionId) => {
    const source = customSections.find(section => section?.id === sectionId);
    if (!source) {
      return;
    }

    const copyId = `custom-section-${Date.now()}`;
    const copy = {
      ...source,
      id: copyId,
      items: Array.isArray(source.items) ? [...source.items] : [],
      columns: Array.isArray(source.columns) ? [...source.columns] : []
    };

    setCustomSections(previous => [...previous, copy]);
    setSectionOrder(previous => {
      const base = Array.isArray(previous) ? [...previous] : [];
      const position = base.indexOf(sectionId);
      base.splice(position === -1 ? base.length : position + 1, 0, copyId);
      return base;
    });
    setActiveSectionId(copyId);
  }, [customSections]);

  const handleInsertTemplate = useCallback((templateId, insertionIndex) => {
    const newSectionId = `custom-section-${Date.now()}`;
    // Exactement le bloc que l'aperçu fantôme vient de montrer à cet endroit.
    const newSection = buildSectionFromTemplate(t, templateId, newSectionId);

    setCustomSections(previous => [...previous, newSection]);
    setSectionOrder(previous => {
      const base = Array.isArray(previous) ? [...previous] : [];
      const position = insertionIndex === 'end' || typeof insertionIndex !== 'number'
        ? base.length
        : Math.max(0, Math.min(base.length, insertionIndex));
      base.splice(position, 0, newSectionId);
      return base;
    });

    setActiveSectionId(newSectionId);
    setInserterIndex(null);
    setGhostTemplateId(null);
  }, [t]);

  const pendingUpdates = useMemo(
    () =>
      isLiveEditing
        ? computeShowcaseUpdates({
          answers,
          editableFields,
          draftValues,
          customSections,
          sectionOrder,
          sectionAccents: sectionAccentsDraft
        })
        : null,
    [answers, customSections, draftValues, editableFields, isLiveEditing, sectionAccentsDraft, sectionOrder]
  );

  const hasUnpublishedChanges = Boolean(pendingUpdates && Object.keys(pendingUpdates).length > 0);

  const editorSnapshot = useMemo(
    () => ({ draftValues, customSections, sectionOrder, sectionAccents: sectionAccentsDraft }),
    [customSections, draftValues, sectionAccentsDraft, sectionOrder]
  );

  const handleSubmitEdit = useCallback(
    (event) => {
      // Appelé aussi bien par la soumission du formulaire de l'inspecteur que par le
      // bouton « Publier » de la barre, qui vit hors du formulaire.
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      if (!canEdit) {
        setIsEditing(false);
        return;
      }

      const updates = computeShowcaseUpdates({
        answers,
        editableFields,
        draftValues,
        customSections,
        sectionOrder,
        sectionAccents: sectionAccentsDraft
      });

      if (Object.keys(updates).length > 0) {
        onUpdateAnswers(updates);
      }

      clearShowcaseDraft(projectId);
      setHasRestoredDraft(false);
      setActiveSectionId(null);
      setInserterIndex(null);
      setGhostTemplateId(null);
      setIsPreviewingInEditor(false);
      setIsExitConfirmOpen(false);
      setIsEditing(false);
    },
    [answers, canEdit, customSections, draftValues, editableFields, onUpdateAnswers, projectId, sectionAccentsDraft, sectionOrder]
  );

  // Superposition « brouillon -> vitrine » : la brique qui rend l'aperçu vivant. Hors
  // édition, on renvoie `answers` inchangé — la vitrine consultée ou partagée ne doit
  // dépendre d'aucun état d'édition.
  const previewAnswers = useMemo(() => {
    if (!isLiveEditing) {
      return answers;
    }

    const fieldValues = { showcaseSectionAccents: sectionAccentsDraft };
    editableFields.forEach(field => {
      const { id } = field;
      if (!id || draftValues[id] === undefined) {
        return;
      }
      const type = field.question?.type || field.fallbackType || 'text';
      fieldValues[id] = formatValueForUpdate(type, draftValues[id]);
    });

    return buildPreviewAnswers(answers, {
      fieldValues,
      customSections: sanitizedCustomSections,
      sectionOrder
    });
  }, [answers, draftValues, editableFields, isLiveEditing, sanitizedCustomSections, sectionAccentsDraft, sectionOrder]);

  // Le thème fait partie des champs éditables : il est résolu depuis les réponses d'aperçu
  // pour que changer de palette repeigne la vitrine immédiatement.
  const selectedTheme = useMemo(
    () => resolveShowcaseTheme(availableThemes, previewAnswers?.showcaseTheme, previewAnswers),
    [availableThemes, previewAnswers]
  );
  const showcaseThemeId = selectedTheme?.id || FALLBACK_SHOWCASE_THEME.id;
  // Palette d'accents unique du thème : « thème » en tête, puis les familles nommées. Les
  // deux sélecteurs de couleur (section intégrée et bloc personnalisé) y puisent, donc une
  // même teinte porte la même couleur partout dans la vitrine.
  const accentFamilies = useMemo(
    () => buildAccentFamilies((selectedTheme || FALLBACK_SHOWCASE_THEME).palette),
    [selectedTheme]
  );
  const sectionAccents = useMemo(
    () => normalizeSectionAccents(previewAnswers?.showcaseSectionAccents),
    [previewAnswers]
  );
  const resolveSectionAccent = useCallback(
    (sectionId) => resolveAccentFamily(sectionAccents[sectionId], accentFamilies),
    [accentFamilies, sectionAccents]
  );
  const showcaseThemeVariables = useMemo(
    () => buildThemeVariables(selectedTheme || FALLBACK_SHOWCASE_THEME),
    [selectedTheme]
  );

  const previewProjectNameRaw = getRawAnswer(previewAnswers, 'projectName');
  const previewProjectName =
    typeof previewProjectNameRaw === 'string' ? previewProjectNameRaw.trim() : '';
  const displayedProjectName =
    previewProjectName.length > 0 ? previewProjectName : fallbackProjectName;
  const safeProjectName = displayedProjectName.length > 0 ? displayedProjectName : missingInfoLabel;

  const missingShowcaseQuestions = useMemo(() => {
    const available = new Set(Array.isArray(questions) ? questions.map(question => question?.id).filter(Boolean) : []);
    return REQUIRED_SHOWCASE_QUESTION_IDS.filter(id => !available.has(id));
  }, [questions]);

  const slogan = getFormattedAnswer(questions, previewAnswers, 'projectSlogan', missingInfoLabel, language);
  const targetAudience = getFormattedAnswer(questions, previewAnswers, 'targetAudience', missingInfoLabel, language);
  const projectEnvironment = getFormattedAnswer(questions, previewAnswers, 'showcaseTheme', missingInfoLabel, language);
  const deploymentCountries = getFormattedDeploymentCountries(questions, previewAnswers, 'q27', language);
  const problemPainPoints = parseProblemPainPoints(getRawAnswer(previewAnswers, 'problemPainPoints'));

  const solutionDescription = getFormattedAnswer(questions, previewAnswers, 'solutionDescription', missingInfoLabel, language);
  const solutionDescriptionParts = useMemo(
    () => splitSolutionDescription(solutionDescription),
    [solutionDescription]
  );
  const solutionBenefits = splitRichTextIntoBlocks(getRawAnswer(previewAnswers, 'solutionBenefits'));

  const innovationProcess = getFormattedAnswer(questions, previewAnswers, 'innovationProcess', missingInfoLabel, language);
  const visionStatementEntries = useMemo(
    () => splitRichTextIntoBlocks(getRawAnswer(previewAnswers, 'visionStatement')),
    [previewAnswers]
  );
  const innovationProcessEntries = useMemo(
    () => splitRichTextIntoBlocks(getRawAnswer(previewAnswers, 'innovationProcess')),
    [previewAnswers]
  );
  const budgetEstimate = getFormattedAnswer(questions, previewAnswers, 'BUDGET', missingInfoLabel, language);
  const budgetUnitLabel = useMemo(() => {
    const budgetQuestion = findQuestionById(questions, 'BUDGET');
    const unitOptions = getNumberUnitOptions(budgetQuestion, language);
    const chosenUnit = budgetQuestion ? previewAnswers[buildNumberUnitAnswerId(budgetQuestion.id)] : undefined;
    if (typeof chosenUnit === 'string' && unitOptions.includes(chosenUnit)) {
      return chosenUnit;
    }
    const unit = resolveLocalizedText(budgetQuestion?.numberUnit, language).trim();
    return unit || 'K€';
  }, [questions, language, previewAnswers]);
  const normalizedTimelineDetails = useMemo(() => {
    if (Array.isArray(timelineDetails)) {
      return timelineDetails;
    }

    const analysisDetails = analysis?.timeline?.details;
    return Array.isArray(analysisDetails) ? analysisDetails : [];
  }, [analysis, timelineDetails]);

  const isBudgetMissing = isMissingInfoLabel(budgetEstimate);

  const budgetEstimateNumeric = useMemo(() => {
    if (!hasText(budgetEstimate) || isBudgetMissing) {
      return null;
    }
    const parsed = Number.parseFloat(budgetEstimate.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }, [budgetEstimate, isBudgetMissing]);

  // Le montant est un coût, pas un résultat : il n'emprunte plus le chiffre héroïque de la
  // section impact — ni sa taille, ni son dégradé, ni son compteur ascendant, qui racontaient
  // tous une valeur gagnée. Il ne reste ici que la valeur formatée et son unité, affichées
  // dans le panneau sobre de la feuille de route.
  const budgetValueText = useMemo(() => {
    if (!hasText(budgetEstimate)) {
      return '';
    }
    if (budgetEstimateNumeric !== null) {
      return formatNumberFR(budgetEstimateNumeric, {}, language);
    }
    return budgetEstimate.trim();
  }, [budgetEstimate, budgetEstimateNumeric, language]);

  const budgetDisplayUnit = useMemo(() => {
    if (isBudgetMissing || !hasText(budgetValueText)) {
      return '';
    }
    return budgetValueText.includes(budgetUnitLabel) ? '' : budgetUnitLabel;
  }, [budgetUnitLabel, budgetValueText, isBudgetMissing]);

  const impactFigureValue = useMemo(() => {
    const raw = getRawAnswer(previewAnswers, 'showcaseImpactFigure');
    return typeof raw === 'string' ? raw.trim() : '';
  }, [previewAnswers]);

  const impactFigureUnit = useMemo(() => {
    const raw = getRawAnswer(previewAnswers, 'showcaseImpactFigureUnit');
    return typeof raw === 'string' ? raw.trim() : '';
  }, [previewAnswers]);

  const impactFigureCaption = useMemo(() => {
    const raw = getRawAnswer(previewAnswers, 'showcaseImpactFigureCaption');
    return typeof raw === 'string' ? raw.trim() : '';
  }, [previewAnswers]);

  // Le compteur ascendant n'écrit que des entiers : le déclencher sur « 1,5 » ou « ×3 »
  // afficherait une autre valeur que celle saisie. Tout ce qui n'est pas un entier pur
  // s'affiche donc tel quel.
  const impactFigureCount = useMemo(() => {
    const parsed = Number.parseInt(impactFigureValue, 10);
    return Number.isFinite(parsed) && String(parsed) === impactFigureValue ? parsed : null;
  }, [impactFigureValue]);

  const hasImpactFigure = hasText(impactFigureValue);

  const teamLead = getFormattedAnswer(questions, previewAnswers, 'teamLead', missingInfoLabel, language);
  const teamLeadTeam = getFormattedAnswer(questions, previewAnswers, 'teamLeadTeam', missingInfoLabel, language);
  const teamCoreMembers = splitRichTextIntoBlocks(getRawAnswer(previewAnswers, 'teamCoreMembers'));

  const rawRunway = useMemo(() => computeRunway(previewAnswers, language), [previewAnswers, language]);
  const animatedWeeks = useAnimatedCounter(rawRunway?.weeks ?? null, { duration: 1200 });
  const animatedDays = useAnimatedCounter(rawRunway?.days ?? null, { duration: 1200 });
  const runway = useMemo(() => {
    if (!rawRunway) {
      return null;
    }

    return {
      ...rawRunway,
      weeksLabel: formatCountdownUnit(animatedWeeks, t('projectShowcase.weeksAbbrev')),
      daysLabel: formatCountdownUnit(animatedDays, t('projectShowcase.daysAbbrev'))
    };
  }, [rawRunway, animatedWeeks, animatedDays, t]);
  const timelineSummaries = useMemo(
    () => computeTimelineSummaries(normalizedTimelineDetails),
    [normalizedTimelineDetails]
  );
  const timelineProfiles = useMemo(
    () => extractTimelineProfiles(normalizedTimelineDetails),
    [normalizedTimelineDetails]
  );
  const vigilanceAlerts = useMemo(
    () =>
      buildVigilanceAlerts(
        analysis,
        questions,
        (teamId) => (teamNameById.has(teamId) ? teamNameById.get(teamId) : teamId || ''),
        language,
        t
      ),
    [analysis, questions, teamNameById, language, t]
  );
  const { summaries: timelineSummariesWithAlerts, unmatchedAlerts: unmatchedVigilanceAlerts } = useMemo(
    () => mergeTimelineSummariesWithAlerts(timelineSummaries, vigilanceAlerts),
    [timelineSummaries, vigilanceAlerts]
  );
  const manualMilestones = useMemo(
    () => buildManualMilestones(getRawAnswer(previewAnswers, 'roadmapMilestones'), language),
    [previewAnswers, language]
  );
  const heroHighlights = useMemo(
    () =>
      buildHeroHighlights({
        targetAudience,
        projectEnvironment,
        deploymentCountries,
        t
      }),
    [targetAudience, projectEnvironment, deploymentCountries, t]
  );

  const teamMemberCards = useMemo(
    () =>
      teamCoreMembers.map((entry, index) => {
        const raw = typeof entry === 'string' ? entry : String(entry ?? '');
        const normalized = raw.trim();

        if (normalized.length === 0) {
          return {
            id: `team-member-${index}`,
            name: t('projectShowcase.keyMemberFallback'),
            details: null,
            initials: '•',
            fullText: raw
          };
        }

        const separatorIndex = normalized.search(/[-–—:•]/);
        const name = separatorIndex > -1 ? normalized.slice(0, separatorIndex).trim() : normalized;
        const details = separatorIndex > -1 ? normalized.slice(separatorIndex + 1).trim() : '';
        const initials = name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(part => part[0]?.toUpperCase() || '')
          .join('');

        return {
          id: `team-member-${index}`,
          name: name || normalized,
          details: details.length > 0 ? details : null,
          initials: initials.length > 0 ? initials : (normalized[0]?.toUpperCase() ?? '•'),
          fullText: normalized
        };
      }),
    [teamCoreMembers, t]
  );

  const teamLeadInitials = useMemo(() => {
    const initials = String(teamLead ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('');
    return initials.length > 0 ? initials : '•';
  }, [teamLead]);

  useEffect(() => {
    if (missingShowcaseQuestions.length === 0) {
      return;
    }

    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        '[ProjectShowcase] Les questions suivantes sont absentes alors que la vitrine les attend :',
        missingShowcaseQuestions.join(', ')
      );
    }
  }, [missingShowcaseQuestions]);

  useEffect(() => {
    if (renderInStandalone || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event) => {
      // En édition, Échap désélectionne (voir le gestionnaire de raccourcis de l'éditeur) :
      // fermer la vitrine entière ferait perdre la session d'édition en cours.
      if (event.key === 'Escape' && !isLiveEditing) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLiveEditing, onClose, renderInStandalone]);

  useEffect(() => {
    if (renderInStandalone) {
      return;
    }

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [renderInStandalone]);


  const hasTimelineProfiles = Array.isArray(timelineProfiles) && timelineProfiles.length > 0;
  const hasManualMilestones = manualMilestones.length > 0;
  const timelineProfileEntries = useMemo(() => {
    if (!hasTimelineProfiles) {
      return [];
    }

    return timelineProfiles.map((profile, index) => ({
      id: profile.id || `profile-${index}`,
      label: profile.label,
      description: profile.description || ''
    }));
  }, [hasTimelineProfiles, timelineProfiles]);

  const manualTimelineEntries = useMemo(
    () =>
      manualMilestones.map((milestone, index) => {
        const hasDate = typeof milestone.formattedDate === 'string' && milestone.formattedDate.length > 0;
        const hasDescription = typeof milestone.description === 'string' && milestone.description.length > 0;
        const label = hasDate
          ? milestone.formattedDate
          : hasDescription
            ? milestone.description
            : t('projectShowcase.upcomingMilestoneFallback');
        const description = hasDate && hasDescription ? milestone.description : '';

        return {
          id: milestone.id || `manual-milestone-${index}`,
          label,
          description
        };
      }),
    [manualMilestones, t]
  );

  const timelineEntries = useMemo(
    () => [...timelineProfileEntries, ...manualTimelineEntries],
    [timelineProfileEntries, manualTimelineEntries]
  );
  const hasTimelineEntries = timelineEntries.length > 0;
  const timelineSummariesToDisplay = useMemo(() => {
    if (!hasTimelineProfiles) {
      return timelineSummariesWithAlerts;
    }

    return timelineSummariesWithAlerts.filter(summary => !summary.hasProfiles);
  }, [hasTimelineProfiles, timelineSummariesWithAlerts]);
  const hasTimelineSummaries = timelineSummariesToDisplay.length > 0;
  const hasVigilanceAlerts = unmatchedVigilanceAlerts.length > 0;
  // Le coût estimé vit désormais dans cette bande : elle doit s'afficher pour lui seul, même
  // quand aucun jalon n'est encore posé, sinon le montant disparaîtrait de la vitrine.
  const hasTimelineSection = Boolean(
    runway
      || hasTimelineSummaries
      || hasManualMilestones
      || hasTimelineProfiles
      || hasVigilanceAlerts
      || (hasText(budgetEstimate) && canShowBudget)
  );

  const renderSignatureSection = useCallback((sectionId, index) => {
    if (!shouldDisplaySection(sectionId)) {
      return null;
    }

    const key = `${sectionId}-${index}`;

    switch (sectionId) {
      case 'notice':
        if (hideNotice || !hasIncompleteAnswers) {
          return null;
        }
        return (
          <div key={key} className="sg-notice" data-showcase-section="notice">
            <div className="sg-notice__inner">
              {t('synthesisReport.incompleteAnswersMessage')}
            </div>
          </div>
        );

      case 'hero':
        return (
          <header
            key={key}
            className="sg-hero"
            data-showcase-section="hero"
            data-tour-id="showcase-hero"
          >
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv">{t('projectShowcase.heroEyebrow')}</p>
              <h1 className={`sg-hero__title ${missingInfoClass(safeProjectName)}`}>
                {isEditorChromeVisible ? (
                  <InlineRichText
                    value={typeof draftValues.projectName === 'string' ? draftValues.projectName : ''}
                    onChange={(nextValue) => handleFieldChange('projectName', nextValue)}
                    placeholder={t('projectShowcase.fieldFallbackLabels.projectName')}
                    ariaLabel={t('projectShowcase.fieldFallbackLabels.projectName')}
                  />
                ) : (
                  renderTextWithLinks(safeProjectName)
                )}
              </h1>
              {(hasText(slogan) || isEditorChromeVisible) && (
                <p className={`sg-hero__sub sg-rv ${missingInfoClass(slogan)}`} style={{ '--sg-d': '220ms' }}>
                  {isEditorChromeVisible ? (
                    <InlineRichText
                      value={typeof draftValues.projectSlogan === 'string' ? draftValues.projectSlogan : ''}
                      onChange={(nextValue) => handleFieldChange('projectSlogan', nextValue)}
                      placeholder={t('projectShowcase.fieldFallbackLabels.projectSlogan')}
                      ariaLabel={t('projectShowcase.fieldFallbackLabels.projectSlogan')}
                    />
                  ) : (
                    renderTextWithLinks(slogan)
                  )}
                </p>
              )}
              <div className="sg-hero__cta sg-rv" style={{ '--sg-d': '340ms' }}>
                <button
                  type="button"
                  className="sg-btn"
                  data-sg-ripple
                  data-sg-scroll-to="#sg-anchor-problem"
                >
                  {t('projectShowcase.heroCta')}
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {heroHighlights.length > 0 && (
                <div className="sg-chips sg-rv" style={{ '--sg-d': '460ms' }}>
                  {heroHighlights.map((highlight) => (
                    <div key={highlight.id} className="sg-chip">
                      <span className="sg-chip__label">{highlight.label}</span>
                      <span className={`sg-chip__value ${missingInfoClass(highlight.value)}`}>{highlight.value}</span>
                      {highlight.caption && <span className="sg-chip__caption">{highlight.caption}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="sg-cue sg-rv" style={{ '--sg-d': '600ms' }}>
                <span className="sg-cue__rail"><span className="sg-cue__dot" /></span>
                {t('projectShowcase.heroScrollCue')}
              </div>
            </div>
          </header>
        );

      case 'problem':
        if (problemPainPoints.length === 0) {
          return null;
        }
        return (
          <section key={key} id="sg-anchor-problem" className="sg-story" data-showcase-section="problem">
            <div className="sg-story__grid">
              <div className="sg-story__sticky">
                <p className="sg-eyebrow" style={{ '--sg-c': resolveSectionAccent('problem').onDark }}>{getSectionOptionLabel(t, 'problem')}</p>
                <h2 className="sg-headline">{t('projectShowcase.problemHeadline')}</h2>
                <p className="sg-story__counter" style={{ '--sg-c': resolveSectionAccent('problem').onDark }} data-sg-counter>01</p>
              </div>
              <div className="sg-story__steps">
                {problemPainPoints.map((point, pointIndex) => (
                  <p
                    key={`${point}-${pointIndex}`}
                    className="sg-story__step"
                    data-sg-story-step
                    data-sg-counter-step
                  >
                    {renderTextWithLinks(point)}
                  </p>
                ))}
              </div>
            </div>
          </section>
        );

      case 'solution':
        if (!hasText(solutionDescription)) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section="solution">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('solution').c }}>{t('projectShowcase.solutionEyebrow')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.solutionHeadline')}</h2>
              <div className="sg-rv" style={{ '--sg-d': '160ms' }}>
                <p className="sg-eyebrow" style={{ '--sg-c': resolveSectionAccent('solution').c }}>{t('projectShowcase.solutionInClear')}</p>
                {solutionDescriptionParts.items.length > 0 ? (
                  // l'accroche à gauche, la liste qu'elle annonce à droite : le texte contient
                  // déjà ces deux registres, on les sépare au lieu de les empiler dans une case
                  <div className="sg-solution-lead sg-solution-lead--split" style={{ '--sg-c': resolveSectionAccent('solution').g2 }}>
                    <p className={`sg-solution-lead__hook ${missingInfoClass(solutionDescription)}`}>
                      {renderTextWithLinks(solutionDescriptionParts.hook)}
                    </p>
                    <div>
                      {hasText(solutionDescriptionParts.listLabel) && (
                        <p className="sg-solution-lead__list-label">{renderTextWithLinks(solutionDescriptionParts.listLabel)}</p>
                      )}
                      <ul className="sg-rows" style={{ '--sg-c': resolveSectionAccent('solution').g2 }}>
                        {solutionDescriptionParts.items.map((item, itemIndex) => (
                          <li key={`${item}-${itemIndex}`}>
                            <span className="sg-rows__dot" />
                            <span>{renderTextWithLinks(item)}</span>
                          </li>
                        ))}
                      </ul>
                      {hasText(solutionDescriptionParts.trailing) && (
                        <p className="sg-solution-lead__trailing">{renderTextWithLinks(solutionDescriptionParts.trailing)}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // aucune liste detectee dans le texte : simple accroche ouverte, sans case
                  <div className="sg-solution-lead" style={{ '--sg-c': resolveSectionAccent('solution').g2 }}>
                    <p className={`sg-solution-lead__hook ${missingInfoClass(solutionDescription)}`}>
                      {renderTextWithLinks(solutionDescriptionParts.hook)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      case 'benefits':
        if (solutionBenefits.length === 0) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--cloud sg-band--pad" data-showcase-section="benefits">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('benefits').c }}>
                {t('projectShowcase.solutionBenefitsEyebrow')}
              </p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>
                {t('projectShowcase.solutionBenefitsHeadline')}
              </h2>
              <div className="sg-stack">
                {solutionBenefits.map((benefit, benefitIndex) => (
                  <div
                    key={`${benefit}-${benefitIndex}`}
                    className="sg-stack__slot sg-rv sg-rv--x"
                    style={{ '--sg-d': `${(benefitIndex % 3) * 90}ms` }}
                  >
                    <article
                      className="sg-card"
                      style={{
                        '--sg-c1': resolveSectionAccent('benefits').g1,
                        '--sg-c2': resolveSectionAccent('benefits').g2
                      }}
                    >
                      <span className="sg-card__orb" />
                      <div className="sg-card__top">
                        <span className="sg-card__idx">{String(benefitIndex + 1).padStart(2, '0')}</span>
                      </div>
                      <p className="sg-card__text">{renderTextWithLinks(benefit)}</p>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'objectives':
        if (!hasText(innovationProcess) && !hasImpactFigure) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--dark sg-band--pad" data-showcase-section="objectives">
            <div className={`sg-wrap sg-impact${innovationProcessEntries.length === 0 ? ' sg-impact--solo' : ''}`}>
              <div>
                <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('objectives').onDark }}>
                  {getSectionOptionLabel(t, 'objectives')}
                </p>
                <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.objectivesHeadline')}</h2>
                {hasImpactFigure && (
                  <div data-tour-id="showcase-impact-figure">
                    <p className="sg-impact__value sg-rv" style={{ '--sg-d': '160ms' }}>
                      {impactFigureCount !== null ? (
                        <span data-sg-count={impactFigureCount}>0</span>
                      ) : (
                        impactFigureValue
                      )}
                      {hasText(impactFigureUnit) && <span className="sg-impact__unit">{impactFigureUnit}</span>}
                    </p>
                    {hasText(impactFigureCaption) && (
                      <p className="sg-impact__caption sg-rv" style={{ '--sg-d': '240ms' }}>
                        {renderTextWithLinks(impactFigureCaption)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {innovationProcessEntries.length > 0 && (
                <div>
                  <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('objectives').onDark }}>{t('projectShowcase.objectivesListEyebrow')}</p>
                  <ul className="sg-rows sg-rows--dark" style={{ '--sg-c': resolveSectionAccent('objectives').onDark, marginTop: '1.4rem' }}>
                    {innovationProcessEntries.map((entry, entryIndex) => (
                      <li key={`${entry}-${entryIndex}`} className="sg-rv" style={{ '--sg-d': `${entryIndex * 70}ms` }}>
                        <span className="sg-rows__idx">{String(entryIndex + 1).padStart(2, '0')}</span>
                        <span>{renderTextWithLinks(entry)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        );

      case 'indicators':
        if (visionStatementEntries.length === 0) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--cloud sg-band--pad" data-showcase-section="indicators">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('indicators').c }}>{t('projectShowcase.valueIndicatorsEyebrow')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.valueIndicatorsHeadline')}</h2>
              <div className="sg-grid">
                {visionStatementEntries.map((entry, entryIndex) => (
                  <article
                    key={`${entry}-${entryIndex}`}
                    className="sg-tile sg-rv"
                    data-sg-tilt
                    style={{
                      '--sg-c': resolveSectionAccent('indicators').g1,
                      '--sg-g1': resolveSectionAccent('indicators').g1,
                      '--sg-g2': resolveSectionAccent('indicators').g2,
                      '--sg-d': `${entryIndex * 80}ms`
                    }}
                  >
                    <span className="sg-tile__glyph">{String(entryIndex + 1).padStart(2, '0')}</span>
                    <p className="sg-tile__text">{renderTextWithLinks(entry)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'team':
        if (!hasText(teamLead) && !hasText(teamLeadTeam) && teamCoreMembers.length === 0) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section="team">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': resolveSectionAccent('team').c }}>{getSectionOptionLabel(t, 'team')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.teamHeadline')}</h2>
              {hasText(teamLead) && (
                <div
                  className="sg-lead sg-rv"
                  style={{
                    '--sg-d': '160ms',
                    '--sg-g1': resolveSectionAccent('team').g1,
                    '--sg-g2': resolveSectionAccent('team').g2,
                    '--sg-p1': resolveSectionAccent('team').p1,
                    '--sg-p2': resolveSectionAccent('team').p2
                  }}
                >
                  <span className="sg-lead__ring">
                    <span>{teamLeadInitials}</span>
                  </span>
                  <span>
                    <span className={`sg-lead__name ${missingInfoClass(teamLead)}`}>{renderTextWithLinks(teamLead)}</span>
                    {hasText(teamLeadTeam) && <span className="sg-lead__role">{t('projectShowcase.pilotageTemplate', { team: teamLeadTeam })}</span>}
                  </span>
                </div>
              )}
              {teamMemberCards.length > 0 && (
                <ul
                  className="sg-rows sg-roster"
                  style={{
                    '--sg-c': resolveSectionAccent('team').c,
                    '--sg-g1': resolveSectionAccent('team').g1,
                    '--sg-g2': resolveSectionAccent('team').g2
                  }}
                >
                  {teamMemberCards.map((member, memberIndex) => (
                    <li
                      key={member.id ?? `${member.name}-${memberIndex}`}
                      className="sg-rv"
                      style={{ '--sg-d': `${memberIndex * 70}ms` }}
                    >
                      <span className="sg-roster__seal" aria-hidden="true">{member.initials}</span>
                      <span>
                        <span className="sg-roster__name">{renderTextWithLinks(member.name)}</span>
                        {member.details && <span className="sg-roster__role">{renderTextWithLinks(member.details)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );

      case 'timeline':
        if (!hasTimelineSection) {
          return null;
        }
        return (
          <section
            key={key}
            className="sg-band sg-band--dark sg-band--pad"
            data-showcase-section="timeline"
            data-tour-id="showcase-roadmap"
          >
            <div className="sg-wrap">
              <div className="sg-road-head">
                <div>
                  <p className="sg-eyebrow sg-rv">{getSectionOptionLabel(t, 'timeline')}</p>
                  <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.roadmapHeadline')}</h2>
                </div>
                {/* Le coût rejoint les conditions de réalisation qu'il partage avec le calendrier,
                    au lieu de trôner dans la section impact où sa seule taille le faisait lire
                    comme un gain attendu. */}
                {hasText(budgetEstimate) && canShowBudget && (
                  <aside
                    data-tour-id="showcase-budget"
                    className={`sg-cost sg-rv${isEditorChromeVisible && isSectionHiddenInLight('budget') ? ' sge-muted-block' : ''}`}
                    style={{ '--sg-d': '160ms' }}
                  >
                    {isEditorChromeVisible && isSectionHiddenInLight('budget') && (
                      <span className="sge-muted-block__flag">{t('projectShowcase.editor.hiddenInLight')}</span>
                    )}
                    <p className="sg-cost__label">{t('projectShowcase.budgetLabel')}</p>
                    <p className={`sg-cost__value${isBudgetMissing ? ' sg-cost__value--missing' : ''}`}>
                      <span>{budgetValueText}</span>
                      {hasText(budgetDisplayUnit) && <span className="sg-cost__unit">{budgetDisplayUnit}</span>}
                    </p>
                    <p className="sg-cost__caption">{t('projectShowcase.budgetCaption')}</p>
                  </aside>
                )}
              </div>
              {/* Chaque jalon porte sa pastille et son segment de trait (::before/::after) : le
                  repère et le contenu vivent dans la même boîte, donc plus rien à recaler entre
                  deux éléments. Un <span> enfant direct d'un <ol> était par ailleurs un balisage
                  que le modèle de contenu HTML n'autorise pas. */}
              {(runway || hasTimelineSummaries || hasVigilanceAlerts || hasTimelineEntries) && (
              <ol className="sg-road">
                {runway && (
                  <li className="sg-road__item sg-road__item--start">
                    <p className="sg-road__date">{runway.launchLabel}</p>
                    <p className="sg-road__big">
                      {runway.isOverdue
                        ? t('projectShowcase.launchAlreadyHappenedTemplate', { date: runway.launchLabel })
                        : runway.isToday
                          ? t('projectShowcase.launchTodayBigTemplate', { date: runway.launchLabel })
                          : t('projectShowcase.countdownBigTemplate', { weeks: runway.weeksLabel, days: runway.daysLabel, date: runway.launchLabel })}
                    </p>
                  </li>
                )}

                {hasTimelineSummaries &&
                  timelineSummariesToDisplay.map((summary, summaryIndex) => {
                    const summaryRuleLabel = summary?.alert?.ruleName || summary?.ruleName;
                    const alertTitle = summary?.alert?.title;
                    return (
                      <li
                        key={summary.id || `sg-summary-${summaryIndex}`}
                        className={`sg-road__item ${summary.satisfied ? '' : 'sg-road__item--warn'}`}
                      >
                        {summaryRuleLabel && <p className="sg-road__date">{renderTextWithLinks(summaryRuleLabel)}</p>}
                        {alertTitle && <p className="sg-road__title">{renderTextWithLinks(alertTitle)}</p>}
                        {summary.satisfied ? (
                          <p className="sg-road__title">{t('projectShowcase.weeksAndDaysTemplate', { weeks: summary.weeks, days: summary.days })}</p>
                        ) : (
                          <div className="sg-warn">
                            {summary.alert?.teamLabel && (
                              <p className="sg-warn__tag">{t('projectShowcase.referentTeamInlineTemplate', { team: summary.alert.teamLabel })}</p>
                            )}
                            {summary.alert?.requirementSummary && (
                              <p>{renderTextWithLinks(summary.alert.requirementSummary)}</p>
                            )}
                            {summary.alert?.statusMessage && (
                              <p>{renderTextWithLinks(summary.alert.statusMessage)}</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}

                {hasVigilanceAlerts &&
                  unmatchedVigilanceAlerts.map((alert) => (
                    <li key={alert.id} className="sg-road__item sg-road__item--warn">
                      <p className="sg-road__date">{alert.ruleName}</p>
                      <p className="sg-road__title">{renderTextWithLinks(alert.title)}</p>
                      <div className="sg-warn">
                        {alert.teamLabel && <p className="sg-warn__tag">{t('projectShowcase.referentTeamInlineTemplate', { team: alert.teamLabel })}</p>}
                        {alert.requirementSummary && <p>{alert.requirementSummary}</p>}
                        {alert.statusMessage && <p>{alert.statusMessage}</p>}
                      </div>
                    </li>
                  ))}

                {hasTimelineEntries &&
                  timelineEntries.map((entry, entryIndex) => (
                    <li key={entry.id || `sg-entry-${entryIndex}`} className="sg-road__item">
                      <p className="sg-road__date">{entry.label}</p>
                      {entry.description && (
                        <p className="sg-road__title">{renderTextWithLinks(entry.description)}</p>
                      )}
                    </li>
                  ))}
              </ol>
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  }, [
    budgetDisplayUnit,
    budgetEstimate,
    budgetValueText,
    canShowBudget,
    hasImpactFigure,
    hasIncompleteAnswers,
    hasTimelineEntries,
    hasTimelineSection,
    hasTimelineSummaries,
    hasVigilanceAlerts,
    isSectionHiddenInLight,
    draftValues.projectName,
    draftValues.projectSlogan,
    handleFieldChange,
    heroHighlights,
    hideNotice,
    innovationProcess,
    isEditorChromeVisible,
    impactFigureCaption,
    impactFigureCount,
    impactFigureUnit,
    impactFigureValue,
    innovationProcessEntries,
    problemPainPoints,
    runway,
    safeProjectName,
    shouldDisplaySection,
    slogan,
    solutionBenefits,
    solutionDescription,
    teamCoreMembers,
    teamLead,
    teamLeadInitials,
    teamLeadTeam,
    teamMemberCards,
    timelineEntries,
    timelineSummariesToDisplay,
    unmatchedVigilanceAlerts,
    visionStatementEntries,
    t
  ]);

  // Le visualiseur Office intégré est celui du tenant : il lui faut l'adresse du site courant.
  const documentEmbedContext = useMemo(() => ({
    origin: getOrigin(),
    webUrl: getWebUrl(),
    isSharePoint: isSharePointMode()
  }), []);

  // chaque gabarit personnalisé reprend une section existante : aucune forme nouvelle,
  // seule la famille de couleur choisie par l'utilisateur change.
  const renderCustomSectionSignature = useCallback((section, index, options = {}) => {
    if (!section) {
      return null;
    }

    // Les vignettes du sélecteur et l'aperçu fantôme réutilisent ce rendu : ils passent
    // `editable: false` pour rester de simples images de ce qui sera obtenu.
    const editable = Boolean(options.editable);
    const editText = (field, value, { placeholder = '', ariaLabel = '', className = '' } = {}) => {
      if (!editable) {
        return renderTextWithLinks(value);
      }

      return (
        <InlineRichText
          value={typeof value === 'string' ? value : ''}
          onChange={(nextValue) => handleCustomSectionFieldChange(section.id, field, nextValue)}
          placeholder={placeholder}
          ariaLabel={ariaLabel || placeholder}
          className={className}
        />
      );
    };
    const editListEntry = (field, listIndex, value, placeholder) => {
      if (!editable) {
        return renderTextWithLinks(value);
      }

      const onChange = field === 'items'
        ? (nextValue) => handleCustomSectionItemChange(section.id, listIndex, nextValue)
        : (nextValue) => handleCustomSectionColumnChange(section.id, listIndex, nextValue);

      return (
        <InlineRichText
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          placeholder={placeholder}
          ariaLabel={placeholder}
        />
      );
    };

    const type = section.type || SECTION_TEMPLATES[0].id;
    const templateConfig = resolveTemplateConfig(type);
    // le badge ne s'affiche que si un champ le rend saisissable, sinon il serait
    // rendu sans jamais pouvoir être renseigné
    const showAccent = Boolean(templateConfig.showBadge || templateConfig.showAccent);
    const family = resolveAccentFamily(section.accentFamily, accentFamilies);
    const key = section.id || `custom-${index}`;
    const title = section.title || t('projectShowcase.untitledSectionFallback');
    const columnCount = resolveCustomSectionColumnCount(section.columnCount, section.columns);
    const columns = normalizeCustomSectionColumns(section.columns);
    // une colonne ou un item saisi avec des sauts de ligne (Entrée dans l'éditeur
    // riche) doit produire plusieurs blocs distincts, pas un seul bloc recollé
    const activeColumns = columns.flatMap(column => splitRichTextIntoBlocks(column));
    const items = Array.isArray(section.items)
      ? section.items.filter(Boolean).flatMap(item => splitRichTextIntoBlocks(item))
      : [];
    // En édition, les entrées affichées doivent être celles du modèle : après découpage en
    // blocs, l'index rendu ne désigne plus la valeur à modifier. L'aperçu (touche P) montre
    // le découpage réel.
    // Un bloc vide est posé d'office en édition : sans lui, une section basculée vers ce
    // gabarit depuis un autre s'afficherait comme une bande vide, sans rien où écrire.
    const renderedColumns = editable ? (columns.length > 0 ? columns : ['']) : activeColumns;
    const renderedItems = editable
      ? (Array.isArray(section.items) ? section.items : [])
      : items;

    const tileVars = { '--sg-c': family.c, '--sg-g1': family.g1, '--sg-g2': family.g2 };

    // BRIQUE C — panneau : « Bloc mise en avant »
    if (type === 'highlight') {
      return (
        <section
          key={key}
          className="sg-band sg-band--light sg-band--pad"
          data-showcase-section={type}
        >
          <div className="sg-wrap">
            <div
              className="sg-panel sg-rv"
              style={{ '--sg-c': family.c, '--sg-p1': family.p1, '--sg-p2': family.p2 }}
            >
              {showAccent && (editable || section.accent) && (
                <p className="sg-eyebrow" style={{ '--sg-c': family.c }}>
                  {editText('accent', section.accent, {
                    placeholder: t('projectShowcase.badgeFieldLabel')
                  })}
                </p>
              )}
              <p className="sg-panel__lead">
                {editText('title', section.title, {
                  placeholder: t('projectShowcase.titlePlaceholderFallback')
                })}
              </p>
              {section.description && (
                <p className="sg-panel__body">{renderTextWithLinks(section.description)}</p>
              )}
            </div>
          </div>
        </section>
      );
    }

    // « Bloc narratif » — reprend la mise en page de « Le problème » (sg-story) : eyebrow +
    // titre en colonne collante, texte découpé en étapes défilantes. Les étapes n'utilisent
    // jamais data-sg-counter-step : ce marqueur alimente le compteur unique de la section
    // « problème » (voir ShowcaseSignatureFx) et le partager ferait dérailler son numéro.
    if (type === 'story') {
      const storySteps = editable
        ? [section.description || '']
        : splitRichTextIntoBlocks(section.description || '');
      return (
        <section key={key} className="sg-story" data-showcase-section={type}>
          <div className="sg-story__grid">
            <div className="sg-story__sticky">
              <p className="sg-eyebrow" style={{ '--sg-c': family.c }}>
                {t('projectShowcase.templates.story.name')}
              </p>
              <h2 className="sg-headline">
                {editText('title', section.title, {
                  placeholder: t('projectShowcase.titlePlaceholderFallback')
                })}
              </h2>
              <p className="sg-story__counter" style={{ '--sg-c': family.c }}>
                {String(index + 1).padStart(2, '0')}
              </p>
            </div>
            <div className="sg-story__steps sg-story__steps--compact">
              {storySteps.map((step, stepIndex) => (
                <p
                  key={`${key}-step-${stepIndex}`}
                  className={editable ? 'sg-story__step is-on' : 'sg-story__step'}
                  {...(editable ? {} : { 'data-sg-story-step': true })}
                >
                  {editable
                    ? editText('description', section.description, {
                        placeholder: t('projectShowcase.templates.story.placeholderDescription')
                      })
                    : renderTextWithLinks(step)}
                </p>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // BRIQUE A (chiffre) — reprend la mise en page de « Notre impact »
    if (type === 'figure') {
      return (
        <section key={key} className="sg-band sg-band--dark sg-band--pad" data-showcase-section={type}>
          <div className="sg-wrap sg-impact">
            <div>
              {showAccent && (editable || section.accent) && (
                <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.onDark }}>
                  {editText('accent', section.accent, {
                    placeholder: t('projectShowcase.badgeFieldLabel')
                  })}
                </p>
              )}
              <h2 className="sg-headline sg-headline--sm sg-rv" style={{ '--sg-d': '80ms' }}>
                {editText('title', section.title, {
                  placeholder: t('projectShowcase.titlePlaceholderFallback')
                })}
              </h2>
              {(editable || section.figure) && (
                <p className="sg-impact__value sg-impact__value--sm sg-rv" style={{ '--sg-d': '160ms' }}>
                  {editText('figure', section.figure, {
                    placeholder: t('projectShowcase.figureFieldLabel')
                  })}
                </p>
              )}
            </div>
            {section.description && (
              <div>
                <p className="sg-impact__caption sg-rv" style={{ '--sg-d': '240ms', fontSize: '1.15rem' }}>
                  {renderTextWithLinks(section.description)}
                </p>
              </div>
            )}
          </div>
        </section>
      );
    }

    // BRIQUE B — grille de cartes claires : « Bloc multi-colonnes »
    if (type === 'columns') {
      return (
        <section key={key} className="sg-band sg-band--cloud sg-band--pad" data-showcase-section={type}>
          <div className="sg-wrap">
            {(editable || section.subtitle) && (
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>
                {editText('subtitle', section.subtitle, {
                  placeholder: t('projectShowcase.subtitlePlaceholderFallback')
                })}
              </p>
            )}
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>
              {editText('title', section.title, {
                placeholder: t('projectShowcase.titlePlaceholderFallback')
              })}
            </h2>
            {renderedColumns.length > 0 && (
              <div className="sg-grid" data-sg-columns={columnCount} style={{ '--sg-cols': columnCount }}>
                {renderedColumns.map((column, columnIndex) => (
                  <article
                    key={`${key}-col-${columnIndex}`}
                    className="sg-tile sg-rv"
                    data-sg-tilt
                    style={{ ...tileVars, '--sg-d': `${columnIndex * 80}ms` }}
                  >
                    <span className="sg-tile__glyph">{String(columnIndex + 1).padStart(2, '0')}</span>
                    <p className="sg-tile__text">
                      {editListEntry(
                        'columns',
                        columnIndex,
                        column,
                        t('projectShowcase.columnBlockPlaceholderTemplate', { index: columnIndex + 1 })
                      )}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    // BRIQUE D — liste à filets : « Points d’attention »
    if (type === 'checklist') {
      return (
        <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section={type}>
          <div className="sg-wrap">
            <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>{t('projectShowcase.templates.checklist.name')}</p>
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>
              {editText('title', section.title, {
                placeholder: t('projectShowcase.titlePlaceholderFallback')
              })}
            </h2>
            {section.description && <p className="sg-lede sg-rv" style={{ '--sg-d': '160ms' }}>{renderTextWithLinks(section.description)}</p>}
            {renderedItems.length > 0 && (
              <ul className="sg-rows" style={{ '--sg-c': family.c, marginTop: '1.6rem' }}>
                {renderedItems.map((item, itemIndex) => (
                  <li key={`${key}-item-${itemIndex}`} className="sg-rv" style={{ '--sg-d': `${itemIndex * 70}ms` }}>
                    <span className="sg-rows__tick" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>
                      {editListEntry('items', itemIndex, item, t('projectShowcase.itemPlaceholder'))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      );
    }

    // BRIQUE A — grille de cartes : reprend « Notre solution »
    if (type === 'stack') {
      return (
        <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section={type}>
          <div className="sg-wrap">
            {(editable || section.subtitle) && (
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>
                {editText('subtitle', section.subtitle, {
                  placeholder: t('projectShowcase.subtitlePlaceholderFallback')
                })}
              </p>
            )}
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>
              {editText('title', section.title, {
                placeholder: t('projectShowcase.titlePlaceholderFallback')
              })}
            </h2>
            {renderedItems.length > 0 && (
              <div className="sg-stack">
                {renderedItems.map((item, itemIndex) => (
                  <div
                    key={`${key}-card-${itemIndex}`}
                    className="sg-stack__slot sg-rv sg-rv--x"
                    style={{ '--sg-d': `${(itemIndex % 3) * 90}ms` }}
                  >
                    <article className="sg-card" style={{ '--sg-c1': family.g1, '--sg-c2': family.g2 }}>
                      <span className="sg-card__orb" />
                      <div className="sg-card__top">
                        <span className="sg-card__idx">{String(itemIndex + 1).padStart(2, '0')}</span>
                      </div>
                      <p className="sg-card__text">
                        {editListEntry('items', itemIndex, item, t('projectShowcase.itemPlaceholder'))}
                      </p>
                    </article>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    // Visionneuse documentaire — seul gabarit à conserver une forme propre
    const isImage = IMAGE_DOCUMENT_TYPES.includes(section.documentType);
    const documentEmbedSrc = isImage
      ? ''
      : resolveDocumentEmbedSrc(section.documentUrl, section.documentType, documentEmbedContext);
    return (
      <section key={key} className="sg-band sg-band--cloud sg-band--pad" data-showcase-section={type}>
        <div className="sg-wrap">
          <div className="sg-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <article className="sg-tile sg-rv" style={tileVars}>
              <span className="sg-tile__glyph" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </span>
              {showAccent && (editable || section.accent) && (
                <span className="sg-tile__pill">
                  {editText('accent', section.accent, {
                    placeholder: t('projectShowcase.accentPlaceholderFallback')
                  })}
                </span>
              )}
              <p className="sg-tile__title">
                {editText('title', section.title, {
                  placeholder: t('projectShowcase.titlePlaceholderFallback')
                })}
              </p>
              {(editable || section.subtitle) && (
                <p className="sg-tile__text sg-tile__text--muted">
                  {editText('subtitle', section.subtitle, {
                    placeholder: t('projectShowcase.subtitlePlaceholderFallback')
                  })}
                </p>
              )}
              {section.description && (
                <p className="sg-tile__text sg-tile__text--muted">{renderTextWithLinks(section.description)}</p>
              )}
              <div className="sg-doc">
                {section.documentUrl ? (
                  isImage ? (
                    <img
                      className="sg-doc__image"
                      src={section.documentUrl}
                      alt={t('projectShowcase.documentAltTemplate', { title })}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : documentEmbedSrc ? (
                    <iframe
                      className="sg-doc__frame"
                      title={t('projectShowcase.documentAltTemplate', { title })}
                      src={documentEmbedSrc}
                      loading="lazy"
                    />
                  ) : (
                    // Format bureautique hors mode SharePoint : aucun convertisseur Office n'est
                    // joignable (voir documentEmbed.js), le lien d'ouverture reste le seul accès.
                    <div className="sg-doc__empty" style={{ '--sg-c': family.c }}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                      <span>{t('projectShowcase.documentReadyLabel')}</span>
                    </div>
                  )
                ) : (
                  <div className="sg-doc__empty" style={{ '--sg-c': family.c }}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                    <span>{t('projectShowcase.noDocumentLinked')}</span>
                    <span className="sg-doc__url">{t('projectShowcase.addSharePointLinkHint')}</span>
                  </div>
                )}
              </div>
              {section.documentUrl && (
                <div className="sg-doc__bar">
                  <span>{t('projectShowcase.sharePointSourceTemplate', { type: section.documentType?.toUpperCase() || 'DOC' })}</span>
                  <a
                    className="sg-doc__link"
                    style={{ '--sg-c': family.c }}
                    href={section.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('projectShowcase.openInNewTabLink')}
                  </a>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>
    );
  }, [accentFamilies, documentEmbedContext, handleCustomSectionColumnChange, handleCustomSectionFieldChange, handleCustomSectionItemChange, t]);

  // Pendant l'édition, le canvas lit les sections *non assainies* : `sanitizeCustomSections`
  // supprime une section devenue entièrement vide, ce qui la ferait disparaître sous les
  // doigts de l'utilisateur au moment où il efface son dernier caractère.
  const canvasCustomSectionMap = isEditorChromeVisible ? customSectionFormMap : customSectionMap;

  // La vignette du sélecteur est le composant réel de la vitrine, réduit à l'échelle :
  // les anciennes vignettes en fil de fer gris ne montraient ni la typographie, ni la
  // palette, ni la forme réellement obtenues.
  const renderTemplatePreview = useCallback(
    (templateId) =>
      renderCustomSectionSignature(
        buildSectionFromTemplate(t, templateId, `template-preview-${templateId}`),
        0
      ),
    [renderCustomSectionSignature, t]
  );

  const getTemplateLabel = useCallback(
    (templateId) => {
      const meta = getTemplateMeta(t, templateId);
      return { name: meta.name, description: meta.description };
    },
    [t]
  );

  const ghostSection = useMemo(
    () => (ghostTemplateId ? buildSectionFromTemplate(t, ghostTemplateId, '__ghost__') : null),
    [ghostTemplateId, t]
  );

  const sectionEntries = useMemo(
    () =>
      sectionOrder.map((sectionId, index) => {
        const custom = canvasCustomSectionMap.get(sectionId);
        const option = SHOWCASE_SECTION_OPTIONS.find(section => section.id === sectionId);
        const title = custom
          ? toPlainText(custom.title) || t('projectShowcase.customBlockFallback')
          : option
            ? getSectionOptionLabel(t, option.id)
            : sectionId;

        return {
          id: sectionId,
          index,
          isCustom: Boolean(custom),
          // « notice » n'a aucun champ : elle s'affiche d'elle-même selon l'état du projet.
          // Lui proposer de « renseigner ses champs » serait une fausse piste.
          hasEditableFields: Boolean(custom) || (sectionFieldsById[sectionId] || []).length > 0,
          plainTitle: title,
          templateLabel: custom ? getTemplateMeta(t, custom.type).name : '',
          isHiddenInLight: isSectionHiddenInLight(sectionId),
          node: custom
            ? renderCustomSectionSignature(custom, index, { editable: isEditorChromeVisible })
            : renderSignatureSection(sectionId, index)
        };
      }),
    [
      canvasCustomSectionMap,
      isEditorChromeVisible,
      isSectionHiddenInLight,
      renderCustomSectionSignature,
      renderSignatureSection,
      sectionFieldsById,
      sectionOrder,
      t
    ]
  );

  const isDragActive = canvasDragIndex !== null;

  // `'end'` est la valeur posée par les appelants qui ignorent la longueur courante de la
  // vitrine (le guide interactif). Sans cette résolution, aucun interstice ne se
  // reconnaissait comme ouvert et le sélecteur ne s'affichait jamais.
  const resolvedInserterIndex = useMemo(
    () => (inserterIndex === 'end' ? sectionOrder.length : inserterIndex),
    [inserterIndex, sectionOrder.length]
  );

  const renderInserter = useCallback(
    (index) => (
      <SectionInserter
        key={`sge-insert-${index}`}
        index={index}
        isOpen={resolvedInserterIndex === index}
        onOpen={handleOpenSectionPicker}
        onClose={handleCloseSectionPicker}
        templates={SECTION_TEMPLATES}
        renderTemplatePreview={renderTemplatePreview}
        getTemplateLabel={getTemplateLabel}
        onInsert={handleInsertTemplate}
        onHoverTemplate={setGhostTemplateId}
        isDragActive={isDragActive}
        isDropTarget={canvasDropIndex === index}
        onDropSection={handleCanvasDrop}
      />
    ),
    [
      canvasDropIndex,
      getTemplateLabel,
      handleCanvasDrop,
      handleCloseSectionPicker,
      handleInsertTemplate,
      handleOpenSectionPicker,
      isDragActive,
      renderTemplatePreview,
      resolvedInserterIndex
    ]
  );

  const previewContent = useMemo(() => {
    if (!isEditorChromeVisible) {
      return (
        <div className="sg-sections" data-tour-id="showcase-preview">
          {sectionEntries
            .filter(entry => entry.node && shouldDisplaySection(entry.id))
            .map(entry => entry.node)}
        </div>
      );
    }

    const nodes = [];

    const pushInserter = (index) => {
      nodes.push(renderInserter(index));
      // Aperçu fantôme : le gabarit survolé apparaît à sa place définitive, dans le thème
      // du projet, avant même d'avoir été ajouté.
      if (ghostSection && resolvedInserterIndex === index) {
        nodes.push(
          <div className="sge-ghost" key={`sge-ghost-${index}`} aria-hidden="true">
            {renderCustomSectionSignature(ghostSection, index)}
          </div>
        );
      }
    };

    pushInserter(0);
    sectionEntries.forEach((entry, index) => {
      // « notice » n'a ni champ ni réglage : c'est un message purement automatique (voir
      // hasEditableFields plus haut). Lui dédier un cadre vide en édition n'apprendrait rien
      // à l'utilisateur et ajouterait un bloc noir sans contenu au milieu du canevas.
      if (entry.id === 'notice') {
        return;
      }
      nodes.push(
        <SectionFrame
          key={`sge-frame-${entry.id}`}
          sectionId={entry.id}
          title={entry.plainTitle}
          templateLabel={entry.templateLabel}
          index={index}
          total={sectionEntries.length}
          isCustom={entry.isCustom}
          isActive={activeSectionId === entry.id}
          isHiddenInLight={entry.isHiddenInLight}
          isDragging={canvasDragIndex === index}
          onSelect={handleSelectSection}
          onMove={handleMoveSection}
          onDuplicate={handleDuplicateCustomSection}
          onRemove={handleRemoveCustomSection}
          onToggleVisibility={handleToggleSectionVisibility}
          onDragStart={handleCanvasDragStart}
          onDragEnd={handleCanvasDragEnd}
        >
          {entry.node || (
            <div className="sge-frame__empty">
              <p className="sge-frame__empty-title">{entry.plainTitle}</p>
              <p className="sge-frame__empty-text">
                {entry.hasEditableFields
                  ? t('projectShowcase.editor.emptySectionHint')
                  : t('projectShowcase.editor.autoSectionHint')}
              </p>
            </div>
          )}
        </SectionFrame>
      );
      pushInserter(index + 1);
    });

    return (
      <div className="sg-sections sge-canvas" data-tour-id="showcase-preview">
        {nodes}
      </div>
    );
  }, [
    activeSectionId,
    canvasDragIndex,
    ghostSection,
    handleCanvasDragEnd,
    handleCanvasDragStart,
    handleDuplicateCustomSection,
    handleMoveSection,
    handleRemoveCustomSection,
    handleSelectSection,
    handleToggleSectionVisibility,
    isEditorChromeVisible,
    renderCustomSectionSignature,
    renderInserter,
    resolvedInserterIndex,
    sectionEntries,
    shouldDisplaySection,
    t
  ]);

  // Corps du panneau de sélection des sections visibles en mode Light, ouvert depuis le
  // bouton « Configurer » hors édition. En édition, cette sélection se fait section par
  // section depuis le Plan (ShowcaseOutline), qui a l'avantage de rester visible pendant
  // qu'on ajuste — pas besoin d'un second panneau redondant dans la barre d'édition.
  const lightConfigPanelBody = !isLightConfigOpen ? null : (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{t('projectShowcase.visibleSectionsLightTitle')}</p>
          <p className="text-xs text-gray-600">{t('projectShowcase.visibleSectionsLightHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSelectAllSections}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            {t('projectShowcase.selectAllButton')}
          </button>
          <button
            type="button"
            onClick={handleCancelLightConfig}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300"
          >
            {t('projectShowcase.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleValidateLightConfig}
            className="rounded-full border border-blue-200 bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            {t('projectShowcase.validateButton')}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LIGHT_VISIBILITY_OPTIONS.map(section => {
          const checkboxId = `light-section-${section.id}`;
          const isChecked = pendingLightSections[section.id] !== false;
          return (
            <label
              key={section.id}
              htmlFor={checkboxId}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200"
            >
              <input
                id={checkboxId}
                name={checkboxId}
                type="checkbox"
                checked={isChecked}
                onChange={() => handleTogglePendingSection(section.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-800">{getSectionOptionLabel(t, section.id)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const modeSelectionPanel = resolvedDisplayModeLock || !canConfigureDisplayModes ? null : (
    <div className="sge sge-surface mb-6" data-tour-id="showcase-display-modes">
      <div
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        role="group"
        aria-label={t('projectShowcase.modeSelectionAriaLabel')}
      >
        <div>
          <p className="sge-eyebrow">{t('projectShowcase.usageModeEyebrow')}</p>
          <p className="sge-subtitle" style={{ marginTop: '0.25rem' }}>
            {t('projectShowcase.usageModeHint')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-tour-id="showcase-display-mode-buttons">
          <div className="sge-segment">
            <button
              type="button"
              onClick={() => handleDisplayModeChange('light')}
              className="sge-segment__item"
              aria-pressed={isLightMode}
            >
              {t('projectShowcase.lightModeButton')}
              <span className="sge-segment__count">{selectedLightSectionsCount}/{lightVisibilityIds.length}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDisplayModeChange('full')}
              className="sge-segment__item"
              aria-pressed={!isLightMode}
            >
              {t('projectShowcase.fullModeButton')}
            </button>
          </div>
          <button type="button" onClick={handleOpenLightConfig} className="sge-btn sge-btn--outline">
            {t('projectShowcase.configureButton')}
          </button>
        </div>
      </div>

      {lightConfigPanelBody && <div className="sge-divider p-4">{lightConfigPanelBody}</div>}
    </div>
  );

  const extraVisibilityOptions = useMemo(
    () =>
      LIGHT_VISIBILITY_OPTIONS
        .filter(option => !sectionOrder.includes(option.id))
        .map(option => ({
          id: option.id,
          label: getSectionOptionLabel(t, option.id),
          isHiddenInLight: isSectionHiddenInLight(option.id)
        })),
    [isSectionHiddenInLight, sectionOrder, t]
  );

  const applyEditorSnapshot = useCallback((snapshot) => {
    if (!snapshot) {
      return;
    }
    // Le drapeau empêche l'effet d'historique de ré-empiler l'état qu'il vient de restaurer,
    // ce qui rendrait « annuler » incapable de remonter au-delà d'un cran.
    isTimeTravellingRef.current = true;
    setDraftValues(snapshot.draftValues || {});
    setCustomSections(Array.isArray(snapshot.customSections) ? snapshot.customSections : []);
    setSectionOrder(Array.isArray(snapshot.sectionOrder) ? snapshot.sectionOrder : []);
    setSectionAccentsDraft(normalizeSectionAccents(snapshot.sectionAccents));
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndoHistory(editorHistory)) {
      return;
    }
    const next = undoHistory(editorHistory);
    setEditorHistory(next);
    applyEditorSnapshot(next.present);
  }, [applyEditorSnapshot, editorHistory]);

  const handleRedo = useCallback(() => {
    if (!canRedoHistory(editorHistory)) {
      return;
    }
    const next = redoHistory(editorHistory);
    setEditorHistory(next);
    applyEditorSnapshot(next.present);
  }, [applyEditorSnapshot, editorHistory]);

  useEffect(() => {
    if (!isLiveEditing) {
      return undefined;
    }

    if (isTimeTravellingRef.current) {
      isTimeTravellingRef.current = false;
      return undefined;
    }

    // Les frappes successives sont regroupées en un seul pas : sans ce délai, Ctrl+Z ne
    // défairait qu'un caractère à la fois et l'historique serait inutilisable.
    const timer = setTimeout(() => {
      setEditorHistory(previous => (
        previous.present === editorSnapshot ? previous : pushHistory(previous, editorSnapshot)
      ));
    }, 600);

    return () => clearTimeout(timer);
  }, [editorSnapshot, isLiveEditing]);

  useEffect(() => {
    if (!isLiveEditing) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (hasUnpublishedChanges) {
        saveShowcaseDraft(projectId, editorSnapshot);
      } else {
        clearShowcaseDraft(projectId);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [editorSnapshot, hasUnpublishedChanges, isLiveEditing, projectId]);

  // Brouillon laissé par une session précédente : on ne le réapplique jamais d'office —
  // la vitrine peut être consultée par quelqu'un qui n'a rien à voir avec cette édition.
  useEffect(() => {
    if (!canEdit) {
      setPendingDraft(null);
      return;
    }
    const stored = loadShowcaseDraft(projectId);
    setPendingDraft(stored && stored.draftValues ? stored : null);
  }, [canEdit, projectId]);

  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    const restoredCustomSections = sanitizeCustomSections(pendingDraft.customSections);
    const restoredOrder = normalizeSectionOrder(pendingDraft.sectionOrder, restoredCustomSections);
    const restoredDraftValues = pendingDraft.draftValues || {};
    const restoredSectionAccents = normalizeSectionAccents(pendingDraft.sectionAccents);

    setDraftValues(restoredDraftValues);
    setCustomSections(restoredCustomSections);
    setSectionOrder(restoredOrder);
    setSectionAccentsDraft(restoredSectionAccents);
    setEditorHistory(createHistory({
      draftValues: restoredDraftValues,
      customSections: restoredCustomSections,
      sectionOrder: restoredOrder,
      sectionAccents: restoredSectionAccents
    }));
    isTimeTravellingRef.current = true;
    setHasRestoredDraft(true);
    setPendingDraft(null);
    setActiveSectionId(null);
    setIsInspectorExpanded(prefersSideInspector());
    setIsPreviewingInEditor(false);
    setIsExitConfirmOpen(false);
    setIsEditing(true);
  }, [pendingDraft]);

  const handleDiscardStoredDraft = useCallback(() => {
    clearShowcaseDraft(projectId);
    setPendingDraft(null);
  }, [projectId]);

  const handleRequestExit = useCallback(() => {
    if (hasUnpublishedChanges) {
      setIsExitConfirmOpen(true);
      return;
    }
    handleCancelEditing();
  }, [handleCancelEditing, hasUnpublishedChanges]);

  const handleDiscardEditing = useCallback(() => {
    clearShowcaseDraft(projectId);
    setHasRestoredDraft(false);
    handleCancelEditing();
  }, [handleCancelEditing, projectId]);

  useEffect(() => {
    if (!isLiveEditing || typeof document === 'undefined') {
      return undefined;
    }

    const handleEditorKeyDown = (event) => {
      const target = event.target;
      const isTextEntry = Boolean(
        target
        && (target.isContentEditable
          || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      );

      // Dans un champ, on laisse le navigateur faire son propre annuler : reprendre la main
      // ferait perdre la frappe en cours au lieu de la corriger.
      if (isTextEntry) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        setIsPreviewingInEditor(previous => !previous);
      } else if (event.key === 'Escape') {
        setInserterIndex(null);
        setGhostTemplateId(null);
        setActiveSectionId(null);
      }
    };

    document.addEventListener('keydown', handleEditorKeyDown);

    return () => {
      document.removeEventListener('keydown', handleEditorKeyDown);
    };
  }, [handleRedo, handleUndo, isLiveEditing]);

  const renderCustomSectionControls = (section) => {
            const templateConfig = resolveTemplateConfig(section.type);
            const sectionTitle = section.title || t('projectShowcase.customBlockFallback');
            const annotationSectionId = section.type || 'custom';

            return (
              <div
                key={`custom-section-${section.id}`}
                id={`sge-group-${section.id}`}
                className="sge-field sge-field--wide"
                data-annotation-target-section={annotationSectionId}
              >
                <div className="flex flex-col gap-1">
                  <p className="sge-field__label">{renderTextWithLinks(sectionTitle)}</p>
                  <p className="text-xs text-gray-500">{t('projectShowcase.customBlockFallback')}</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-title`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.titleFieldLabel')}
                    </label>
                    <RichTextEditor
                      id={`custom-section-${section.id}-title`}
                      value={section.title || ''}
                      onChange={(nextValue) => handleCustomSectionFieldChange(section.id, 'title', nextValue)}
                      placeholder={t('projectShowcase.titlePlaceholderFallback')}
                      compact
                      ariaLabel={t('projectShowcase.titleBlockAriaLabel')}
                    />
                  </div>
                </div>
                {templateConfig.showSubtitle && (
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-subtitle`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.subtitleFieldLabel')}
                    </label>
                    <RichTextEditor
                      id={`custom-section-${section.id}-subtitle`}
                      value={section.subtitle || ''}
                      onChange={(nextValue) => handleCustomSectionFieldChange(section.id, 'subtitle', nextValue)}
                      placeholder={t('projectShowcase.subtitlePlaceholderFallback')}
                      compact
                      ariaLabel={t('projectShowcase.subtitleBlockAriaLabel')}
                    />
                  </div>
                )}
                {templateConfig.showBadge && (
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-badge`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.badgeFieldLabel')}
                    </label>
                    <RichTextEditor
                      id={`custom-section-${section.id}-badge`}
                      value={section.accent || ''}
                      onChange={(nextValue) => handleCustomSectionFieldChange(section.id, 'accent', nextValue)}
                      placeholder={t('projectShowcase.badgeFieldLabel')}
                      compact
                      ariaLabel={t('projectShowcase.badgeBlockAriaLabel')}
                    />
                  </div>
                )}
                {templateConfig.showAccent && (
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-accent`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.accentFieldLabel')}
                    </label>
                    <RichTextEditor
                      id={`custom-section-${section.id}-accent`}
                      value={section.accent || ''}
                      onChange={(nextValue) => handleCustomSectionFieldChange(section.id, 'accent', nextValue)}
                      placeholder={t('projectShowcase.accentPlaceholderFallback')}
                      compact
                      ariaLabel={t('projectShowcase.accentBlockAriaLabel')}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">{t('projectShowcase.colorFamilyLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {accentFamilies.map((family, familyIndex) => {
                      const isActive =
                        (normalizeAccentFamilyId(section.accentFamily) || THEME_ACCENT_FAMILY_ID) === family.id;
                      return (
                        <button
                          key={`custom-section-${section.id}-family-${family.id}`}
                          type="button"
                          onClick={() => handleCustomSectionFieldChange(section.id, 'accentFamily', family.id)}
                          aria-pressed={isActive}
                          className="sge-swatch"
                        >
                          <span
                            className="sge-swatch__dot"
                            style={{ background: `linear-gradient(135deg, ${family.g1}, ${family.g2})` }}
                          />
                          {getColorFamilyLabel(t, family, familyIndex)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {section.type === 'figure' && (
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-figure`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.figureFieldLabel')}
                    </label>
                    <input
                      id={`custom-section-${section.id}-figure`}
                      type="text"
                      value={section.figure || ''}
                      onChange={(event) => handleCustomSectionFieldChange(section.id, 'figure', event.target.value)}
                      placeholder="87 %"
                      className="sge-input"
                    />
                  </div>
                )}
                {templateConfig.showColumns && (
                  <div className="space-y-1">
                    <label htmlFor={`custom-section-${section.id}-column-count`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.columnCountLabel')}
                    </label>
                    <select
                      id={`custom-section-${section.id}-column-count`}
                      value={resolveCustomSectionColumnCount(section.columnCount, section.columns)}
                      onChange={(event) => handleCustomSectionColumnCountChange(section.id, event.target.value)}
                      className="sge-input"
                    >
                      {Array.from({ length: MAX_CUSTOM_SECTION_COLUMNS }, (_, index) => (
                        <option key={`custom-section-${section.id}-column-${index + 1}`} value={index + 1}>
                          {t(index + 1 > 1 ? 'projectShowcase.columnCountOptionPlural' : 'projectShowcase.columnCountOptionSingular', { count: index + 1 })}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">{t('projectShowcase.columnCountHint')}</p>
                  </div>
                )}
                {templateConfig.showDocument && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        {t('projectShowcase.documentUrlLabel')}
                      </label>
                      {documentUploadErrors[section.id] && (
                        <p className="text-xs text-red-600">{documentUploadErrors[section.id]}</p>
                      )}
                      {section.documentUrl ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                          <a
                            href={section.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-blue-600 hover:underline"
                          >
                            {t('projectShowcase.documentUploadedLabel')}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              handleCustomSectionFieldChange(section.id, 'documentUrl', '');
                              handleCustomSectionFieldChange(section.id, 'documentType', 'pdf');
                            }}
                            className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                          >
                            {t('projectShowcase.removeDocumentButton')}
                          </button>
                        </div>
                      ) : (
                        <label className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-3 text-center text-sm font-medium text-blue-700 hover:bg-blue-100">
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(event) => {
                              handleDocumentUpload(
                                section.id,
                                (field, value) => handleCustomSectionFieldChange(section.id, field, value),
                                event.target.files
                              );
                              event.target.value = '';
                            }}
                          />
                          {t('projectShowcase.chooseDocumentButton')}
                        </label>
                      )}
                    </div>
                  </>
                )}
                {templateConfig.showDescription && (
                  <div className="mt-4 space-y-1">
                    <label htmlFor={`custom-section-${section.id}-description`} className="text-sm font-medium text-gray-800">
                      {t('projectShowcase.descriptionFieldLabel')}
                    </label>
                    <RichTextEditor
                      id={`custom-section-${section.id}-description`}
                      value={section.description || ''}
                      onChange={(nextValue) => handleCustomSectionFieldChange(section.id, 'description', nextValue)}
                      placeholder={t('projectShowcase.descriptionPlaceholderFallback')}
                      ariaLabel={t('projectShowcase.descriptionSectionAriaLabel')}
                    />
                  </div>
                )}
                {templateConfig.showColumns && (() => {
                  const storedBlocks = normalizeCustomSectionColumns(section.columns);
                  // même repli que le canvas : toujours un bloc où écrire
                  const columnBlocks = storedBlocks.length > 0 ? storedBlocks : [''];

                  return (
                    <div className="mt-4 space-y-3">
                      <label className="sge-field__label">{t('projectShowcase.columnBlocksLabel')}</label>
                      <div className="space-y-3">
                        {columnBlocks.map((column, columnIndex) => (
                          <div key={`${section.id}-column-${columnIndex}`} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-500">
                                {t('projectShowcase.columnBlockNumberLabel', { index: columnIndex + 1 })}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCustomSectionColumnRemove(section.id, columnIndex)}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-red-200 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                                {t('projectShowcase.removeButton')}
                              </button>
                            </div>
                            <RichTextEditor
                              id={`custom-section-${section.id}-column-${columnIndex}`}
                              value={column}
                              onChange={(nextValue) => handleCustomSectionColumnChange(section.id, columnIndex, nextValue)}
                              placeholder={t('projectShowcase.columnBlockPlaceholderTemplate', { index: columnIndex + 1 })}
                              compact
                              ariaLabel={t('projectShowcase.columnBlockNumberLabel', { index: columnIndex + 1 })}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCustomSectionColumnAdd(section.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        {t('projectShowcase.addColumnBlockButton')}
                      </button>
                    </div>
                  );
                })()}
                {templateConfig.showItems && (
                  <div className="mt-4 space-y-3">
                    <label className="sge-field__label">
                      {section.type === 'stack'
                        ? t('projectShowcase.stackItemsLabel')
                        : t('projectShowcase.listItemsLabel')}
                    </label>
                    {Array.isArray(section.items) && section.items.length > 0 ? (
                      <div className="space-y-3">
                        {section.items.map((item, itemIndex) => (
                          <div key={`${section.id}-item-${itemIndex}`} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-500">{t('projectShowcase.itemNumberLabel', { index: itemIndex + 1 })}</p>
                              <button
                                type="button"
                                onClick={() => handleCustomSectionItemRemove(section.id, itemIndex)}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-red-200 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                                {t('projectShowcase.removeButton')}
                              </button>
                            </div>
                            <RichTextEditor
                              id={`custom-section-${section.id}-items-${itemIndex}`}
                              value={item}
                              onChange={(nextValue) => handleCustomSectionItemChange(section.id, itemIndex, nextValue)}
                              placeholder={t('projectShowcase.itemPlaceholder')}
                              compact
                              ariaLabel={t('projectShowcase.itemAriaLabelTemplate', { index: itemIndex + 1 })}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">{t('projectShowcase.noItemAddedYet')}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCustomSectionItemAdd(section.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      {t('projectShowcase.addItemButton')}
                    </button>
                  </div>
                )}
              </div>
            );
  };

  const renderStandardFieldControl = (field) => {
          const fieldId = field.id;
          const question = field.question;
          const type = question?.type || field.fallbackType || 'text';
          const label = resolveLocalizedText(question?.question, language) || (field.fallbackLabelKey ? t(`projectShowcase.fieldFallbackLabels.${field.fallbackLabelKey}`) : fieldId);
          const fieldValue = draftValues[fieldId];
          // Les entrées {value, label} sont indispensables ici : les réponses stockées
          // (answers/draftValues) portent le code de l'option (ex. "grand_public"), pas son
          // libellé traduit (ex. "Grand public") — utiliser les libellés comme identifiants
          // dans le formulaire d'édition (comme avant) désynchronise la sélection affichée
          // de la vraie réponse du questionnaire.
          const optionEntries = getQuestionOptionEntries(question, { language });
          const isLong = type === 'long_text';
          const isRichText = type === 'text' || type === 'long_text';
          const isMulti = type === 'multi_choice';
          const isChoice = type === 'choice';
          const isDate = type === 'date';
          const isMilestoneList = type === 'milestone_list';
          const isMultiWithOptions = isMulti && optionEntries.length > 0;
          const isMultiFreeform = isMulti && !isMultiWithOptions;
          const isChoiceWithOptions = isChoice && optionEntries.length > 0;
          const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
          const textValue = typeof fieldValue === 'string' ? fieldValue : '';
          const placeholder =
            typeof question?.placeholder === 'string' && question.placeholder.trim() !== ''
              ? question.placeholder.trim()
              : isLong
                ? t('projectShowcase.richTextPlaceholderLong')
                : t('projectShowcase.richTextPlaceholderShort');
          // Champs propres à la vitrine (sans question au questionnaire) : leur intitulé seul
          // ne dit pas quoi y mettre, d'où un exemple posé dans le champ lui-même.
          const plainPlaceholder = field.fallbackPlaceholderKey
            ? t(`projectShowcase.fieldPlaceholders.${field.fallbackPlaceholderKey}`)
            : undefined;
          const helperText = isMilestoneList
            ? t('projectShowcase.milestoneHelperText')
            : isMultiWithOptions
              ? t('projectShowcase.multiWithOptionsHelper')
              : isMultiFreeform
                ? t('projectShowcase.multiFreeformHelper')
                : fieldId === 'showcaseImpactFigure'
                  ? t('projectShowcase.impactFigureHelper')
                  : ['problemPainPoints', 'solutionBenefits', 'teamCoreMembers', 'visionStatement'].includes(fieldId)
                    ? t('projectShowcase.lineByLineHelper')
                    : null;

          const milestoneDraftEntries = isMilestoneList && Array.isArray(fieldValue) ? fieldValue : [];

          const updateMilestoneDraft = (updater) => {
            handleFieldChange(fieldId, previousValue => {
              const previousEntries = Array.isArray(previousValue)
                ? previousValue.map(entry => ({
                    date: typeof entry?.date === 'string' ? entry.date : '',
                    description: typeof entry?.description === 'string' ? entry.description : ''
                  }))
                : [];
              const nextEntries = typeof updater === 'function' ? updater(previousEntries) : updater;
              // La frise est chronologique par construction : saisir une date replace
              // aussitôt le jalon au bon endroit, ici comme dans le canvas.
              return Array.isArray(nextEntries) ? sortMilestonesChronologically(nextEntries) : [];
            });
          };

          const handleMilestoneDraftChange = (index, fieldName, value) => {
            updateMilestoneDraft(entries => {
              const nextEntries = entries.map((entry, entryIndex) => (
                entryIndex === index ? { ...entry, [fieldName]: value } : entry
              ));
              return nextEntries;
            });
          };

          const handleMilestoneDraftRemoval = (index) => {
            updateMilestoneDraft(entries => entries.filter((_, entryIndex) => entryIndex !== index));
          };

          const handleMilestoneDraftAddition = () => {
            updateMilestoneDraft(entries => [...entries, { date: '', description: '' }]);
          };

          const handleMilestoneDragStart = (index, event) => {
            if (event?.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              try {
                event.dataTransfer.setData('text/plain', String(index));
              } catch (_error) {
                // Certains navigateurs peuvent empêcher l’écriture : on ignore l’erreur.
              }
            }

            setMilestoneDragState({
              fieldId,
              sourceIndex: index,
              targetIndex: index
            });
          };

          const handleMilestoneDragEnter = (index) => {
            setMilestoneDragState(previous => {
              if (previous.fieldId !== fieldId || previous.targetIndex === index) {
                return previous;
              }

              return {
                ...previous,
                targetIndex: index
              };
            });
          };

          const handleMilestoneDragLeave = (index, event) => {
            if (event?.currentTarget?.contains(event?.relatedTarget)) {
              return;
            }

            setMilestoneDragState(previous => {
              if (previous.fieldId !== fieldId || previous.targetIndex !== index) {
                return previous;
              }

              return {
                ...previous,
                targetIndex: previous.sourceIndex
              };
            });
          };

          const handleMilestoneDragOver = (event) => {
            if (milestoneDragState.fieldId === fieldId) {
              event.preventDefault();
              if (event?.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }
            }
          };

          const handleMilestoneDrop = (index, event) => {
            if (milestoneDragState.fieldId !== fieldId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            setMilestoneDragState(previous => {
              if (previous.fieldId !== fieldId || typeof previous.sourceIndex !== 'number') {
                return createEmptyMilestoneDragState();
              }

              const rawTargetIndex = typeof index === 'number' ? index : previous.targetIndex;

              if (typeof rawTargetIndex !== 'number') {
                return createEmptyMilestoneDragState();
              }

              updateMilestoneDraft(entries => {
                if (!Array.isArray(entries) || entries.length <= 1) {
                  return Array.isArray(entries) ? entries : [];
                }

                const boundedSourceIndex = Math.max(0, Math.min(entries.length - 1, previous.sourceIndex));
                const maxTargetIndex = entries.length;
                const normalizedTargetIndex = Math.max(0, Math.min(maxTargetIndex, rawTargetIndex));

                let insertionIndex = normalizedTargetIndex;
                if (boundedSourceIndex < normalizedTargetIndex) {
                  insertionIndex = normalizedTargetIndex - 1;
                }

                const workingEntries = entries.slice();
                const [movedEntry] = workingEntries.splice(boundedSourceIndex, 1);

                if (!movedEntry) {
                  return entries;
                }

                const safeInsertionIndex = Math.max(0, Math.min(workingEntries.length, insertionIndex));
                workingEntries.splice(safeInsertionIndex, 0, movedEntry);

                return workingEntries;
              });

              return createEmptyMilestoneDragState();
            });
          };

          const handleMilestoneDragEnd = () => {
            resetMilestoneDragState();
          };

          const isDropTargetAtEnd =
            milestoneDragState.fieldId === fieldId && milestoneDragState.targetIndex === milestoneDraftEntries.length;

          const annotationSectionId = FIELD_SECTION_MAP[fieldId];

          return (
            <div
              key={fieldId}
              className={`sge-field${isLong || isMulti || isMilestoneList ? ' sge-field--wide' : ''}`}
              data-annotation-target-section={annotationSectionId || undefined}
            >
              <label htmlFor={`showcase-edit-${fieldId}`} className="sge-field__label">
                {label}
              </label>
              {isMilestoneList ? (
                <div className="sge-ms-list">
                  {milestoneDraftEntries.length === 0 && (
                    <p className="sge-field__helper">{t('projectShowcase.noMilestoneYet')}</p>
                  )}
                  {milestoneDraftEntries.map((entry, index) => {
                    const dateInputId = `showcase-edit-${fieldId}-date-${index}`;
                    const descriptionInputId = `showcase-edit-${fieldId}-description-${index}`;
                    const isCurrentDragging =
                      milestoneDragState.fieldId === fieldId && milestoneDragState.sourceIndex === index;
                    const isCurrentDropTarget =
                      milestoneDragState.fieldId === fieldId &&
                      milestoneDragState.targetIndex === index &&
                      milestoneDragState.sourceIndex !== index;
                    // Un jalon daté tient sa place de sa date : le laisser saisissable
                    // offrirait un déplacement que le tri chronologique défait aussitôt.
                    const isDraggableEntry =
                      milestoneDraftEntries.length > 1 && !hasChronologicalDate(entry?.date);
                    const milestoneRowClasses = [
                      'sge-ms-row',
                      isCurrentDragging ? 'sge-ms-row--dragging' : '',
                      isCurrentDropTarget ? 'sge-ms-row--drop-target' : ''
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={dateInputId}
                        className={milestoneRowClasses}
                        draggable={isDraggableEntry}
                        onDragStart={event => handleMilestoneDragStart(index, event)}
                        onDragEnter={() => handleMilestoneDragEnter(index)}
                        onDragLeave={event => handleMilestoneDragLeave(index, event)}
                        onDragOver={handleMilestoneDragOver}
                        onDrop={event => handleMilestoneDrop(index, event)}
                        onDragEnd={handleMilestoneDragEnd}
                        aria-grabbed={isCurrentDragging ? 'true' : 'false'}
                      >
                        <div className="sge-ms-row__date">
                          <label htmlFor={dateInputId} className="sge-ms-label">
                            {t('projectShowcase.dateLabel')}
                          </label>
                          <input
                            id={dateInputId}
                            type="date"
                            value={typeof entry?.date === 'string' ? entry.date : ''}
                            onChange={event => handleMilestoneDraftChange(index, 'date', event.target.value)}
                            className="sge-input"
                          />
                        </div>
                        <div className="sge-ms-row__description">
                          <label htmlFor={descriptionInputId} className="sge-ms-label">
                            {t('projectShowcase.descriptionFieldLabel')}
                          </label>
                          <input
                            id={descriptionInputId}
                            type="text"
                            value={typeof entry?.description === 'string' ? entry.description : ''}
                            onChange={event => handleMilestoneDraftChange(index, 'description', event.target.value)}
                            className="sge-input"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMilestoneDraftRemoval(index)}
                          className="sge-ms-remove"
                        >
                          <Trash2 className="sge-ms-remove__icon" />
                          {t('projectShowcase.removeButton')}
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleMilestoneDraftAddition}
                    className={`sge-ms-add${isDropTargetAtEnd ? ' sge-ms-add--drop-target' : ''}`}
                    onDragEnter={() => handleMilestoneDragEnter(milestoneDraftEntries.length)}
                    onDragLeave={event => handleMilestoneDragLeave(milestoneDraftEntries.length, event)}
                    onDragOver={handleMilestoneDragOver}
                    onDrop={event => handleMilestoneDrop(milestoneDraftEntries.length, event)}
                  >
                    <Plus className="sge-ms-add__icon" />
                    {t('projectShowcase.addMilestoneButton')}
                  </button>
                </div>
              ) : isDate ? (
                <input
                  id={`showcase-edit-${fieldId}`}
                  type="date"
                  value={typeof fieldValue === 'string' ? fieldValue : ''}
                  onChange={event => handleFieldChange(fieldId, event.target.value)}
                  className="sge-input"
                />
              ) : isMultiWithOptions ? (
                <div className="sge-choice-grid">
                  {optionEntries.map((entry, optionIndex) => {
                    const optionId = `showcase-edit-${fieldId}-option-${optionIndex}`;
                    const isChecked = selectedValues.includes(entry.value);

                    return (
                      <label
                        key={optionId}
                        htmlFor={optionId}
                        className={`sge-choice${isChecked ? ' sge-choice--active' : ''}`}
                      >
                        <input
                          id={optionId}
                          type="checkbox"
                          value={entry.value}
                          checked={isChecked}
                          onChange={event => {
                            const { checked } = event.target;
                            handleFieldChange(fieldId, previousValue => {
                              const previousSelections = Array.isArray(previousValue) ? previousValue : [];
                              const selectionSet = new Set(previousSelections);

                              if (checked) {
                                selectionSet.add(entry.value);
                              } else {
                                selectionSet.delete(entry.value);
                              }

                              if (optionEntries.length > 0) {
                                return optionEntries
                                  .map(candidate => candidate.value)
                                  .filter(value => selectionSet.has(value));
                              }

                              return Array.from(selectionSet);
                            });
                          }}
                          className="sge-choice__checkbox"
                        />
                        <span className="sge-choice__text">{entry.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : isChoiceWithOptions ? (
                <select
                  id={`showcase-edit-${fieldId}`}
                  value={textValue}
                  onChange={event => handleFieldChange(fieldId, event.target.value)}
                  className="sge-input"
                >
                  <option value="">{t('projectShowcase.selectOptionPlaceholder')}</option>
                  {optionEntries.map(entry => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              ) : isRichText ? (
                <RichTextEditor
                  id={`showcase-edit-${fieldId}`}
                  value={textValue}
                  onChange={(nextValue) => handleFieldChange(fieldId, nextValue)}
                  placeholder={placeholder}
                  compact={!isLong}
                  ariaLabel={t('projectShowcase.richTextAriaLabelTemplate', { label })}
                />
              ) : isMultiFreeform ? (
                <textarea
                  id={`showcase-edit-${fieldId}`}
                  value={textValue}
                  onChange={event => handleFieldChange(fieldId, event.target.value)}
                  rows={isMultiFreeform ? 4 : 5}
                  className="sge-input sge-input--textarea"
                />
              ) : (
                <input
                  id={`showcase-edit-${fieldId}`}
                  type="text"
                  value={textValue}
                  placeholder={plainPlaceholder}
                  onChange={event => handleFieldChange(fieldId, event.target.value)}
                  className="sge-input"
                />
              )}
              {helperText && <p className="sge-field__helper">{helperText}</p>}
            </div>
          );
  };

  const activeSectionEntry = sectionEntries.find(entry => entry.id === activeSectionId) || null;
  const activeCustomSection = activeSectionId ? customSectionFormMap.get(activeSectionId) : null;
  const activeStandardFields = activeSectionId ? (sectionFieldsById[activeSectionId] || []) : [];
  const activeAccentGroupIds = activeSectionId ? (ACCENT_SECTION_GROUPS[activeSectionId] || []) : [];

  const sectionColorPicker = activeAccentGroupIds.length > 0 ? (
    <div className="sge-inspector__group">
      <p className="sge-field__label">{t('projectShowcase.sectionAccentsTitle')}</p>
      <p className="sge-field__helper">{t('projectShowcase.sectionAccentsHint')}</p>
      <div className="flex flex-col gap-3">
        {activeAccentGroupIds.map((sectionId) => (
          <div key={`accent-${sectionId}`} className="flex flex-col gap-1.5">
            {activeAccentGroupIds.length > 1 && (
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {getSectionOptionLabel(t, sectionId)}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {accentFamilies.map((family, familyIndex) => {
                const activeId = sectionAccentsDraft[sectionId] || THEME_ACCENT_FAMILY_ID;
                return (
                  <button
                    key={`accent-${sectionId}-${family.id}`}
                    type="button"
                    onClick={() => handleSectionAccentChange(sectionId, family.id)}
                    aria-pressed={activeId === family.id}
                    className="sge-swatch"
                  >
                    <span
                      className="sge-swatch__dot"
                      style={{ background: `linear-gradient(135deg, ${family.g1}, ${family.g2})` }}
                    />
                    {getColorFamilyLabel(t, family, familyIndex)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const inspectorPanel = isEditorChromeVisible ? (
    <aside
      className={`sge sge-inspector${isInspectorExpanded ? '' : ' sge-inspector--collapsed'}`}
      data-tour-id="showcase-edit-panel"
      aria-label={t('projectShowcase.editor.inspectorTitle')}
    >
      <form id={formId} onSubmit={handleSubmitEdit} className="sge-inspector__form">
        <div className="sge-inspector__header">
          <div className="sge-inspector__heading">
            <p className="sge-eyebrow">{t('projectShowcase.editor.inspectorTitle')}</p>
            <h3 className="sge-title">
              {activeSectionEntry
                ? activeSectionEntry.plainTitle
                : t('projectShowcase.editor.inspectorEmptyTitle')}
            </h3>
          </div>
          <div className="sge-inspector__actions">
            {/* Ne sert qu'en feuille basse (sous 1180px), où l'inspecteur recouvre le
                canvas : masqué en CSS dès que c'est une colonne à part entière. */}
            <button
              type="button"
              className="sge-icon-btn sge-inspector__collapse"
              aria-expanded={isInspectorExpanded}
              aria-label={
                isInspectorExpanded
                  ? t('projectShowcase.editor.collapseInspector')
                  : t('projectShowcase.editor.expandInspector')
              }
              title={
                isInspectorExpanded
                  ? t('projectShowcase.editor.collapseInspector')
                  : t('projectShowcase.editor.expandInspector')
              }
              onClick={() => setIsInspectorExpanded(previous => !previous)}
            >
              {isInspectorExpanded ? '▾' : '▴'}
            </button>
            {activeSectionEntry && (
              <button
                type="button"
                className="sge-btn sge-btn--ghost sge-btn--sm"
                onClick={() => {
                  setActiveSectionId(null);
                  setIsInspectorExpanded(prefersSideInspector());
                }}
              >
                {t('projectShowcase.closeButton')}
              </button>
            )}
          </div>
        </div>

        <div className="sge-inspector__body">
          {!activeSectionEntry && (
            <p className="sge-inspector__empty">{t('projectShowcase.editor.inspectorEmptyHint')}</p>
          )}

          {activeSectionEntry && activeCustomSection && (
            <React.Fragment>
              <div className="sge-inspector__group">
                <p className="sge-field__label">{t('projectShowcase.editor.changeTemplate')}</p>
                <div className="sge-tplswitch" role="group" aria-label={t('projectShowcase.editor.changeTemplate')}>
                  {SECTION_TEMPLATES.map(template => {
                    const isCurrent = (activeCustomSection.type || SECTION_TEMPLATES[0].id) === template.id;
                    return (
                      <button
                        key={`tpl-switch-${template.id}`}
                        type="button"
                        className={`sge-tplswitch__item${isCurrent ? ' sge-tplswitch__item--on' : ''}`}
                        aria-pressed={isCurrent}
                        onClick={() => handleCustomSectionFieldChange(activeCustomSection.id, 'type', template.id)}
                      >
                        <span className="sge-tplswitch__thumb" aria-hidden="true">
                          <span className="sge-tplswitch__thumb-inner">
                            {renderTemplatePreview(template.id)}
                          </span>
                        </span>
                        <span className="sge-tplswitch__name">{getTemplateMeta(t, template.id).name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {renderCustomSectionControls(activeCustomSection)}
            </React.Fragment>
          )}

          {activeSectionEntry && !activeCustomSection && (
            <React.Fragment>
              {sectionColorPicker}
              {activeStandardFields.length > 0 ? (
                <div className="sge-inspector__fields">
                  {activeStandardFields.map(field => renderStandardFieldControl(field))}
                </div>
              ) : (
                !sectionColorPicker && (
                  <p className="sge-inspector__empty">{t('projectShowcase.editor.noSettingsForSection')}</p>
                )
              )}
            </React.Fragment>
          )}
        </div>

        <p className="sge-inspector__hint">{t('projectShowcase.editor.inlineHint')}</p>
      </form>
    </aside>
  ) : null;

  const outlinePanel = isEditorChromeVisible && isOutlineOpen ? (
    <ShowcaseOutline
      sections={sectionEntries}
      activeSectionId={activeSectionId}
      onSelect={handleSelectSection}
      onToggleVisibility={handleToggleSectionVisibility}
      onMove={handleMoveSection}
      onInsertAt={handleOpenSectionPicker}
      onClose={() => setIsOutlineOpen(false)}
      isDragActive={canvasDragIndex !== null}
      dropIndex={canvasDropIndex}
      onDragStart={handleCanvasDragStart}
      onDragEnd={handleCanvasDragEnd}
      onDropSection={handleCanvasDrop}
      extraVisibilityOptions={extraVisibilityOptions}
    />
  ) : null;

  const editorBar = isLiveEditing ? (
    <ShowcaseEditorBar
      projectName={safeProjectName}
      isDirty={hasUnpublishedChanges}
      hasRestoredDraft={hasRestoredDraft}
      canUndo={canUndoHistory(editorHistory)}
      canRedo={canRedoHistory(editorHistory)}
      onUndo={handleUndo}
      onRedo={handleRedo}
      isPreviewing={isPreviewingInEditor}
      onTogglePreview={() => setIsPreviewingInEditor(previous => !previous)}
      isOutlineOpen={isOutlineOpen}
      onToggleOutline={() => setIsOutlineOpen(previous => !previous)}
      displayMode={displayMode}
      onDisplayModeChange={handleDisplayModeChange}
      canConfigureDisplayModes={canConfigureDisplayModes && !resolvedDisplayModeLock}
      isExitConfirmOpen={isExitConfirmOpen}
      onRequestExit={handleRequestExit}
      onCancelExit={() => setIsExitConfirmOpen(false)}
      onDiscard={handleDiscardEditing}
      onPublish={() => handleSubmitEdit()}
    />
  ) : null;

  const draftBanner = canEdit && !isEditing && pendingDraft ? (
    <div className="sge sge-draft" role="status">
      <div>
        <p className="sge-eyebrow">{t('projectShowcase.editor.draftFoundEyebrow')}</p>
        <p className="sge-draft__text">{t('projectShowcase.editor.draftFoundText')}</p>
      </div>
      <div className="sge-draft__actions">
        <button
          type="button"
          className="sge-btn sge-btn--ghost sge-btn--sm"
          onClick={handleDiscardStoredDraft}
        >
          {t('projectShowcase.editor.draftDiscard')}
        </button>
        <button
          type="button"
          className="sge-btn sge-btn--primary sge-btn--sm"
          onClick={handleResumeDraft}
        >
          {t('projectShowcase.editor.draftResume')}
        </button>
      </div>
    </div>
  ) : null;

  const editBar =
    canEdit && !isEditing ? (
      <div className="sge sge-bar">
        <button
          type="button"
          onClick={handleStartEditing}
          className="sge-btn sge-btn--outline sge-bar__trigger"
          data-tour-id="showcase-edit-trigger"
        >
          <Edit className="sge-btn__icon" />
          {t('projectShowcase.editTriggerButton')}
        </button>
      </div>
    ) : null;

  const workspaceClassName = [
    'sge-workspace',
    outlinePanel ? 'sge-workspace--outline' : '',
    inspectorPanel ? 'sge-workspace--inspector' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <ShowcaseSignatureFx rootRef={signatureRootRef} themeId={showcaseThemeId} />
      {draftBanner}
      {/* En édition, la bascule Light/complète vit dans la barre supérieure — y compris
          pendant l'aperçu, sinon deux commandes porteraient le même repère de visite. */}
      {!isLiveEditing && modeSelectionPanel}
      {editBar}
      {editorBar}
      {isEditorChromeVisible ? (
        <div className={workspaceClassName}>
          {outlinePanel}
          <div className="sge-workspace__canvas">{previewContent}</div>
          {inspectorPanel}
        </div>
      ) : (
        previewContent
      )}
    </>
  );

  // `sg-shell--editing` neutralise les animations de révélation : sinon une section
  // fraîchement insérée resterait invisible (opacity 0) faute d'avoir été observée, et
  // l'utilisateur éditerait un bloc qu'il ne voit pas.
  const shellClassName = `sg-shell${isEditorChromeVisible ? ' sg-shell--editing' : ''}`;
  const shellStandaloneClassName = 'sg-shell--standalone';

  if (renderInStandalone) {
    return (
      <div
        ref={signatureRootRef}
        data-showcase-scope
        data-showcase-theme={showcaseThemeId}
        data-showcase-layout={showcaseLayout}
        className={`${shellClassName} ${shellStandaloneClassName}`}
        style={showcaseThemeVariables}
      >
        {content}
      </div>
    );
  }

  return (
    <section
      ref={signatureRootRef}
      data-showcase-scope
      data-showcase-theme={showcaseThemeId}
      data-showcase-layout={showcaseLayout}
      className={shellClassName}
      style={showcaseThemeVariables}
      aria-label={t('projectShowcase.marketingShowcaseAriaLabel')}
    >
      {content}
    </section>
  );
};
