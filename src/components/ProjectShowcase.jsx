import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { ShowcaseSignatureFx } from './ShowcaseSignatureFx.jsx';
import {
  CheckCircle,
  Edit,
  Plus,
  Trash2
} from './icons.js';
import { formatAnswer, getQuestionOptionLabels } from '../utils/questions.js';
import { renderTextWithLinks } from '../utils/linkify.js';
import { splitRichTextIntoBlocks } from '../utils/richText.js';
import { initialShowcaseThemes } from '../data/showcaseThemes.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import { resolveThemeFromActivation } from '../utils/showcase.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';

const SHOWCASE_SECTION_OPTIONS = [
  { id: 'notice' },
  { id: 'hero' },
  { id: 'problem' },
  { id: 'solution' },
  { id: 'innovation' },
  { id: 'team' },
  { id: 'timeline' }
];

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
          documentUrl: 'https://votre-tenant.sharepoint.com/sites/projet/Shared%20Documents/brief.pdf',
          documentType: 'pdf',
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

// familles de couleur proposées à l'utilisateur pour chaque bloc personnalisé
const SECTION_ACCENT_FAMILIES = [
  { id: 'rouge', c: '#90172a', g1: '#e10943', g2: '#90172a', p1: '#fbe2eb', p2: '#f3b6b2', onDark: '#f3b6b2' },
  { id: 'orange', c: '#5e220e', g1: '#ee7e0b', g2: '#e84a16', p1: '#feead5', p2: '#f8c587', onDark: '#f6ae4c' },
  { id: 'or', c: '#6d511a', g1: '#d6b97e', g2: '#996b14', p1: '#f1ede2', p2: '#e7d3aa', onDark: '#d6b97e' },
  { id: 'vert', c: '#217d60', g1: '#31af80', g2: '#14392a', p1: '#dbebe4', p2: '#a0d3c1', onDark: '#a0d3c1' },
  { id: 'bleu', c: '#143455', g1: '#4790c4', g2: '#143455', p1: '#e6eef6', p2: '#7fb5d0', onDark: '#7fb5d0' },
  { id: 'rose', c: '#932579', g1: '#d30e7f', g2: '#932579', p1: '#fbe2eb', p2: '#c893bb', onDark: '#c893bb' }
];

const getColorFamilyLabel = (t, familyId) => t(`projectShowcase.colorFamilyNames.${familyId}`);

const DEFAULT_ACCENT_FAMILY = SECTION_ACCENT_FAMILIES[2].id;

const resolveAccentFamily = (value) =>
  SECTION_ACCENT_FAMILIES.find(family => family.id === value) || SECTION_ACCENT_FAMILIES[2];

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

const DOCUMENT_VIEWER_TYPES = [
  { id: 'pdf', label: 'PDF' },
  { id: 'jpg', label: 'JPG' },
  { id: 'png', label: 'PNG' },
  { id: 'pptx', label: 'PPTX' }
];

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

const normalizeCustomSectionColumns = (columns, columnCount) => {
  const normalized = Array.isArray(columns)
    ? columns.map(column => (typeof column === 'string' ? column.trim() : ''))
    : [];
  const boundedColumns = normalized.slice(0, columnCount);
  while (boundedColumns.length < columnCount) {
    boundedColumns.push('');
  }
  return boundedColumns;
};

const isSharePointUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  return value.toLowerCase().includes('sharepoint');
};

const resolveDocumentEmbedSrc = (documentUrl, documentType) => {
  if (!documentUrl) {
    return '';
  }

  if (['jpg', 'png'].includes(documentType)) {
    return documentUrl;
  }

  if (documentUrl.includes('officeapps.live.com')) {
    return documentUrl;
  }

  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`;
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
      const accentFamily = SECTION_ACCENT_FAMILIES.some(family => family.id === section.accentFamily)
        ? section.accentFamily
        : DEFAULT_ACCENT_FAMILY;
      const items = Array.isArray(section.items)
        ? section.items.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [];
      const rawType = typeof section.type === 'string' ? section.type : SECTION_TEMPLATES[0].id;
      // ancien identifiant du gabarit « Chiffre en avant », conservé dans les projets déjà enregistrés
      const type = rawType === 'aurora-section__inner' ? 'figure' : rawType;
      const columnCount = resolveCustomSectionColumnCount(section.columnCount, section.columns);
      const columns = normalizeCustomSectionColumns(section.columns, columnCount);
      const hasColumnContent = columns.some(column => column.length > 0);

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

const normalizeSectionOrder = (rawOrder, customSections) => {
  const baseOrder = SHOWCASE_SECTION_OPTIONS.map(section => section.id);
  const customIds = Array.isArray(customSections) ? customSections.map(section => section.id) : [];
  const fallbackOrder = [...baseOrder, ...customIds];

  if (!Array.isArray(rawOrder)) {
    return fallbackOrder;
  }

  const knownIds = new Set(fallbackOrder);
  const seen = new Set();
  const normalized = [];

  rawOrder.forEach(entry => {
    if (typeof entry !== 'string' || !knownIds.has(entry) || seen.has(entry)) {
      return;
    }
    normalized.push(entry);
    seen.add(entry);
  });

  fallbackOrder.forEach(entry => {
    if (!seen.has(entry)) {
      normalized.push(entry);
    }
  });

  return normalized;
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

const findQuestionById = (questions, id) => {
  if (!Array.isArray(questions)) {
    return null;
  }

  return questions.find(question => question?.id === id) || null;
};

const getFormattedAnswer = (questions, answers, id, missingInfoLabel) => {
  const question = findQuestionById(questions, id);
  if (!question) {
    return '';
  }

  const formatted = formatAnswer(question, answers?.[id]);

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
    '--showcase-accent-muted': toRgba(accentPrimary, 0.75, 'rgba(79, 70, 229, 0.75)')
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
  solutionBenefits: 'solution',
  innovationProcess: 'innovation',
  visionStatement: 'innovation',
  BUDGET: 'innovation',
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

  return entries
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date.trim() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : ''
    }))
    .filter(entry => entry.date.length > 0 || entry.description.length > 0)
    .map(entry => ({ date: entry.date, description: entry.description }));
};

const formatMilestoneDraftState = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date : '',
      description: typeof item?.description === 'string' ? item.description : ''
    }))
    .filter(entry => entry.date.trim().length > 0 || entry.description.trim().length > 0);
};

const formatValueForDraft = (type, rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return type === 'multi_choice' || type === 'milestone_list' ? [] : '';
  }

  if (type === 'multi_choice') {
    return normalizeMultiChoiceValue(rawValue);
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

const buildHeroHighlights = ({ targetAudience, runway, t }) => {
  const highlights = [];

  if (hasText(targetAudience)) {
    highlights.push({
      id: 'audience',
      label: t('projectShowcase.audienceLabel'),
      value: targetAudience,
      caption: ''
    });
  }

  if (runway) {
    highlights.push({
      id: 'runway',
      label: t('projectShowcase.countdownLabel'),
      value: `${runway.weeksLabel} (${runway.daysLabel})`,
      caption: runway.isOverdue
        ? t('projectShowcase.launchOverdueCaption', { date: runway.launchLabel })
        : runway.isToday
          ? t('projectShowcase.launchTodayCaption', { date: runway.launchLabel })
          : t('projectShowcase.launchUpcomingCaption', { date: runway.launchLabel })
    });
  }

  return highlights;
};

export const ProjectShowcase = ({
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
  const rawProjectName = typeof projectName === 'string' ? projectName.trim() : '';
  const safeProjectName = rawProjectName.length > 0 ? rawProjectName : missingInfoLabel;
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
  const selectedTheme = useMemo(
    () => resolveShowcaseTheme(availableThemes, answers?.showcaseTheme, answers),
    [answers, answers?.showcaseTheme, availableThemes]
  );
  const showcaseThemeId = selectedTheme?.id || FALLBACK_SHOWCASE_THEME.id;
  // la vitrine n'a plus qu'un seul layout ; les thèmes ne portent que des palettes
  const showcaseLayout = 'signature';
  const signatureRootRef = useRef(null);
  const showcaseThemeVariables = useMemo(
    () => buildThemeVariables(selectedTheme || FALLBACK_SHOWCASE_THEME),
    [selectedTheme]
  );
  const teamNameById = useMemo(() => {
    const map = new Map();
    normalizedTeams.forEach(team => {
      if (team && team.id) {
        map.set(team.id, team.name || team.id);
      }
    });
    return map;
  }, [normalizedTeams]);

  const editableFields = useMemo(
    () =>
      SHOWCASE_FIELD_CONFIG.map(config => ({
        ...config,
        question: findQuestionById(questions, config.id)
      })),
    [questions]
  );

  const [isEditing, setIsEditing] = useState(false);
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
  const [isLightConfigOpen, setIsLightConfigOpen] = useState(false);
  const [sectionDragState, setSectionDragState] = useState({ sourceIndex: null, targetIndex: null });
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionModalStep, setSectionModalStep] = useState('templates');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [pendingInsertionIndex, setPendingInsertionIndex] = useState(null);
  const [isSharePointWarningOpen, setIsSharePointWarningOpen] = useState(false);
  const [sharePointWarningUrl, setSharePointWarningUrl] = useState('');
  const [sectionDraft, setSectionDraft] = useState({
    title: '',
    subtitle: '',
    description: '',
    accent: '',
    accentFamily: DEFAULT_ACCENT_FAMILY,
    figure: '',
    documentUrl: '',
    documentType: 'pdf',
    items: [],
    columnCount: 1,
    columns: ['']
  });

  const resetMilestoneDragState = useCallback(() => {
    setMilestoneDragState(createEmptyMilestoneDragState());
  }, []);

  const handleSharePointWarning = useCallback((nextValue) => {
    if (!isSharePointUrl(nextValue)) {
      return;
    }

    if (nextValue === sharePointWarningUrl) {
      return;
    }

    setSharePointWarningUrl(nextValue);
    setIsSharePointWarningOpen(true);
  }, [sharePointWarningUrl]);

  const handleCloseSharePointWarning = useCallback(() => {
    setIsSharePointWarningOpen(false);
  }, []);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
    const sanitizedSections = sanitizeCustomSections(answers?.customShowcaseSections);
    setCustomSections(sanitizedSections);
    setSectionOrder(normalizeSectionOrder(answers?.showcaseSectionOrder, sanitizedSections));
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

    const scope = isSectionModalOpen
      ? `section-modal-${sectionModalStep}`
      : isLightConfigOpen
        ? 'light-config'
        : `display-${displayMode}`;

    onAnnotationScopeChange(scope);

    return () => {
      onAnnotationScopeChange('');
    };
  }, [displayMode, isLightConfigOpen, isSectionModalOpen, onAnnotationScopeChange, sectionModalStep]);

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

  const editFormBlocks = useMemo(() => {
    const blocks = [];

    sectionOrder.forEach(sectionId => {
      const customSection = customSectionFormMap.get(sectionId);
      if (customSection) {
        blocks.push({ type: 'custom', section: customSection });
        return;
      }

      const sectionFields = sectionFieldsById[sectionId] || [];
      if (sectionFields.length === 0) {
        return;
      }

      const option = SHOWCASE_SECTION_OPTIONS.find(section => section.id === sectionId);
      blocks.push({
        type: 'group-header',
        id: sectionId,
        title: option ? getSectionOptionLabel(t, option.id) : sectionId
      });
      sectionFields.forEach(field => blocks.push({ type: 'field', field }));
    });

    return blocks;
  }, [customSectionFormMap, sectionFieldsById, sectionOrder, t]);

  const handleOpenSectionModal = useCallback((insertionIndex = null) => {
    setPendingInsertionIndex(insertionIndex);
    setSectionModalStep('templates');
    setSectionDraft({
      title: '',
      subtitle: '',
      description: '',
      accent: '',
      accentFamily: DEFAULT_ACCENT_FAMILY,
      figure: '',
      documentUrl: '',
      documentType: 'pdf',
      items: [],
      columnCount: 1,
      columns: ['']
    });
    setIsSectionModalOpen(true);
  }, []);

  const handleCloseSectionModal = useCallback(() => {
    setIsSectionModalOpen(false);
    setSectionModalStep('templates');
    setPendingInsertionIndex(null);
    setSectionDraft({
      title: '',
      subtitle: '',
      description: '',
      accent: '',
      documentUrl: '',
      documentType: 'pdf',
      items: [],
      columnCount: 1,
      columns: ['']
    });
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

  const handleTemplateNavigation = useCallback((direction) => {
    setSelectedTemplateIndex(previous => {
      const nextIndex = (previous + direction + SECTION_TEMPLATES.length) % SECTION_TEMPLATES.length;
      return nextIndex;
    });
  }, []);

  const handleConfirmTemplateChoice = useCallback(() => {
    const template = SECTION_TEMPLATES[selectedTemplateIndex];
    const placeholder = (template ? getTemplateMeta(t, template.id).placeholder : null) || {};
    const columnCount = resolveCustomSectionColumnCount(placeholder.columnCount, placeholder.columns);
    const columns = normalizeCustomSectionColumns(placeholder.columns, columnCount);
    setSectionDraft({
      title: placeholder.title || '',
      subtitle: placeholder.subtitle || '',
      description: placeholder.description || '',
      accent: placeholder.accent || '',
      documentUrl: placeholder.documentUrl || '',
      documentType: placeholder.documentType || 'pdf',
      items: Array.isArray(placeholder.items) ? placeholder.items : [],
      columnCount,
      columns
    });
    setSectionModalStep('form');
  }, [selectedTemplateIndex, t]);

  const handleSectionDraftChange = useCallback((field, value) => {
    setSectionDraft(previous => ({
      ...previous,
      [field]: value
    }));
  }, []);

  const handleSectionDraftColumnCountChange = useCallback((value) => {
    const nextCount = resolveCustomSectionColumnCount(value);
    setSectionDraft(previous => ({
      ...previous,
      columnCount: nextCount,
      columns: normalizeCustomSectionColumns(previous.columns, nextCount)
    }));
  }, []);

  const handleSectionDraftColumnChange = useCallback((index, value) => {
    setSectionDraft(previous => {
      const currentCount = resolveCustomSectionColumnCount(previous.columnCount, previous.columns);
      const columns = normalizeCustomSectionColumns(previous.columns, currentCount);
      columns[index] = value;
      return {
        ...previous,
        columns
      };
    });
  }, []);

  const handleSectionDraftItemChange = useCallback((index, value) => {
    setSectionDraft(previous => {
      const items = Array.isArray(previous.items) ? [...previous.items] : [];
      items[index] = value;
      return {
        ...previous,
        items
      };
    });
  }, []);

  const handleSectionDraftItemAdd = useCallback(() => {
    setSectionDraft(previous => ({
      ...previous,
      items: [...(Array.isArray(previous.items) ? previous.items : []), '']
    }));
  }, []);

  const handleSectionDraftItemRemove = useCallback((index) => {
    setSectionDraft(previous => {
      const items = Array.isArray(previous.items) ? [...previous.items] : [];
      items.splice(index, 1);
      return {
        ...previous,
        items
      };
    });
  }, []);

  const handleSubmitNewSection = useCallback((event) => {
    event.preventDefault();
    const template = SECTION_TEMPLATES[selectedTemplateIndex];
    const safeTemplateId = template?.id || SECTION_TEMPLATES[0].id;
    const newSectionId = `custom-section-${Date.now()}`;
    const templateName = template ? getTemplateMeta(t, template.id).name : '';

    const newSection = {
      id: newSectionId,
      type: safeTemplateId,
      title: sectionDraft.title?.trim() || templateName || t('projectShowcase.newSectionEyebrow'),
      subtitle: sectionDraft.subtitle?.trim() || '',
      description: sectionDraft.description?.trim() || '',
      accent: sectionDraft.accent?.trim() || '',
      accentFamily: sectionDraft.accentFamily || DEFAULT_ACCENT_FAMILY,
      figure: sectionDraft.figure?.trim() || '',
      documentUrl: sectionDraft.documentUrl?.trim() || '',
      documentType: sectionDraft.documentType?.trim() || '',
      items: Array.isArray(sectionDraft.items) ? sectionDraft.items : [],
      columnCount: resolveCustomSectionColumnCount(sectionDraft.columnCount, sectionDraft.columns),
      columns: normalizeCustomSectionColumns(
        sectionDraft.columns,
        resolveCustomSectionColumnCount(sectionDraft.columnCount, sectionDraft.columns)
      )
    };

    setCustomSections(previous => [...sanitizeCustomSections(previous), newSection]);
    setSectionOrder(previousOrder => {
      const base = Array.isArray(previousOrder) ? [...previousOrder] : [];
      const insertionIndex = typeof pendingInsertionIndex === 'number'
        ? Math.max(0, Math.min(base.length, pendingInsertionIndex))
        : base.length;
      base.splice(insertionIndex, 0, newSectionId);
      return normalizeSectionOrder(base, [...sanitizeCustomSections(customSections), newSection]);
    });
    handleCloseSectionModal();
  }, [customSections, handleCloseSectionModal, pendingInsertionIndex, sectionDraft, selectedTemplateIndex, t]);

  const handleBackToTemplates = useCallback(() => {
    setSectionModalStep('templates');
  }, []);

  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    const { activeStep } = tourContext;
    const shouldForceEditing = [
      'showcase-edit',
      'showcase-save-edits',
      'showcase-custom-sections'
    ].includes(activeStep);

    if (shouldForceEditing) {
      setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
      resetMilestoneDragState();
      setIsEditing(true);
    } else if (isEditing && activeStep !== 'showcase-edit' && activeStep !== 'showcase-save-edits') {
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
    } else if (activeStep === 'showcase-edit' || activeStep === 'showcase-save-edits') {
      selector = '[data-tour-id="showcase-edit-panel"]';
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
      if (!isSectionModalOpen) {
        handleOpenSectionModal();
      }
    } else if (isSectionModalOpen && activeStep !== 'showcase-custom-sections') {
      handleCloseSectionModal();
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
    handleOpenSectionModal,
    handleCloseSectionModal,
    isSectionModalOpen
  ]);

  const isLightMode = displayMode === 'light';
  const lightVisibilityIds = useMemo(() => buildLightVisibilityIds(sectionOrder), [sectionOrder]);
  const canShowBudget = displayMode === 'full' || lightSections.budget !== false;

  const shouldDisplaySection = useCallback(
    (sectionId) => displayMode === 'full' || lightSections[sectionId] !== false,
    [displayMode, lightSections]
  );

  const selectedLightSectionsCount = useMemo(
    () => lightVisibilityIds.filter((id) => lightSections[id] !== false).length,
    [lightSections, lightVisibilityIds]
  );

  const canEdit = typeof onUpdateAnswers === 'function' && !hideEditBar;
  const shouldShowPreview = !isEditing || !canEdit;
  const formId = 'project-showcase-edit-form';

  const handleStartEditing = useCallback(() => {
    setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
    resetMilestoneDragState();
    setIsEditing(true);
  }, [answers, editableFields, rawProjectName, resetMilestoneDragState]);

  const handleCancelEditing = useCallback(() => {
    setDraftValues(buildDraftValues(editableFields, answers, rawProjectName));
    setIsEditing(false);
    const sanitizedSections = sanitizeCustomSections(answers?.customShowcaseSections);
    setCustomSections(sanitizedSections);
    setSectionOrder(normalizeSectionOrder(answers?.showcaseSectionOrder, sanitizedSections));
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

        const columns = normalizeCustomSectionColumns(section.columns, nextCount);

        return {
          ...section,
          columnCount: nextCount,
          columns
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

        const columnCount = resolveCustomSectionColumnCount(section.columnCount, section.columns);
        const columns = normalizeCustomSectionColumns(section.columns, columnCount);
        columns[index] = value;

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
  }, []);

  const handleSectionDragStart = useCallback((index, event) => {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', String(index));
      } catch (_error) {
        // Certains navigateurs bloquent l’écriture : on ignore.
      }
    }
    setSectionDragState({ sourceIndex: index, targetIndex: index });
  }, []);

  const handleSectionDragEnter = useCallback((index) => {
    setSectionDragState(previous => {
      if (previous.sourceIndex === null || previous.targetIndex === index) {
        return previous;
      }
      return { ...previous, targetIndex: index };
    });
  }, []);

  const handleSectionDragLeave = useCallback((index, event) => {
    if (event?.currentTarget?.contains(event?.relatedTarget)) {
      return;
    }
    setSectionDragState(previous => {
      if (previous.targetIndex !== index) {
        return previous;
      }
      return { ...previous, targetIndex: previous.sourceIndex };
    });
  }, []);

  const handleSectionDragOver = useCallback((event) => {
    if (sectionDragState.sourceIndex !== null) {
      event.preventDefault();
      if (event?.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }, [sectionDragState.sourceIndex]);

  const handleSectionDrop = useCallback((index, event) => {
    if (sectionDragState.sourceIndex === null) {
      return;
    }
    event.preventDefault();
    const sourceIndex = Math.max(0, Math.min(sectionOrder.length - 1, sectionDragState.sourceIndex));
    const targetIndex = Math.max(0, Math.min(sectionOrder.length - 1, index));

    if (sourceIndex === targetIndex) {
      setSectionDragState({ sourceIndex: null, targetIndex: null });
      return;
    }

    setSectionOrder(previous => {
      const next = [...previous];
      const [removed] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
    setSectionDragState({ sourceIndex: null, targetIndex: null });
  }, [sectionDragState.sourceIndex, sectionOrder.length]);

  const handleSubmitEdit = useCallback(
    (event) => {
      event.preventDefault();
      if (!canEdit) {
        setIsEditing(false);
        return;
      }

      const updates = {};

      editableFields.forEach(field => {
        const { id } = field;
        if (!id) {
          return;
        }

        const type = field.question?.type || field.fallbackType || 'text';
        const rawPreviousValue = getRawAnswer(answers, id);
        const previousValue =
          rawPreviousValue === undefined || rawPreviousValue === null
            ? (type === 'multi_choice' || type === 'milestone_list' ? [] : '')
            : formatValueForDraft(type, rawPreviousValue);
        const nextValue =
          draftValues[id] !== undefined
            ? draftValues[id]
            : (type === 'multi_choice' || type === 'milestone_list' ? [] : '');

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

      if (!areCustomSectionsEqual(
        previousSectionOrder.map(id => ({ id })),
        nextSectionOrder.map(id => ({ id }))
      )) {
        updates.showcaseSectionOrder = nextSectionOrder;
      }

      if (Object.keys(updates).length > 0) {
        onUpdateAnswers(updates);
      }

      setIsEditing(false);
    },
    [answers, canEdit, customSections, draftValues, editableFields, onUpdateAnswers, sectionOrder]
  );

  const missingShowcaseQuestions = useMemo(() => {
    const available = new Set(Array.isArray(questions) ? questions.map(question => question?.id).filter(Boolean) : []);
    return REQUIRED_SHOWCASE_QUESTION_IDS.filter(id => !available.has(id));
  }, [questions]);

  const slogan = getFormattedAnswer(questions, answers, 'projectSlogan', missingInfoLabel);
  const targetAudience = getFormattedAnswer(questions, answers, 'targetAudience', missingInfoLabel);
  const problemPainPoints = parseProblemPainPoints(getRawAnswer(answers, 'problemPainPoints'));

  const solutionDescription = getFormattedAnswer(questions, answers, 'solutionDescription', missingInfoLabel);
  const solutionDescriptionParts = useMemo(
    () => splitSolutionDescription(solutionDescription),
    [solutionDescription]
  );
  const solutionBenefits = splitRichTextIntoBlocks(getRawAnswer(answers, 'solutionBenefits'));

  const innovationProcess = getFormattedAnswer(questions, answers, 'innovationProcess', missingInfoLabel);
  const visionStatement = getFormattedAnswer(questions, answers, 'visionStatement', missingInfoLabel);
  const visionStatementEntries = useMemo(
    () => splitRichTextIntoBlocks(getRawAnswer(answers, 'visionStatement')),
    [answers]
  );
  const innovationProcessEntries = useMemo(
    () => splitRichTextIntoBlocks(getRawAnswer(answers, 'innovationProcess')),
    [answers]
  );
  const budgetEstimate = getFormattedAnswer(questions, answers, 'BUDGET', missingInfoLabel);
  const normalizedTimelineDetails = useMemo(() => {
    if (Array.isArray(timelineDetails)) {
      return timelineDetails;
    }

    const analysisDetails = analysis?.timeline?.details;
    return Array.isArray(analysisDetails) ? analysisDetails : [];
  }, [analysis, timelineDetails]);

  const formattedBudgetEstimate = useMemo(() => {
    if (!hasText(budgetEstimate)) {
      return '';
    }

    const trimmed = budgetEstimate.trim();
    if (/[€]/i.test(trimmed)) {
      return trimmed;
    }

    return `${trimmed} K€`;
  }, [budgetEstimate]);

  // n'anime que si la réponse brute est un nombre pur (cas normal : question de type "number")
  const budgetEstimateNumeric = useMemo(() => {
    if (!hasText(budgetEstimate)) {
      return null;
    }
    const parsed = Number.parseFloat(budgetEstimate.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }, [budgetEstimate]);

  const teamLead = getFormattedAnswer(questions, answers, 'teamLead', missingInfoLabel);
  const teamLeadTeam = getFormattedAnswer(questions, answers, 'teamLeadTeam', missingInfoLabel);
  const teamCoreMembers = splitRichTextIntoBlocks(getRawAnswer(answers, 'teamCoreMembers'));

  const rawRunway = useMemo(() => computeRunway(answers, language), [answers, language]);
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
    () => buildManualMilestones(getRawAnswer(answers, 'roadmapMilestones'), language),
    [answers, language]
  );
  const heroHighlights = useMemo(
    () =>
      buildHeroHighlights({
        targetAudience,
        runway,
        t
      }),
    [targetAudience, runway, t]
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
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, renderInStandalone]);

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
  const hasTimelineSection = Boolean(
    runway || hasTimelineSummaries || hasManualMilestones || hasTimelineProfiles || hasVigilanceAlerts
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
              <h1 className={`sg-hero__title ${missingInfoClass(safeProjectName)}`}>{safeProjectName}</h1>
              {hasText(slogan) && (
                <p className={`sg-hero__sub sg-rv ${missingInfoClass(slogan)}`} style={{ '--sg-d': '220ms' }}>
                  {renderTextWithLinks(slogan)}
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
                <p className="sg-eyebrow" style={{ '--sg-c': 'var(--sg-don-pale)' }}>{getSectionOptionLabel(t, 'problem')}</p>
                <h2 className="sg-headline">{t('projectShowcase.problemHeadline')}</h2>
                <p className="sg-story__counter" data-sg-counter>01</p>
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
        if (!hasText(solutionDescription) && solutionBenefits.length === 0) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section="solution">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': '#6d511a' }}>{t('projectShowcase.solutionEyebrow')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.solutionHeadline')}</h2>
              {hasText(solutionDescription) && (
                <div className="sg-rv" style={{ '--sg-d': '160ms' }}>
                  <p className="sg-eyebrow" style={{ '--sg-c': '#6d511a' }}>{t('projectShowcase.solutionInClear')}</p>
                  {solutionDescriptionParts.items.length > 0 ? (
                    // l'accroche à gauche, la liste qu'elle annonce à droite : le texte contient
                    // déjà ces deux registres, on les sépare au lieu de les empiler dans une case
                    <div className="sg-solution-lead sg-solution-lead--split" style={{ '--sg-c': '#996b14' }}>
                      <p className={`sg-solution-lead__hook ${missingInfoClass(solutionDescription)}`}>
                        {renderTextWithLinks(solutionDescriptionParts.hook)}
                      </p>
                      <div>
                        {hasText(solutionDescriptionParts.listLabel) && (
                          <p className="sg-solution-lead__list-label">{renderTextWithLinks(solutionDescriptionParts.listLabel)}</p>
                        )}
                        <ul className="sg-rows" style={{ '--sg-c': '#996b14' }}>
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
                    <div className="sg-solution-lead" style={{ '--sg-c': '#996b14' }}>
                      <p className={`sg-solution-lead__hook ${missingInfoClass(solutionDescription)}`}>
                        {renderTextWithLinks(solutionDescriptionParts.hook)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {solutionBenefits.length > 0 && (
                <div className="sg-rv" style={{ '--sg-d': '240ms', marginTop: 'clamp(3.5rem, 7vw, 5rem)' }}>
                  <div className="sg-stack-header">
                    <p className="sg-eyebrow" style={{ '--sg-c': '#6d511a' }}>
                      {t('projectShowcase.solutionBenefitsEyebrow')}
                    </p>
                    <h3 className="sg-headline sg-headline--sm">
                      {t('projectShowcase.solutionBenefitsHeadline')}
                    </h3>
                  </div>
                  <div className="sg-stack" style={{ marginTop: '1rem' }}>
                    {solutionBenefits.map((benefit, benefitIndex) => (
                      <div
                        key={`${benefit}-${benefitIndex}`}
                        className="sg-stack__slot sg-rv sg-rv--x"
                        style={{ '--sg-d': `${(benefitIndex % 3) * 90}ms` }}
                      >
                        <article className="sg-card">
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
              )}
            </div>
          </section>
        );

      case 'innovation':
        if (!hasText(innovationProcess) && !hasText(visionStatement) && !hasText(budgetEstimate)) {
          return null;
        }
        return (
          <React.Fragment key={key}>
            <section className="sg-band sg-band--dark sg-band--pad" data-showcase-section="innovation">
              <div className="sg-wrap sg-impact">
                <div>
                  <p className="sg-eyebrow sg-rv">{t('projectShowcase.impactEyebrow')}</p>
                  <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.impactHeadline')}</h2>
                  {hasText(budgetEstimate) && canShowBudget && (
                    <div data-tour-id="showcase-budget">
                      <p className={`sg-impact__value sg-rv ${missingInfoClass(budgetEstimate)}`} style={{ '--sg-d': '160ms' }}>
                        {budgetEstimateNumeric !== null ? (
                          <>
                            <span data-sg-count={budgetEstimateNumeric}>0</span>&nbsp;K€
                          </>
                        ) : (
                          formattedBudgetEstimate
                        )}
                      </p>
                      <p className="sg-impact__caption sg-rv" style={{ '--sg-d': '240ms' }}>
                        {t('projectShowcase.budgetCaption')}
                      </p>
                    </div>
                  )}
                </div>
                {hasText(innovationProcess) && (
                  <div>
                    <p className="sg-eyebrow sg-rv" style={{ '--sg-c': '#a0d3c1' }}>{t('projectShowcase.innovationHowEyebrow')}</p>
                    <ul className="sg-rows sg-rows--dark" style={{ '--sg-c': '#a0d3c1', marginTop: '1.4rem' }}>
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
            {visionStatementEntries.length > 0 && (
              <section className="sg-band sg-band--cloud sg-band--pad" data-showcase-section="innovation-metrics">
                <div className="sg-wrap">
                  <p className="sg-eyebrow sg-rv" style={{ '--sg-c': '#143455' }}>{t('projectShowcase.valueIndicatorsEyebrow')}</p>
                  <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.valueIndicatorsHeadline')}</h2>
                  <div className="sg-grid">
                    {visionStatementEntries.map((entry, entryIndex) => (
                      <article
                        key={`${entry}-${entryIndex}`}
                        className="sg-tile sg-rv"
                        data-sg-tilt
                        style={{
                          '--sg-c': '#1a61ab',
                          '--sg-g1': '#4790c4',
                          '--sg-g2': '#143455',
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
            )}
          </React.Fragment>
        );

      case 'team':
        if (!hasText(teamLead) && !hasText(teamLeadTeam) && teamCoreMembers.length === 0) {
          return null;
        }
        return (
          <section key={key} className="sg-band sg-band--light sg-band--pad" data-showcase-section="team">
            <div className="sg-wrap">
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': '#932579' }}>{getSectionOptionLabel(t, 'team')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.teamHeadline')}</h2>
              {hasText(teamLead) && (
                <div className="sg-lead sg-rv" style={{ '--sg-d': '160ms' }}>
                  <span className="sg-lead__ring">
                    <span>{teamLeadInitials}</span>
                  </span>
                  <span>
                    <span className={`sg-lead__name ${missingInfoClass(teamLead)}`}>{teamLead}</span>
                    {hasText(teamLeadTeam) && <span className="sg-lead__role">{t('projectShowcase.pilotageTemplate', { team: teamLeadTeam })}</span>}
                  </span>
                </div>
              )}
              {teamMemberCards.length > 0 && (
                <ul className="sg-rows sg-roster" style={{ '--sg-c': '#932579' }}>
                  {teamMemberCards.map((member, memberIndex) => (
                    <li
                      key={member.id ?? `${member.name}-${memberIndex}`}
                      className="sg-rv"
                      style={{ '--sg-d': `${memberIndex * 70}ms` }}
                    >
                      <span className="sg-roster__seal" aria-hidden="true">{member.initials}</span>
                      <span>
                        <span className="sg-roster__name">{member.name}</span>
                        {member.details && <span className="sg-roster__role">{member.details}</span>}
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
              <p className="sg-eyebrow sg-rv">{getSectionOptionLabel(t, 'timeline')}</p>
              <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{t('projectShowcase.roadmapHeadline')}</h2>
              <ol className="sg-road">
                <span className="sg-road__rail"><span className="sg-road__fill" /></span>

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
            </div>
          </section>
        );

      default:
        return null;
    }
  }, [
    budgetEstimate,
    canShowBudget,
    formattedBudgetEstimate,
    hasIncompleteAnswers,
    hasTimelineEntries,
    hasTimelineSection,
    hasTimelineSummaries,
    hasVigilanceAlerts,
    heroHighlights,
    hideNotice,
    innovationProcess,
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
    visionStatement,
    visionStatementEntries,
    t
  ]);

  // chaque gabarit personnalisé reprend une section existante : aucune forme nouvelle,
  // seule la famille de couleur choisie par l'utilisateur change.
  const renderCustomSectionSignature = useCallback((section, index) => {
    if (!section) {
      return null;
    }

    const type = section.type || SECTION_TEMPLATES[0].id;
    const templateConfig = resolveTemplateConfig(type);
    // le badge ne s'affiche que si un champ le rend saisissable, sinon il serait
    // rendu sans jamais pouvoir être renseigné
    const showAccent = Boolean(templateConfig.showBadge || templateConfig.showAccent);
    const family = resolveAccentFamily(section.accentFamily);
    const key = section.id || `custom-${index}`;
    const title = section.title || t('projectShowcase.untitledSectionFallback');
    const columnCount = resolveCustomSectionColumnCount(section.columnCount, section.columns);
    const columns = normalizeCustomSectionColumns(section.columns, columnCount);
    // une colonne ou un item saisi avec des sauts de ligne (Entrée dans l'éditeur
    // riche) doit produire plusieurs blocs distincts, pas un seul bloc recollé
    const activeColumns = columns.flatMap(column => splitRichTextIntoBlocks(column));
    const items = Array.isArray(section.items)
      ? section.items.filter(Boolean).flatMap(item => splitRichTextIntoBlocks(item))
      : [];

    const tileVars = { '--sg-c': family.c, '--sg-g1': family.g1, '--sg-g2': family.g2 };

    // BRIQUE C — panneau : « Bloc mise en avant » et « Bloc narratif »
    if (type === 'highlight' || type === 'story') {
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
              {showAccent && section.accent && (
                <p className="sg-eyebrow" style={{ '--sg-c': family.c }}>
                  {renderTextWithLinks(section.accent)}
                </p>
              )}
              <p className="sg-panel__lead">{renderTextWithLinks(title)}</p>
              {section.description && (
                <p className="sg-panel__body">{renderTextWithLinks(section.description)}</p>
              )}
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
              {showAccent && section.accent && (
                <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.onDark }}>
                  {renderTextWithLinks(section.accent)}
                </p>
              )}
              <h2 className="sg-headline sg-headline--sm sg-rv" style={{ '--sg-d': '80ms' }}>
                {renderTextWithLinks(title)}
              </h2>
              {section.figure && (
                <p className="sg-impact__value sg-impact__value--sm sg-rv" style={{ '--sg-d': '160ms' }}>
                  {section.figure}
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
            {section.subtitle && (
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>
                {renderTextWithLinks(section.subtitle)}
              </p>
            )}
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{renderTextWithLinks(title)}</h2>
            {activeColumns.length > 0 && (
              <div className="sg-grid">
                {activeColumns.map((column, columnIndex) => (
                  <article
                    key={`${key}-col-${columnIndex}`}
                    className="sg-tile sg-rv"
                    data-sg-tilt
                    style={{ ...tileVars, '--sg-d': `${columnIndex * 80}ms` }}
                  >
                    <span className="sg-tile__glyph">{String(columnIndex + 1).padStart(2, '0')}</span>
                    <p className="sg-tile__text">{renderTextWithLinks(column)}</p>
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
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{renderTextWithLinks(title)}</h2>
            {section.description && <p className="sg-lede sg-rv" style={{ '--sg-d': '160ms' }}>{renderTextWithLinks(section.description)}</p>}
            {items.length > 0 && (
              <ul className="sg-rows" style={{ '--sg-c': family.c, marginTop: '1.6rem' }}>
                {items.map((item, itemIndex) => (
                  <li key={`${key}-item-${itemIndex}`} className="sg-rv" style={{ '--sg-d': `${itemIndex * 70}ms` }}>
                    <span className="sg-rows__tick" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{renderTextWithLinks(item)}</span>
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
            {section.subtitle && (
              <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>
                {renderTextWithLinks(section.subtitle)}
              </p>
            )}
            <h2 className="sg-headline sg-rv" style={{ '--sg-d': '80ms' }}>{renderTextWithLinks(title)}</h2>
            {items.length > 0 && (
              <div className="sg-stack">
                {items.map((item, itemIndex) => (
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
                      <p className="sg-card__text">{renderTextWithLinks(item)}</p>
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
    const isImage = ['jpg', 'png'].includes(section.documentType);
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
              {showAccent && section.accent && <span className="sg-tile__pill">{renderTextWithLinks(section.accent)}</span>}
              <p className="sg-tile__title">{renderTextWithLinks(title)}</p>
              {section.subtitle && (
                <p className="sg-tile__text sg-tile__text--muted">{renderTextWithLinks(section.subtitle)}</p>
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
                  ) : (
                    <iframe
                      className="sg-doc__frame"
                      title={t('projectShowcase.documentAltTemplate', { title })}
                      src={resolveDocumentEmbedSrc(section.documentUrl, section.documentType)}
                      loading="lazy"
                    />
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
  }, [t]);

  const orderedSections = useMemo(() => {
    const sections = [];
    sectionOrder.forEach((sectionId, index) => {
      if (!shouldDisplaySection(sectionId)) {
        return;
      }

      if (customSectionMap.has(sectionId)) {
        const renderedCustom = renderCustomSectionSignature(customSectionMap.get(sectionId), index);
        if (renderedCustom) {
          sections.push(renderedCustom);
        }
        return;
      }

      const rendered = renderSignatureSection(sectionId, index);
      if (rendered) {
        sections.push(rendered);
      }
    });

    return sections;
  }, [
    customSectionMap,
    renderCustomSectionSignature,
    renderSignatureSection,
    sectionOrder,
    shouldDisplaySection
  ]);

  const sectionDescriptors = useMemo(() => {
    return sectionOrder.map((sectionId) => {
      const custom = customSectionMap.get(sectionId);
      if (custom) {
        return {
          id: sectionId,
          title: custom.title || t('projectShowcase.customBlockFallback'),
          subtitle: t('projectShowcase.customSectionSubtitle'),
          isCustom: true
        };
      }

      const option = SHOWCASE_SECTION_OPTIONS.find(section => section.id === sectionId);
      return {
        id: sectionId,
        title: option ? getSectionOptionLabel(t, option.id) : sectionId,
        subtitle: t('projectShowcase.standardSectionSubtitle'),
        isCustom: false
      };
    });
  }, [customSectionMap, sectionOrder, t]);

  const selectedTemplate = SECTION_TEMPLATES[selectedTemplateIndex] || SECTION_TEMPLATES[0];
  const selectedTemplateMeta = getTemplateMeta(t, selectedTemplate?.id);
  const selectedTemplateConfig = resolveTemplateConfig(selectedTemplate?.id);
  // chaque gabarit reprend une section existante ; l'aperçu suit la même famille de couleur
  const templateAccentClasses = {
    highlight: 'from-rose-500/80 via-rose-400/70 to-amber-200/70',
    'figure': 'from-sky-700/80 via-sky-500/70 to-sky-300/70',
    columns: 'from-emerald-600/80 via-emerald-400/70 to-teal-200/70',
    'document-viewer': 'from-amber-600/80 via-amber-400/70 to-amber-200/70',
    story: 'from-fuchsia-600/80 via-fuchsia-400/70 to-pink-200/70',
    checklist: 'from-orange-600/80 via-orange-400/70 to-amber-200/70',
    stack: 'from-sky-700/80 via-sky-500/70 to-cyan-200/70'
  };
  const selectedTemplateAccent =
    templateAccentClasses[selectedTemplate?.id] || templateAccentClasses.highlight;

  const templateOriginLabel = {
    highlight: t('projectShowcase.templateOrigin.highlight'),
    'figure': t('projectShowcase.templateOrigin.figure'),
    columns: t('projectShowcase.templateOrigin.columns'),
    'document-viewer': t('projectShowcase.templateOrigin.documentViewer'),
    story: t('projectShowcase.templateOrigin.story'),
    checklist: t('projectShowcase.templateOrigin.checklist'),
    stack: t('projectShowcase.templateOrigin.stack')
  };

  const renderTemplateThumbnail = (templateId) => {
    const shell = 'sge-tpl__preview';

    switch (templateId) {
      // BRIQUE A — carte pleine avec grand chiffre
      case 'figure':
        return (
          <div className={shell}>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-sky-700 to-slate-800 px-4 py-5">
              <div className="space-y-2">
                <div className="h-2 w-14 rounded-full bg-white/50" />
                <div className="h-2 w-24 rounded-full bg-white/30" />
              </div>
              <div className="text-2xl font-bold text-white">87 %</div>
            </div>
          </div>
        );

      // BRIQUE B — grille de cartes claires
      case 'columns':
        return (
          <div className={shell}>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((column) => (
                <div key={`thumb-col-${column}`} className="space-y-2 rounded-lg border border-gray-100 p-2">
                  <div className="h-1 w-8 rounded-full bg-emerald-500" />
                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-700" />
                  <div className="h-1.5 w-full rounded-full bg-gray-200" />
                  <div className="h-1.5 w-3/4 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        );

      // BRIQUE B + cadre document
      case 'document-viewer':
        return (
          <div className={shell}>
            <div className="space-y-2 rounded-lg border border-gray-100 p-3">
              <div className="h-1 w-10 rounded-full bg-amber-600" />
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-amber-300 to-amber-700" />
              <div className="h-1.5 w-24 rounded-full bg-gray-300" />
              <div className="flex h-16 items-center justify-center rounded-md bg-gray-50 text-xs text-gray-400">
                {t('projectShowcase.documentPreviewLabel')}
              </div>
            </div>
          </div>
        );

      // BRIQUE D — liste à filets cochée
      case 'checklist':
        return (
          <div className={shell}>
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div key={`thumb-check-${row}`} className="flex items-center gap-2 border-t border-gray-100 pt-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500" />
                  <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        );

      // BRIQUE A — cartes pleine couleur rangées en grille
      case 'stack':
        return (
          <div className={shell}>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((card) => (
                <div
                  key={`thumb-stack-${card}`}
                  className="h-8 rounded-md bg-gradient-to-br from-sky-600 to-slate-800 shadow-sm"
                  style={{ opacity: card < 3 ? 1 : 0.55 }}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">{t('projectShowcase.cardsGridCaption')}</p>
          </div>
        );

      // BRIQUE C — panneau large
      case 'story':
      case 'highlight':
      default:
        return (
          <div className={shell}>
            <div
              className={`space-y-2 rounded-2xl border-l-4 p-4 ${
                templateId === 'story'
                  ? 'border-fuchsia-600 bg-gradient-to-br from-fuchsia-50 to-pink-50'
                  : 'border-rose-500 bg-gradient-to-br from-rose-50 to-amber-50'
              }`}
            >
              {templateId === 'highlight' && <div className="h-4 w-14 rounded-full bg-white/80" />}
              <div className="h-2.5 w-32 rounded-full bg-gray-400" />
              <div className="h-1.5 w-full rounded-full bg-gray-300" />
              <div className="h-1.5 w-4/5 rounded-full bg-gray-300" />
              {templateId === 'story' && <div className="h-1.5 w-3/5 rounded-full bg-gray-300" />}
            </div>
          </div>
        );
    }
  };

  const previewContent = shouldShowPreview ? (
    <div className="sg-sections" data-tour-id="showcase-preview">
      {orderedSections}
    </div>
  ) : (
    <div className="sge-empty">
      <h2 className="sge-empty__title">{t('projectShowcase.editModeActivatedTitle')}</h2>
      <p className="sge-empty__text">
        {t('projectShowcase.editModeActivatedHint')}
      </p>
    </div>
  );

  const sectionModal = isSectionModalOpen ? (
    <div className="sge sge-modal-scrim">
      <div className="absolute inset-0" onClick={handleCloseSectionModal} aria-hidden="true" />
      <div
        className="sge-modal relative z-10"
        role="dialog"
        aria-modal="true"
      >
        <div className="sge-modal__header">
          <div>
            <p className="sge-eyebrow">{t('projectShowcase.newSectionEyebrow')}</p>
            <h3 className="sge-title" style={{ fontSize: '1.25rem' }}>{t('projectShowcase.chooseTemplateTitle')}</h3>
            <p className="sge-subtitle">{t('projectShowcase.thumbnailHint')}</p>
          </div>
          <button
            type="button"
            onClick={handleCloseSectionModal}
            className="sge-btn sge-btn--ghost"
          >
            {t('projectShowcase.closeButton')}
          </button>
        </div>

        {sectionModalStep === 'templates' ? (
          <div className="sge-modal__body">
            <div className="sge-tpl">
              <button
                type="button"
                onClick={() => handleTemplateNavigation(-1)}
                className="sge-tpl__nav"
                aria-label={t('projectShowcase.previousTemplateAriaLabel')}
              >
                ←
              </button>
              <div className="sge-tpl__card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="sge-eyebrow">{t('projectShowcase.templateCounterTemplate', { index: selectedTemplateIndex + 1, total: SECTION_TEMPLATES.length })}</p>
                    <h4 className="sge-title" style={{ marginTop: '0.3rem' }}>{selectedTemplateMeta.name}</h4>
                    <p className="sge-subtitle" style={{ marginTop: '0.25rem' }}>{selectedTemplateMeta.description}</p>
                    {templateOriginLabel[selectedTemplate?.id] && (
                      <p className="sge-tpl__origin">{templateOriginLabel[selectedTemplate?.id]}</p>
                    )}
                  </div>
                  <div className={`h-10 w-20 flex-none rounded-lg bg-gradient-to-r ${selectedTemplateAccent}`} />
                </div>
                {renderTemplateThumbnail(selectedTemplate?.id)}
              </div>
              <button
                type="button"
                onClick={() => handleTemplateNavigation(1)}
                className="sge-tpl__nav"
                aria-label={t('projectShowcase.nextTemplateAriaLabel')}
              >
                →
              </button>
            </div>
            <div className="sge-modal__actions">
              <button type="button" onClick={handleCloseSectionModal} className="sge-btn sge-btn--ghost">
                {t('projectShowcase.cancelButton')}
              </button>
              <button type="button" onClick={handleConfirmTemplateChoice} className="sge-btn sge-btn--primary">
                {t('projectShowcase.validateTemplateButton')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitNewSection} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="section-title" className="text-sm font-medium text-gray-800">{t('projectShowcase.titleFieldLabel')}</label>
                <RichTextEditor
                  id="section-title"
                  value={sectionDraft.title}
                  onChange={(nextValue) => handleSectionDraftChange('title', nextValue)}
                  placeholder={selectedTemplateMeta.placeholder?.title || t('projectShowcase.titlePlaceholderFallback')}
                  compact
                  ariaLabel={t('projectShowcase.titleSectionAriaLabel')}
                />
              </div>
              {selectedTemplateConfig.showSubtitle && (
                <div className="space-y-1">
                  <label htmlFor="section-subtitle" className="text-sm font-medium text-gray-800">{t('projectShowcase.subtitleFieldLabel')}</label>
                  <RichTextEditor
                    id="section-subtitle"
                    value={sectionDraft.subtitle}
                    onChange={(nextValue) => handleSectionDraftChange('subtitle', nextValue)}
                    placeholder={selectedTemplateMeta.placeholder?.subtitle || t('projectShowcase.subtitlePlaceholderFallback')}
                    compact
                    ariaLabel={t('projectShowcase.subtitleSectionAriaLabel')}
                  />
                </div>
              )}
              {selectedTemplateConfig.showBadge && (
                <div className="space-y-1">
                  <label htmlFor="section-badge" className="text-sm font-medium text-gray-800">{t('projectShowcase.badgeFieldLabel')}</label>
                  <RichTextEditor
                    id="section-badge"
                    value={sectionDraft.accent}
                    onChange={(nextValue) => handleSectionDraftChange('accent', nextValue)}
                    placeholder={selectedTemplateMeta.placeholder?.badge || t('projectShowcase.badgeFieldLabel')}
                    compact
                    ariaLabel={t('projectShowcase.badgeSectionAriaLabel')}
                  />
                </div>
              )}
              {selectedTemplateConfig.showAccent && (
                <div className="space-y-1">
                  <label htmlFor="section-accent" className="text-sm font-medium text-gray-800">{t('projectShowcase.accentFieldLabel')}</label>
                  <RichTextEditor
                    id="section-accent"
                    value={sectionDraft.accent}
                    onChange={(nextValue) => handleSectionDraftChange('accent', nextValue)}
                    placeholder={t('projectShowcase.accentPlaceholderFallback')}
                    compact
                    ariaLabel={t('projectShowcase.accentSectionAriaLabel')}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">{t('projectShowcase.colorFamilyLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {SECTION_ACCENT_FAMILIES.map((family) => {
                  const isActive = (sectionDraft.accentFamily || DEFAULT_ACCENT_FAMILY) === family.id;
                  return (
                    <button
                      key={`draft-family-${family.id}`}
                      type="button"
                      onClick={() => handleSectionDraftChange('accentFamily', family.id)}
                      aria-pressed={isActive}
                      className="sge-swatch"
                    >
                      <span
                        className="sge-swatch__dot"
                        style={{ background: `linear-gradient(135deg, ${family.g1}, ${family.g2})` }}
                      />
                      {getColorFamilyLabel(t, family.id)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                {t('projectShowcase.colorFamilyHint')}
              </p>
            </div>
            {selectedTemplate?.id === 'figure' && (
              <div className="space-y-1">
                <label htmlFor="section-figure" className="text-sm font-medium text-gray-800">{t('projectShowcase.figureFieldLabel')}</label>
                <input
                  id="section-figure"
                  type="text"
                  value={sectionDraft.figure || ''}
                  onChange={(event) => handleSectionDraftChange('figure', event.target.value)}
                  placeholder="87 %"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-100"
                />
                <p className="text-xs text-gray-500">{t('projectShowcase.figureHint')}</p>
              </div>
            )}
            {selectedTemplateConfig.showDescription && (
              <div className="space-y-1">
                <label htmlFor="section-description" className="text-sm font-medium text-gray-800">{t('projectShowcase.descriptionFieldLabel')}</label>
                <RichTextEditor
                  id="section-description"
                  value={sectionDraft.description}
                  onChange={(nextValue) => handleSectionDraftChange('description', nextValue)}
                  placeholder={selectedTemplateMeta.placeholder?.description || t('projectShowcase.descriptionPlaceholderFallback')}
                  ariaLabel={t('projectShowcase.descriptionSectionAriaLabel')}
                />
              </div>
            )}
            {selectedTemplateConfig.showColumns && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="section-column-count" className="text-sm font-medium text-gray-800">{t('projectShowcase.columnCountLabel')}</label>
                    <select
                      id="section-column-count"
                      value={sectionDraft.columnCount}
                      onChange={(event) => handleSectionDraftColumnCountChange(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-100"
                    >
                      {Array.from({ length: MAX_CUSTOM_SECTION_COLUMNS }, (_, index) => (
                        <option key={`section-column-count-${index + 1}`} value={index + 1}>
                          {t(index + 1 > 1 ? 'projectShowcase.columnCountOptionPlural' : 'projectShowcase.columnCountOptionSingular', { count: index + 1 })}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">{t('projectShowcase.columnsReflowHint')}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {sectionDraft.columns.map((column, columnIndex) => (
                    <div key={`section-draft-column-${columnIndex}`} className="space-y-1">
                      <label
                        htmlFor={`section-column-${columnIndex}`}
                        className="text-sm font-medium text-gray-800"
                      >
                        {t('projectShowcase.columnContentLabelTemplate', { index: columnIndex + 1 })}
                      </label>
                      <RichTextEditor
                        id={`section-column-${columnIndex}`}
                        value={column}
                        onChange={(nextValue) => handleSectionDraftColumnChange(columnIndex, nextValue)}
                        placeholder={t('projectShowcase.columnContentPlaceholderTemplate', { index: columnIndex + 1 })}
                        compact
                        ariaLabel={t('projectShowcase.columnContentLabelTemplate', { index: columnIndex + 1 })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
            {selectedTemplateConfig.showDocument && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="section-document-url" className="text-sm font-medium text-gray-800">
                    {t('projectShowcase.documentUrlLabel')}
                  </label>
                  <input
                    id="section-document-url"
                    type="url"
                    value={sectionDraft.documentUrl}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      handleSectionDraftChange('documentUrl', nextValue);
                      handleSharePointWarning(nextValue);
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-100"
                    placeholder={selectedTemplateMeta.placeholder?.documentUrl || t('projectShowcase.documentUrlPlaceholderFallback')}
                  />
                  <p className="text-xs text-gray-500">
                    {t('projectShowcase.documentUrlHint')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="section-document-type" className="text-sm font-medium text-gray-800">
                    {t('projectShowcase.documentTypeLabel')}
                  </label>
                  <select
                    id="section-document-type"
                    value={sectionDraft.documentType}
                    onChange={(event) => handleSectionDraftChange('documentType', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-100"
                  >
                    {DOCUMENT_VIEWER_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {selectedTemplateConfig.showItems && (
              <div className="space-y-3">
                <label className="sge-field__label">
                  {selectedTemplate?.id === 'stack'
                    ? t('projectShowcase.stackItemsLabel')
                    : t('projectShowcase.listItemsLabel')}
                </label>
                {Array.isArray(sectionDraft.items) && sectionDraft.items.length > 0 ? (
                  <div className="space-y-3">
                    {sectionDraft.items.map((item, itemIndex) => (
                      <div key={`section-draft-item-${itemIndex}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500">{t('projectShowcase.itemNumberLabel', { index: itemIndex + 1 })}</p>
                          <button
                            type="button"
                            onClick={() => handleSectionDraftItemRemove(itemIndex)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t('projectShowcase.removeButton')}
                          </button>
                        </div>
                        <RichTextEditor
                          id={`section-items-${itemIndex}`}
                          value={item}
                          onChange={(nextValue) => handleSectionDraftItemChange(itemIndex, nextValue)}
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
                  onClick={handleSectionDraftItemAdd}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('projectShowcase.addItemButton')}
                </button>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={handleBackToTemplates}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
              >
                {t('projectShowcase.backToTemplatesButton')}
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCloseSectionModal}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
                >
                  {t('projectShowcase.cancelButton')}
                </button>
                <button
                  type="submit"
                  className="rounded-full border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  {t('projectShowcase.addSectionButton')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;
  const sharePointWarningModal = isSharePointWarningOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={handleCloseSharePointWarning} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('projectShowcase.sharePointWarningAriaLabel')}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-500">{t('projectShowcase.warningLabel')}</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{t('projectShowcase.sharePointFileDetectedTitle')}</h3>
          </div>
          <button
            type="button"
            onClick={handleCloseSharePointWarning}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
          >
            {t('projectShowcase.closeButton')}
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          {t('projectShowcase.sharePointWarningBody')}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleCloseSharePointWarning}
            className="rounded-full border border-amber-200 bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            {t('projectShowcase.iVerifiedButton')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

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

      {isLightConfigOpen && (
        <div className="sge-divider p-4">
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
        </div>
      )}
    </div>
  );

  const editPanel = isEditing && canEdit ? (
    <form
      id={formId}
      onSubmit={handleSubmitEdit}
      className="sge sge-panel"
      data-tour-id="showcase-edit-panel"
    >
      <div className="sge-panel__header">
        <div>
          <p className="sge-eyebrow">{t('projectShowcase.editModeActiveLabel')}</p>
          <h3 className="sge-title">{t('projectShowcase.adjustInfoTitle')}</h3>
        </div>
        <p className="sge-panel__intro">
          {t('projectShowcase.editPanelIntro')}
        </p>
      </div>
      <nav className="sge-jumpnav" aria-label={t('projectShowcase.jumpNavAriaLabel')}>
        {sectionDescriptors.map((section) => (
          <button
            key={`jump-${section.id}`}
            type="button"
            className="sge-jumpnav__item"
            onClick={() => {
              document.getElementById(`sge-group-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {section.title}
          </button>
        ))}
      </nav>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-inner">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="sge-eyebrow">{t('projectShowcase.sectionsOrganizationEyebrow')}</p>
            <h4 className="text-lg font-semibold text-gray-900">{t('projectShowcase.reorderAddBlocksTitle')}</h4>
            <p className="text-sm text-gray-600">{t('projectShowcase.dragDropHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenSectionModal(0)}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 sm:inline-flex"
              aria-label={t('projectShowcase.addSectionAtStartAriaLabel')}
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenSectionModal(sectionOrder.length)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t('projectShowcase.newSectionEyebrow')}
            </button>
          </div>
        </div>
        <ol className="mt-4 space-y-3">
          {sectionDescriptors.map((section, index) => {
            const isTarget = sectionDragState.targetIndex === index;
            return (
              <li key={section.id} className="space-y-2">
                <div
                  draggable
                  onDragStart={(event) => handleSectionDragStart(index, event)}
                  onDragEnter={() => handleSectionDragEnter(index)}
                  onDragOver={handleSectionDragOver}
                  onDragLeave={(event) => handleSectionDragLeave(index, event)}
                  onDrop={(event) => handleSectionDrop(index, event)}
                  className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-sm transition ${
                    isTarget ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-500">
                      ☰
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{renderTextWithLinks(section.title)}</p>
                      <p className="text-xs text-gray-500">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSectionModal(index + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                      aria-label={t('projectShowcase.addSectionHereAriaLabel')}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {section.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSection(section.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-red-200 hover:text-red-600"
                        aria-label={t('projectShowcase.removeCustomSectionAriaLabel')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="sge-panel__grid">
        {editFormBlocks.map((block) => {
          if (block.type === 'group-header') {
            return (
              <div key={`group-header-${block.id}`} id={`sge-group-${block.id}`} className="sge-field sge-field--wide sge-group-header">
                <h4 className="sge-group-header__title">{block.title}</h4>
              </div>
            );
          }

          if (block.type === 'custom') {
            const section = block.section;
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
                    {SECTION_ACCENT_FAMILIES.map((family) => {
                      const isActive = (section.accentFamily || DEFAULT_ACCENT_FAMILY) === family.id;
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
                          {getColorFamilyLabel(t, family.id)}
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
                  </div>
                )}
                {templateConfig.showDocument && (
                  <>
                    <div className="space-y-1">
                      <label htmlFor={`custom-section-${section.id}-document-url`} className="text-sm font-medium text-gray-800">
                        {t('projectShowcase.documentUrlLabel')}
                      </label>
                      <input
                        id={`custom-section-${section.id}-document-url`}
                        type="url"
                        value={section.documentUrl || ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          handleCustomSectionFieldChange(section.id, 'documentUrl', nextValue);
                          handleSharePointWarning(nextValue);
                        }}
                        className="sge-input"
                        placeholder={t('projectShowcase.documentUrlPlaceholderFallback')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={`custom-section-${section.id}-document-type`} className="text-sm font-medium text-gray-800">
                        {t('projectShowcase.documentTypeLabel')}
                      </label>
                      <select
                        id={`custom-section-${section.id}-document-type`}
                        value={section.documentType || 'pdf'}
                        onChange={(event) => handleCustomSectionFieldChange(section.id, 'documentType', event.target.value)}
                        className="sge-input"
                      >
                        {DOCUMENT_VIEWER_TYPES.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
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
                {templateConfig.showColumns && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {normalizeCustomSectionColumns(section.columns, resolveCustomSectionColumnCount(section.columnCount, section.columns))
                      .map((column, columnIndex) => (
                        <div key={`${section.id}-column-${columnIndex}`} className="space-y-1">
                          <label
                            htmlFor={`custom-section-${section.id}-column-${columnIndex}`}
                            className="text-sm font-medium text-gray-800"
                          >
                            {t('projectShowcase.columnContentLabelTemplate', { index: columnIndex + 1 })}
                          </label>
                          <RichTextEditor
                            id={`custom-section-${section.id}-column-${columnIndex}`}
                            value={column}
                            onChange={(nextValue) => handleCustomSectionColumnChange(section.id, columnIndex, nextValue)}
                            placeholder={t('projectShowcase.columnContentPlaceholderTemplate', { index: columnIndex + 1 })}
                            compact
                            ariaLabel={t('projectShowcase.columnContentLabelTemplate', { index: columnIndex + 1 })}
                          />
                        </div>
                      ))}
                  </div>
                )}
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
          }

          const field = block.field;
          const fieldId = field.id;
          const question = field.question;
          const type = question?.type || field.fallbackType || 'text';
          const label = resolveLocalizedText(question?.question, language) || (field.fallbackLabelKey ? t(`projectShowcase.fieldFallbackLabels.${field.fallbackLabelKey}`) : fieldId);
          const fieldValue = draftValues[fieldId];
          const options = getQuestionOptionLabels(question);
          const isLong = type === 'long_text';
          const isRichText = type === 'text' || type === 'long_text';
          const isMulti = type === 'multi_choice';
          const isChoice = type === 'choice';
          const isDate = type === 'date';
          const isMilestoneList = type === 'milestone_list';
          const isMultiWithOptions = isMulti && options.length > 0;
          const isMultiFreeform = isMulti && !isMultiWithOptions;
          const isChoiceWithOptions = isChoice && options.length > 0;
          const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
          const textValue = typeof fieldValue === 'string' ? fieldValue : '';
          const placeholder =
            typeof question?.placeholder === 'string' && question.placeholder.trim() !== ''
              ? question.placeholder.trim()
              : isLong
                ? t('projectShowcase.richTextPlaceholderLong')
                : t('projectShowcase.richTextPlaceholderShort');
          const helperText = isMilestoneList
            ? t('projectShowcase.milestoneHelperText')
            : isMultiWithOptions
              ? t('projectShowcase.multiWithOptionsHelper')
              : isMultiFreeform
                ? t('projectShowcase.multiFreeformHelper')
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
              return Array.isArray(nextEntries) ? nextEntries : [];
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
                        draggable={milestoneDraftEntries.length > 1}
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
                  {options.map((option, optionIndex) => {
                    const optionId = `showcase-edit-${fieldId}-option-${optionIndex}`;
                    const isChecked = selectedValues.includes(option);

                    return (
                      <label
                        key={optionId}
                        htmlFor={optionId}
                        className={`sge-choice${isChecked ? ' sge-choice--active' : ''}`}
                      >
                        <input
                          id={optionId}
                          type="checkbox"
                          value={option}
                          checked={isChecked}
                          onChange={event => {
                            const { checked } = event.target;
                            handleFieldChange(fieldId, previousValue => {
                              const previousSelections = Array.isArray(previousValue) ? previousValue : [];
                              const selectionSet = new Set(previousSelections);

                              if (checked) {
                                selectionSet.add(option);
                              } else {
                                selectionSet.delete(option);
                              }

                              if (options.length > 0) {
                                return options.filter(choice => selectionSet.has(choice));
                              }

                              return Array.from(selectionSet);
                            });
                          }}
                          className="sge-choice__checkbox"
                        />
                        <span className="sge-choice__text">{option}</span>
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
                  {options.map(option => (
                    <option key={option} value={option}>
                      {option}
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
                  onChange={event => handleFieldChange(fieldId, event.target.value)}
                  className="sge-input"
                />
              )}
              {helperText && <p className="sge-field__helper">{helperText}</p>}
            </div>
          );
        })}
      </div>
      <div className="sge-panel__actions">
        <button type="button" onClick={handleCancelEditing} className="sge-btn sge-btn--ghost">
          {t('projectShowcase.cancelButton')}
        </button>
        <button
          type="submit"
          className="sge-btn sge-btn--primary"
          data-tour-id="showcase-save-edits"
        >
          <CheckCircle className="sge-btn__icon" />
          {t('projectShowcase.saveChangesButton')}
        </button>
      </div>
    </form>
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

  const content = (
    <>
      <ShowcaseSignatureFx rootRef={signatureRootRef} />
      {modeSelectionPanel}
      {editBar}
      {editPanel}
      {sectionModal}
      {sharePointWarningModal}
      {previewContent}
    </>
  );

  const shellClassName = 'sg-shell';
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
