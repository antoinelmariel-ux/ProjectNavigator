import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { normalizeRiskWeighting } from '../utils/risk.js';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Info,
  GripVertical,
  Download,
  ArrowUp,
  ArrowDown,
  Copy,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from './icons.js';
import { QuestionEditor } from './QuestionEditor.jsx';
import { RuleEditor } from './RuleEditor.jsx';
import { BackOfficeDashboard } from './BackOfficeDashboard.jsx';
import { VirtualizedList } from './VirtualizedList.jsx';
import { renderTextWithLinks } from '../utils/linkify.js';
import { normalizeConditionGroups } from '../utils/conditionGroups.js';
import {
  buildExtraCheckboxQuestionId,
  getConditionQuestionEntries,
  getQuestionOptionEntries,
  getQuestionOptionLabels,
  normalizeQuestionOptions,
  shouldShowOption as shouldShowOptionBase,
  shouldShowQuestion as shouldShowQuestionBase,
  withActivityScope
} from '../utils/questions.js';
import { initialOnboardingTourConfig } from '../data/onboardingTour.js';
import {
  analyzeAnswers as analyzeAnswersBase,
  normalizeTimingRequirement,
  sanitizeRiskTimingConstraint,
  sanitizeTeamQuestionEntry
} from '../utils/rules.js';
import {
  applyRuleConditionGroups,
  createEmptyQuestionCondition,
  createEmptyTimingCondition,
  normalizeRuleConditionGroups,
  sanitizeRuleCondition
} from '../utils/ruleConditions.js';
import { ensureOperatorForType, getOperatorOptionsForType } from '../utils/operatorOptions.js';
import { formatTeamContacts, parseTeamContacts } from '../utils/teamContacts.js';
import {
  createOnboardingAction,
  createOnboardingStep,
  normalizeOnboardingConfig
} from '../utils/onboarding.js';
import {
  normalizeProjectFilterConfig,
  resetProjectFiltersConfig,
  updateProjectFilterField
} from '../utils/projectFilters.js';
import {
  normalizeInspirationFiltersConfig,
  normalizeInspirationFormConfig,
  resetInspirationFiltersConfig,
  resetInspirationFormConfig,
  updateInspirationFilterField,
  updateInspirationFormField
} from '../utils/inspirationConfig.js';
import { initialShowcaseThemes } from '../data/showcaseThemes.js';
import { normalizeValidationCommitteeConfig } from '../utils/validationCommittee.js';
import { getShowcaseThemeActivationConflicts, normalizeThemeActivation } from '../utils/showcase.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { DEFAULT_LANGUAGE, getLocaleTag } from '../i18n/languages.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';

const QUESTION_TYPE_KEYS = {
  choice: 'choice',
  multi_choice: 'multiChoice',
  milestone_list: 'milestoneList',
  date: 'date',
  number: 'number',
  url: 'url',
  file: 'file',
  text: 'text',
  long_text: 'longText'
};

const PROTECTED_QUESTION_IDS = new Set(['ProjectType']);

const getQuestionTypeMeta = (type, t) => {
  const key = QUESTION_TYPE_KEYS[type] || QUESTION_TYPE_KEYS.choice;
  return {
    label: t(`backOffice.main.questionTypes.${key}.label`),
    description: t(`backOffice.main.questionTypes.${key}.description`)
  };
};

const formatOperatorSymbol = (operator, t) => {
  switch (operator) {
    case 'equals':
      return '=';
    case 'not_equals':
      return '≠';
    case 'contains':
      return t('backOffice.main.operatorContains');
    case 'lt':
      return '<';
    case 'lte':
      return '≤';
    case 'gt':
      return '>';
    case 'gte':
      return '≥';
    default:
      return operator || '=';
  }
};

const buildConditionSummary = (question, allQuestions, t, language) => {
  const conditionGroups = normalizeConditionGroups(question);
  const conditionEntries = getConditionQuestionEntries(allQuestions, language);
  const summaries = [];

  for (let groupIndex = 0; groupIndex < conditionGroups.length; groupIndex += 1) {
    const group = conditionGroups[groupIndex];
    const conditions = Array.isArray(group && group.conditions) ? group.conditions : [];

    if (conditions.length === 0) {
      continue;
    }

    const parts = [];
    for (let conditionIndex = 0; conditionIndex < conditions.length; conditionIndex += 1) {
      const condition = conditions[conditionIndex];
      if (!condition) {
        continue;
      }

      const refQuestion = conditionEntries.find((item) => item.id === condition.question);
      const label = refQuestion ? resolveLocalizedText(refQuestion.question, language) : t('backOffice.main.questionFallbackTemplate', { id: condition.question });
      const operator = formatOperatorSymbol(condition.operator, t);

      const value = typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value);
      const connector = conditionIndex > 0 ? (group.logic === 'any' ? t('backOffice.main.logicOr') : t('backOffice.main.logicAnd')) : '';
      parts.push({ label, operator, value, connector });
    }

    if (parts.length > 0) {
      summaries.push({
        index: groupIndex + 1,
        logic: group.logic === 'any' ? t('backOffice.main.logicOr') : t('backOffice.main.logicAnd'),
        parts
      });
    }
  }

  return summaries;
};

const buildRuleConditionSummary = (rule, questions, t, language) => {
  const groups = normalizeConditionGroups(rule, sanitizeRuleCondition);
  const conditionEntries = getConditionQuestionEntries(questions, language);
  const formatted = [];

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const conditions = Array.isArray(group && group.conditions) ? group.conditions : [];

    if (conditions.length === 0) {
      continue;
    }

    const items = [];
    for (let conditionIndex = 0; conditionIndex < conditions.length; conditionIndex += 1) {
      const condition = conditions[conditionIndex];
      if (!condition) {
        continue;
      }

      if (condition.type === 'timing') {
        const requirement = normalizeTimingRequirement(condition);
        const start = condition.startQuestion || t('backOffice.main.timingStartFallback');
        const end = condition.endQuestion || t('backOffice.main.timingEndFallback');
        const constraintParts = [];

        if (typeof requirement.minimumWeeks === 'number') {
          constraintParts.push(`≥ ${t('synthesisReport.weeksValueTemplate', { value: requirement.minimumWeeks })}`);
        }
        if (typeof requirement.maximumWeeks === 'number') {
          constraintParts.push(`≤ ${t('synthesisReport.weeksValueTemplate', { value: requirement.maximumWeeks })}`);
        }
        if (typeof requirement.minimumDays === 'number') {
          constraintParts.push(`≥ ${t('synthesisReport.daysValueTemplate', { value: requirement.minimumDays })}`);
        }
        if (typeof requirement.maximumDays === 'number') {
          constraintParts.push(`≤ ${t('synthesisReport.daysValueTemplate', { value: requirement.maximumDays })}`);
        }

        const constraint = constraintParts.length > 0 ? constraintParts.join(' / ') : t('backOffice.main.timingCustomRange');
        items.push({
          type: 'timing',
          description: t('backOffice.main.timingWindowTemplate', { start, end, constraint })
        });
        continue;
      }

      const refQuestion = conditionEntries.find((item) => item.id === condition.question);
      const label = refQuestion ? resolveLocalizedText(refQuestion.question, language) : t('backOffice.main.questionFallbackTemplate', { id: condition.question });
      const operator = formatOperatorSymbol(condition.operator, t);
      const value = typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value);

      items.push({
        type: 'question',
        description: t('backOffice.main.conditionDescriptionTemplate', { label, operator, value })
      });
    }

    if (items.length > 0) {
      formatted.push({
        index: groupIndex + 1,
        logic: group.logic === 'any' ? t('backOffice.main.logicOr') : t('backOffice.main.logicAnd'),
        items
      });
    }
  }

  return formatted;
};

const toDisplayText = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (item == null ? '' : String(item))).filter(Boolean).join(', ');
  }

  if (value == null) {
    return '';
  }

  return String(value);
};

const normalizeChoiceAnswer = (answer) => {
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    return {
      value: typeof answer.value !== 'undefined'
        ? answer.value
        : typeof answer.label !== 'undefined'
          ? answer.label
          : '',
      children: Array.isArray(answer.children) ? answer.children : [],
      otherText: typeof answer.otherText === 'string' ? answer.otherText : '',
      childrenOtherText: typeof answer.childrenOtherText === 'string' ? answer.childrenOtherText : ''
    };
  }

  return {
    value: typeof answer === 'string' ? answer : '',
    children: [],
    otherText: '',
    childrenOtherText: ''
  };
};

const normalizeMultiChoiceAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return { values: answer, children: {}, otherText: '', childrenOtherText: {} };
  }

  if (answer && typeof answer === 'object') {
    const values = Array.isArray(answer.values) ? answer.values : [];
    const children = answer.children && typeof answer.children === 'object' ? answer.children : {};
    const childrenOtherText = answer.childrenOtherText && typeof answer.childrenOtherText === 'object'
      ? answer.childrenOtherText
      : {};
    return {
      values,
      children,
      otherText: typeof answer.otherText === 'string' ? answer.otherText : '',
      childrenOtherText
    };
  }

  return { values: [], children: {}, otherText: '', childrenOtherText: {} };
};

const buildMultiChoiceAnswerPayload = (values, children, otherText, childrenOtherText = {}) => {
  const sanitizedValues = Array.isArray(values) ? values.filter(Boolean) : [];
  const sanitizedChildren = Object.entries(children || {})
    .reduce((acc, [key, childValues]) => {
      const normalized = Array.isArray(childValues)
        ? childValues.filter(Boolean)
        : [];
      if (normalized.length > 0) {
        acc[key] = normalized;
      }
      return acc;
    }, {});

  const sanitizedOtherText = typeof otherText === 'string' ? otherText : '';
  const sanitizedChildrenOtherText = Object.entries(childrenOtherText || {})
    .reduce((acc, [key, value]) => {
      if (!sanitizedChildren[key]) {
        return acc;
      }
      const normalized = typeof value === 'string' ? value.trim() : '';
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    }, {});

  if (
    Object.keys(sanitizedChildren).length === 0
    && Object.keys(sanitizedChildrenOtherText).length === 0
    && !sanitizedOtherText
  ) {
    return sanitizedValues;
  }

  return {
    values: sanitizedValues,
    children: sanitizedChildren,
    otherText: sanitizedOtherText,
    childrenOtherText: sanitizedChildrenOtherText
  };
};



const getQuestionOptionLabel = (option) => {
  if (typeof option === 'string') {
    return option;
  }

  if (option && typeof option === 'object') {
    if (typeof option.label === 'string') {
      return option.label;
    }
    if (typeof option.value === 'string') {
      return option.value;
    }
  }

  return '';
};

const collectRuleTeamIds = (rule) => {
  const teamIds = new Set();

  if (!rule || typeof rule !== 'object') {
    return teamIds;
  }

  const baseTeams = Array.isArray(rule?.teams) ? rule.teams : [];
  baseTeams.forEach((teamId) => {
    if (typeof teamId === 'string' && teamId.trim() !== '') {
      teamIds.add(teamId);
    }
  });

  const routingRules = Array.isArray(rule?.teamRoutingRules) ? rule.teamRoutingRules : [];
  routingRules.forEach((route) => {
    const targetTeamId = typeof route?.targetTeamId === 'string' ? route.targetTeamId.trim() : '';
    if (targetTeamId !== '') {
      teamIds.add(targetTeamId);
    }
  });

  if (rule?.questions && typeof rule.questions === 'object') {
    Object.keys(rule.questions).forEach((teamId) => {
      if (typeof teamId === 'string' && teamId.trim() !== '') {
        teamIds.add(teamId);
      }
    });
  }

  const risks = Array.isArray(rule?.risks) ? rule.risks : [];
  risks.forEach((risk) => {
    if (risk && typeof risk.teamId === 'string' && risk.teamId.trim() !== '') {
      teamIds.add(risk.teamId);
    }
  });

  return teamIds;
};

const formatGuidanceTips = (guidance, language = DEFAULT_LANGUAGE) => {
  if (!guidance || !Array.isArray(guidance.tips)) {
    return [];
  }

  const tips = [];
  for (let index = 0; index < guidance.tips.length; index += 1) {
    const resolvedTip = resolveLocalizedText(guidance.tips[index], language).trim();
    if (resolvedTip !== '') {
      tips.push(resolvedTip);
    }
  }

  return tips;
};

const getTeamLabel = (teamId, teams) => {
  for (let index = 0; index < teams.length; index += 1) {
    const team = teams[index];
    if (team && team.id === teamId) {
      return `${team.name || team.id}`;
    }
  }
  return teamId;
};

const PRIORITY_WEIGHTS = {
  critical: 3,
  elevated: 2,
  standard: 1
};

const RISK_PRIORITY_LABEL_KEYS = {
  critical: 'riskPriorityToAnticipateUrgently',
  elevated: 'riskPriorityToAnticipate',
  standard: 'riskPriorityToDo'
};

const RISK_LEVEL_LABEL_KEYS = {
  high: 'riskLevelHigh',
  medium: 'riskLevelMedium',
  low: 'riskLevelLow'
};

const getRiskPriorityLabel = (t, priority) =>
  RISK_PRIORITY_LABEL_KEYS[priority] ? t(`backOffice.ruleEditor.${RISK_PRIORITY_LABEL_KEYS[priority]}`) : priority;

const getRiskLevelLabel = (t, level) =>
  RISK_LEVEL_LABEL_KEYS[level] ? t(`backOffice.ruleEditor.${RISK_LEVEL_LABEL_KEYS[level]}`) : level;

const RISK_WEIGHT_KEYS = ['low', 'medium', 'high'];

const buildRiskWeightFields = (t) =>
  RISK_WEIGHT_KEYS.map((key) => ({
    key,
    label: t(`backOffice.main.riskWeightFields.${key}.label`),
    description: t(`backOffice.main.riskWeightFields.${key}.description`)
  }));

const parseScoreValue = (value, fallback, { allowNull = false } = {}) => {
  if (allowNull && (value === null || value === undefined || value === '')) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed < 0 ? 0 : parsed;
};

const getRuleMinScoreValue = (rule) => parseScoreValue(
  rule?.minScore !== undefined ? rule.minScore : rule?.minRisks,
  0
);

const getRuleMaxScoreValue = (rule) => parseScoreValue(
  rule?.maxScore !== undefined ? rule.maxScore : rule?.maxRisks,
  null,
  { allowNull: true }
);

const formatScoreValue = (value, language) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toLocaleString(getLocaleTag(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const getPointUnit = (value, t) => t(Math.abs(value - 1) < 1e-9 ? 'backOffice.main.pointSingular' : 'backOffice.main.pointPlural');

const interpolateNodes = (template, values) =>
  template.split(/(\{\{\s*\w+\s*\}\})/g).map((part, index) => {
    const match = part.match(/^\{\{\s*(\w+)\s*\}\}$/);
    if (match && Object.prototype.hasOwnProperty.call(values, match[1])) {
      return <React.Fragment key={index}>{values[match[1]]}</React.Fragment>;
    }
    return part;
  });

const getHighestRiskPriority = (risks = []) => {
  if (!Array.isArray(risks) || risks.length === 0) {
    return null;
  }

  let bestPriority = null;

  risks.forEach((risk) => {
    const priority = risk?.priority;
    if (!priority) {
      return;
    }

    const currentWeight = PRIORITY_WEIGHTS[priority] || 0;
    const bestWeight = PRIORITY_WEIGHTS[bestPriority] || 0;

    if (!bestPriority || currentWeight > bestWeight) {
      bestPriority = priority;
    }
  });

  return bestPriority;
};

const getPriorityBadgeClasses = (priority) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'elevated':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'standard':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
};

const getProjectFilterTypeLabel = (t, type) => {
  if (type === 'text') return t('backOffice.main.textFieldLabel');
  if (type === 'select') return t('backOffice.main.dropdownFieldLabel');
  if (type === 'sort') return t('backOffice.main.dateSortFieldLabel');
  return null;
};

const FILTER_COMPATIBLE_QUESTION_TYPES = new Set([
  'choice',
  'multi_choice',
  'text',
  'long_text',
  'number',
  'url',
  'date'
]);

const getInspirationFilterTypeLabel = (t, type) => {
  if (type === 'text') return t('backOffice.main.textFieldLabel');
  if (type === 'select') return t('backOffice.main.dropdownFieldLabel');
  return null;
};

const INSPIRATION_FILTER_COMPATIBLE_FIELD_TYPES = new Set([
  'select',
  'multi_select',
  'text',
  'long_text',
  'number',
  'url',
  'date'
]);

const INSPIRATION_FORM_FIELD_TYPE_KEYS = {
  text: 'singleLineTextLabel',
  long_text: 'longTextLabel',
  select: 'dropdownFieldLabel',
  multi_select: 'multiSelectLabel',
  url: 'urlFieldLabel',
  documents: 'documentsFieldLabel'
};

const getInspirationFormFieldTypeLabel = (t, type) => {
  const key = INSPIRATION_FORM_FIELD_TYPE_KEYS[type];
  return key ? t(`backOffice.main.${key}`) : type;
};

const buildInspirationFormFieldTypeOptions = (t) =>
  Object.keys(INSPIRATION_FORM_FIELD_TYPE_KEYS).map((value) => ({
    value,
    label: getInspirationFormFieldTypeLabel(t, value)
  }));

const INSPIRATION_FORM_FIELD_PLACEHOLDER_TYPES = new Set([
  'text',
  'long_text',
  'select',
  'url'
]);

const PROJECT_FILTER_FIELD_DESCRIPTION_IDS = new Set(['projectName', 'teamLead', 'teamLeadTeam', 'dateOrder']);

const getProjectFilterFieldDescription = (t, fieldId) =>
  PROJECT_FILTER_FIELD_DESCRIPTION_IDS.has(fieldId)
    ? t(`backOffice.main.projectFilterFieldDescriptions.${fieldId}`)
    : '';

const SHOWCASE_THEME_PALETTE_FIELD_KEYS = [
  'backgroundStart',
  'backgroundMid',
  'backgroundEnd',
  'glowPrimary',
  'glowSecondary',
  'accentPrimary',
  'accentSecondary',
  'surface',
  'border',
  'textPrimary',
  'textSecondary',
  'highlight'
];

const buildShowcaseThemePaletteFields = (t) =>
  SHOWCASE_THEME_PALETTE_FIELD_KEYS.map((key) => ({
    key,
    label: t(`backOffice.main.showcaseThemePaletteFields.${key}.label`),
    description: t(`backOffice.main.showcaseThemePaletteFields.${key}.description`)
  }));

const createEmptyInspirationFormField = () => ({
  id: '',
  label: '',
  type: 'text',
  placeholder: '',
  options: '',
  required: false,
  enabled: true
});

export const BackOffice = ({
  projects,
  questions,
  setQuestions,
  rules,
  setRules,
  riskLevelRules,
  setRiskLevelRules,
  riskWeights,
  setRiskWeights,
  teams,
  setTeams,
  showcaseThemes,
  setShowcaseThemes,
  projectFilters,
  setProjectFilters,
  inspirationFilters,
  setInspirationFilters,
  inspirationFormFields,
  setInspirationFormFields,
  onboardingTourConfig,
  setOnboardingTourConfig,
  validationCommitteeConfig,
  setValidationCommitteeConfig,
  adminEmails,
  setAdminEmails,
  currentUserEmail = '',
  isCurrentUserAdmin = false,
  activityScope,
  onSharePointReinitialize,
  sharePointReinitializeState = { inProgress: false, message: '', status: 'idle' }
}) => {
  const { t, language } = useTranslation();
  // Aperçu de conditions (onglet questions/règles) : simule les réponses avec le périmètre
  // d'activité réel de la personne connectée, comme dans le vrai questionnaire.
  const shouldShowQuestion = useCallback(
    (question, answersForEvaluation) =>
      shouldShowQuestionBase(question, withActivityScope(answersForEvaluation, activityScope)),
    [activityScope]
  );
  const shouldShowOption = useCallback(
    (option, answersForEvaluation) =>
      shouldShowOptionBase(option, withActivityScope(answersForEvaluation, activityScope)),
    [activityScope]
  );
  const analyzeAnswers = useCallback(
    (answersForEvaluation, rulesArg, riskLevelRulesArg, riskWeightsArg) =>
      analyzeAnswersBase(
        withActivityScope(answersForEvaluation, activityScope),
        rulesArg,
        riskLevelRulesArg,
        riskWeightsArg
      ),
    [activityScope]
  );
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingRule, setEditingRule] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [draggedInspirationFieldIndex, setDraggedInspirationFieldIndex] = useState(null);
  const [dragOverInspirationFieldIndex, setDragOverInspirationFieldIndex] = useState(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const [questionTitleFilter, setQuestionTitleFilter] = useState('');
  const [questionTeamFilter, setQuestionTeamFilter] = useState('all');
  const [ruleTitleFilter, setRuleTitleFilter] = useState('');
  const [ruleTeamFilter, setRuleTeamFilter] = useState('all');
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(() => new Set());
  const [expandedRuleIds, setExpandedRuleIds] = useState(() => new Set());
  const [selectedFilterQuestionId, setSelectedFilterQuestionId] = useState('');
  const [selectedInspirationFilterQuestionId, setSelectedInspirationFilterQuestionId] = useState('');
  const [newInspirationFormField, setNewInspirationFormField] = useState(() => createEmptyInspirationFormField());
  const [teamContactDrafts, setTeamContactDrafts] = useState({});
  const undoStackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');
  const safeRiskLevelRules = Array.isArray(riskLevelRules) ? riskLevelRules : [];
  const riskLevelRuleCount = safeRiskLevelRules.length;
  const normalizedRiskWeights = useMemo(
    () => normalizeRiskWeighting(riskWeights),
    [riskWeights]
  );
  const safeShowcaseThemes = Array.isArray(showcaseThemes) && showcaseThemes.length > 0
    ? showcaseThemes
    : initialShowcaseThemes;
  const showcaseThemeCount = safeShowcaseThemes.length;
  const normalizedOnboardingConfig = useMemo(
    () => normalizeOnboardingConfig(onboardingTourConfig),
    [onboardingTourConfig]
  );
  const onboardingStepCount = normalizedOnboardingConfig.steps.length;
  const normalizedValidationCommitteeConfig = useMemo(
    () => normalizeValidationCommitteeConfig(validationCommitteeConfig),
    [validationCommitteeConfig]
  );
  const conditionQuestionEntries = useMemo(
    () => getConditionQuestionEntries(questions, language),
    [questions, language]
  );
  const showcaseActivationQuestions = useMemo(
    () => (Array.isArray(questions)
      ? questions
        .map((question) => ({
          id: question?.id || '',
          label: resolveLocalizedText(question?.question, language) || question?.id || '',
          options: getQuestionOptionEntries(question, { includeChildren: true, language })
        }))
        .filter((entry) => entry.id && entry.label && entry.options.length > 0)
      : []),
    [questions, language]
  );
  const showcaseThemeActivationConflicts = useMemo(
    () => getShowcaseThemeActivationConflicts(safeShowcaseThemes),
    [safeShowcaseThemes]
  );
  const dateQuestions = useMemo(
    () => (Array.isArray(questions) ? questions.filter((question) => question?.type === 'date') : []),
    [questions]
  );
  const createValidationCommittee = useCallback((index = 0) => ({
    id: `committee-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    name: t('backOffice.main.committeeNumberTemplate', { number: index + 1 }),
    commentRequired: true,
    emails: [],
    ruleTriggers: {
      matchMode: 'any',
      ruleIds: []
    },
    conditionGroups: [],
    riskTriggers: {
      minRiskScore: null
    },
    teamTriggers: {
      minTeamsCount: null
    }
  }), [t]);
  const parseEmailList = useCallback((value) => (
    typeof value === 'string'
      ? value
        .split(/[,;\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
      : []
  ), []);
  const normalizedAdminEmails = useMemo(
    () => (Array.isArray(adminEmails) ? adminEmails.filter(Boolean) : []),
    [adminEmails]
  );
  const [adminEmailsDraft, setAdminEmailsDraft] = useState(() => normalizedAdminEmails.join('\n'));
  useEffect(() => {
    const normalizedDraft = normalizedAdminEmails.join('\n');
    setAdminEmailsDraft((previousDraft) => (previousDraft === normalizedDraft ? previousDraft : normalizedDraft));
  }, [normalizedAdminEmails]);
  const normalizedCurrentUserEmail = useMemo(
    () => (typeof currentUserEmail === 'string' ? currentUserEmail.trim().toLowerCase() : ''),
    [currentUserEmail]
  );
  const currentUserTeamIds = useMemo(
    () => (Array.isArray(teams)
      ? teams
        .filter((team) => Array.isArray(team?.contacts) && team.contacts.some((contact) => String(contact || '').trim().toLowerCase() === normalizedCurrentUserEmail))
        .map((team) => team?.id)
        .filter(Boolean)
      : []),
    [normalizedCurrentUserEmail, teams]
  );
  const currentUserCommitteeIds = useMemo(
    () => normalizedValidationCommitteeConfig.committees
      .filter((committee) => Array.isArray(committee?.emails) && committee.emails.some((email) => String(email || '').trim().toLowerCase() === normalizedCurrentUserEmail))
      .map((committee) => committee?.id)
      .filter(Boolean),
    [normalizedCurrentUserEmail, normalizedValidationCommitteeConfig]
  );
  const hasComplianceTeamScopedAccess = currentUserTeamIds.length > 0;
  const hasValidationCommitteeScopedAccess = currentUserCommitteeIds.length > 0;
  const hasScopedBackOfficeAccess = hasComplianceTeamScopedAccess || hasValidationCommitteeScopedAccess;
  const allowedTabIds = useMemo(() => {
    if (isCurrentUserAdmin || !hasScopedBackOfficeAccess) {
      return null;
    }

    const ids = new Set(['dashboard']);

    if (hasComplianceTeamScopedAccess) {
      ids.add('teams');
      ids.add('rules');
      ids.add('complianceReview');
    }

    if (hasValidationCommitteeScopedAccess) {
      ids.add('validationCommittee');
    }

    return ids;
  }, [hasComplianceTeamScopedAccess, hasScopedBackOfficeAccess, hasValidationCommitteeScopedAccess, isCurrentUserAdmin]);

  const ruleVisibilitySource = useMemo(() => {
    if (!allowedTabIds || !allowedTabIds.has('rules')) {
      return Array.isArray(rules) ? rules : [];
    }

    return (Array.isArray(rules) ? rules : []).filter((rule) => {
      const associatedTeamIds = Array.from(collectRuleTeamIds(rule));
      return associatedTeamIds.some((teamId) => currentUserTeamIds.includes(teamId));
    });
  }, [allowedTabIds, currentUserTeamIds, rules]);

  const [selectedComplianceReviewTeamId, setSelectedComplianceReviewTeamId] = useState('');
  const [complianceReviewAnswers, setComplianceReviewAnswers] = useState({});
  const [complianceReviewDisplayMode, setComplianceReviewDisplayMode] = useState('direct');
  const [complianceReviewActiveQuestionId, setComplianceReviewActiveQuestionId] = useState('');
  const [isComplianceReviewGuidanceOpen, setIsComplianceReviewGuidanceOpen] = useState(false);

  useEffect(() => {
    const nextVisibleTeams = (!allowedTabIds || !allowedTabIds.has('teams'))
      ? teams
      : teams.filter((team) => currentUserTeamIds.includes(team?.id));

    if (selectedComplianceReviewTeamId && nextVisibleTeams.some((team) => team?.id === selectedComplianceReviewTeamId)) {
      return;
    }

    const firstTeamId = Array.isArray(nextVisibleTeams) && nextVisibleTeams.length > 0 ? (nextVisibleTeams[0]?.id || '') : '';
    setSelectedComplianceReviewTeamId(firstTeamId);
  }, [allowedTabIds, currentUserTeamIds, selectedComplianceReviewTeamId, teams]);

  const complianceReviewQuestionnaire = useMemo(() => {
    if (!Array.isArray(questions)) {
      return [];
    }

    return questions.filter((question) => shouldShowQuestion(question, complianceReviewAnswers));
  }, [questions, complianceReviewAnswers, shouldShowQuestion]);

  const complianceReviewQuestionIndexById = useMemo(() => {
    const map = new Map();
    complianceReviewQuestionnaire.forEach((question, index) => {
      if (question?.id) {
        map.set(question.id, index);
      }
    });
    return map;
  }, [complianceReviewQuestionnaire]);

  const complianceReviewActiveQuestionIndex = useMemo(() => {
    if (complianceReviewQuestionnaire.length === 0) {
      return -1;
    }

    if (!complianceReviewActiveQuestionId) {
      return 0;
    }

    const index = complianceReviewQuestionIndexById.get(complianceReviewActiveQuestionId);
    return typeof index === 'number' ? index : 0;
  }, [complianceReviewActiveQuestionId, complianceReviewQuestionIndexById, complianceReviewQuestionnaire]);

  const complianceReviewCurrentQuestion =
    complianceReviewActiveQuestionIndex >= 0
      ? complianceReviewQuestionnaire[complianceReviewActiveQuestionIndex] || null
      : null;

  const complianceReviewEffectiveActiveQuestionId = complianceReviewCurrentQuestion?.id || '';

  useEffect(() => {
    if (!complianceReviewActiveQuestionId) {
      return;
    }

    if (complianceReviewQuestionIndexById.has(complianceReviewActiveQuestionId)) {
      return;
    }

    setComplianceReviewActiveQuestionId('');
  }, [complianceReviewActiveQuestionId, complianceReviewQuestionIndexById]);

  const complianceReviewScopedAnswers = useMemo(() => {
    if (!complianceReviewEffectiveActiveQuestionId) {
      return {};
    }

    const activeQuestionIndex = complianceReviewQuestionIndexById.get(complianceReviewEffectiveActiveQuestionId);
    if (typeof activeQuestionIndex !== 'number') {
      return {};
    }

    if (complianceReviewDisplayMode === 'direct') {
      if (!Object.prototype.hasOwnProperty.call(complianceReviewAnswers, complianceReviewEffectiveActiveQuestionId)) {
        return {};
      }

      return {
        [complianceReviewEffectiveActiveQuestionId]: complianceReviewAnswers[complianceReviewEffectiveActiveQuestionId]
      };
    }

    const nextAnswers = {};
    for (let index = 0; index <= activeQuestionIndex; index += 1) {
      const questionId = complianceReviewQuestionnaire[index]?.id;
      if (!questionId || !Object.prototype.hasOwnProperty.call(complianceReviewAnswers, questionId)) {
        continue;
      }
      nextAnswers[questionId] = complianceReviewAnswers[questionId];
    }

    return nextAnswers;
  }, [
    complianceReviewAnswers,
    complianceReviewDisplayMode,
    complianceReviewEffectiveActiveQuestionId,
    complianceReviewQuestionIndexById,
    complianceReviewQuestionnaire
  ]);

  const complianceReviewAnalysis = useMemo(
    () => analyzeAnswers(complianceReviewScopedAnswers, Array.isArray(rules) ? rules : [], safeRiskLevelRules, normalizedRiskWeights),
    [complianceReviewScopedAnswers, rules, safeRiskLevelRules, normalizedRiskWeights, analyzeAnswers]
  );

  const selectedComplianceReviewTeam = useMemo(
    () => (Array.isArray(teams) ? teams.find((team) => team?.id === selectedComplianceReviewTeamId) || null : null),
    [teams, selectedComplianceReviewTeamId]
  );

  const complianceReviewTriggeredRules = useMemo(
    () => (Array.isArray(complianceReviewAnalysis?.triggeredRules)
      ? complianceReviewAnalysis.triggeredRules.filter((rule) => collectRuleTeamIds(rule).has(selectedComplianceReviewTeamId))
      : []),
    [complianceReviewAnalysis, selectedComplianceReviewTeamId]
  );

  const complianceReviewTeamQuestions = useMemo(() => {
    const allQuestionsByTeam = complianceReviewAnalysis?.questions;
    if (!allQuestionsByTeam || typeof allQuestionsByTeam !== 'object' || !selectedComplianceReviewTeamId) {
      return [];
    }

    return Array.isArray(allQuestionsByTeam[selectedComplianceReviewTeamId])
      ? allQuestionsByTeam[selectedComplianceReviewTeamId]
      : [];
  }, [complianceReviewAnalysis, selectedComplianceReviewTeamId]);

  const complianceReviewTeamRisks = useMemo(
    () => (Array.isArray(complianceReviewAnalysis?.risks)
      ? complianceReviewAnalysis.risks.filter((risk) => risk?.teamId === selectedComplianceReviewTeamId)
      : []),
    [complianceReviewAnalysis, selectedComplianceReviewTeamId]
  );


  const updateValidationCommitteeConfig = useCallback(
    (updater) => {
      if (typeof setValidationCommitteeConfig !== 'function') {
        return;
      }
      setValidationCommitteeConfig((prev) =>
        normalizeValidationCommitteeConfig(
          typeof updater === 'function' ? updater(prev) : updater
        )
      );
    },
    [setValidationCommitteeConfig]
  );
  const updateCommitteeEntry = useCallback(
    (committeeId, updater) => {
      updateValidationCommitteeConfig((prev) => {
        const normalized = normalizeValidationCommitteeConfig(prev);
        const nextCommittees = normalized.committees.map((committee) =>
          committee.id === committeeId
            ? typeof updater === 'function'
              ? updater(committee)
              : updater
            : committee
        );
        return {
          ...normalized,
          committees: nextCommittees
        };
      });
    },
    [updateValidationCommitteeConfig]
  );
  const sanitizeCommitteeConditionGroups = useCallback(
    (groups) => (
      Array.isArray(groups)
        ? groups.map((group) => ({
            ...group,
            conditions: Array.isArray(group.conditions)
              ? group.conditions.map((condition) => {
                  const sanitizedCondition = sanitizeRuleCondition(condition);
                  if (sanitizedCondition.type === 'timing') {
                    return sanitizedCondition;
                  }

                  const question = questions.find((item) => item.id === sanitizedCondition.question);
                  const questionType = question?.type || 'choice';
                  return {
                    ...sanitizedCondition,
                    operator: ensureOperatorForType(questionType, sanitizedCondition.operator)
                  };
                })
              : []
          }))
        : []
    ),
    [questions]
  );
  const updateCommitteeConditionGroups = useCallback(
    (committeeId, updater) => {
      updateCommitteeEntry(committeeId, (prev) => {
        const currentGroups = Array.isArray(prev.conditionGroups) ? prev.conditionGroups : [];
        const nextGroups = sanitizeCommitteeConditionGroups(
          typeof updater === 'function' ? updater(currentGroups) : updater
        );
        return applyRuleConditionGroups(prev, nextGroups);
      });
    },
    [sanitizeCommitteeConditionGroups, updateCommitteeEntry]
  );
  const withUpdatedCommitteeCondition = useCallback(
    (groups, groupIndex, conditionIndex, updater) => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      const currentCondition = sanitizeRuleCondition(
        conditions[conditionIndex] || createEmptyQuestionCondition()
      );
      const updatedCondition = sanitizeRuleCondition(
        updater ? updater(currentCondition) || currentCondition : currentCondition
      );

      const nextCondition = updatedCondition.type === 'timing'
        ? updatedCondition
        : (() => {
          const question = questions.find((item) => item.id === updatedCondition.question);
          const questionType = question?.type || 'choice';
          return {
            ...updatedCondition,
            operator: ensureOperatorForType(questionType, updatedCondition.operator)
          };
        })();

      conditions[conditionIndex] = nextCondition;
      updated[groupIndex] = { ...target, conditions };
      return updated;
    },
    [questions]
  );
  const addCommitteeConditionGroup = useCallback(
    (committeeId) => {
      updateCommitteeConditionGroups(committeeId, (groups) => ([
        ...groups,
        { logic: 'all', conditions: [createEmptyQuestionCondition()] }
      ]));
    },
    [updateCommitteeConditionGroups]
  );
  const updateCommitteeConditionGroupLogic = useCallback(
    (committeeId, groupIndex, logic) => {
      updateCommitteeConditionGroups(committeeId, (groups) => {
        const updated = [...groups];
        const target = updated[groupIndex] || { logic: 'all', conditions: [] };
        updated[groupIndex] = {
          ...target,
          logic: logic === 'any' ? 'any' : 'all'
        };
        return updated;
      });
    },
    [updateCommitteeConditionGroups]
  );
  const deleteCommitteeConditionGroup = useCallback(
    (committeeId, groupIndex) => {
      updateCommitteeConditionGroups(committeeId, (groups) => groups.filter((_, idx) => idx !== groupIndex));
    },
    [updateCommitteeConditionGroups]
  );
  const addCommitteeCondition = useCallback(
    (committeeId, groupIndex) => {
      updateCommitteeConditionGroups(committeeId, (groups) => {
        const updated = [...groups];
        const target = updated[groupIndex] || { logic: 'all', conditions: [] };
        const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
        conditions.push(createEmptyQuestionCondition());
        updated[groupIndex] = { ...target, conditions };
        return updated;
      });
    },
    [updateCommitteeConditionGroups]
  );
  const updateCommitteeConditionField = useCallback(
    (committeeId, groupIndex, conditionIndex, field, value) => {
      updateCommitteeConditionGroups(committeeId, (groups) =>
        withUpdatedCommitteeCondition(groups, groupIndex, conditionIndex, (condition) => ({
          ...condition,
          [field]: value
        }))
      );
    },
    [updateCommitteeConditionGroups, withUpdatedCommitteeCondition]
  );
  const deleteCommitteeCondition = useCallback(
    (committeeId, groupIndex, conditionIndex) => {
      updateCommitteeConditionGroups(committeeId, (groups) => {
        const updated = [...groups];
        const target = updated[groupIndex] || { logic: 'all', conditions: [] };
        const conditions = Array.isArray(target.conditions)
          ? target.conditions.filter((_, idx) => idx !== conditionIndex)
          : [];
        updated[groupIndex] = { ...target, conditions };
        return updated;
      });
    },
    [updateCommitteeConditionGroups]
  );
  const handleCommitteeConditionTypeChange = useCallback(
    (committeeId, groupIndex, conditionIndex, type) => {
      updateCommitteeConditionGroups(committeeId, (groups) => {
        const updated = [...groups];
        const target = updated[groupIndex] || { logic: 'all', conditions: [] };
        const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
        const normalizedType = type === 'timing' ? 'timing' : 'question';
        conditions[conditionIndex] = normalizedType === 'timing'
          ? createEmptyTimingCondition()
          : createEmptyQuestionCondition();
        updated[groupIndex] = { ...target, conditions };
        return updated;
      });
    },
    [updateCommitteeConditionGroups]
  );

  const removeCommitteeEntry = useCallback(
    (committeeId) => {
      updateValidationCommitteeConfig((prev) => {
        const normalized = normalizeValidationCommitteeConfig(prev);
        const nextCommittees = normalized.committees.filter((committee) => committee.id !== committeeId);
        return {
          ...normalized,
          committees: nextCommittees
        };
      });
    },
    [updateValidationCommitteeConfig]
  );

  const addCommitteeEntry = useCallback(() => {
    updateValidationCommitteeConfig((prev) => {
      const normalized = normalizeValidationCommitteeConfig(prev);
      return {
        ...normalized,
        committees: [
          ...normalized.committees,
          createValidationCommittee(normalized.committees.length)
        ]
      };
    });
  }, [createValidationCommittee, updateValidationCommitteeConfig]);

  const normalizeColorValue = useCallback((value, fallback = '#000000') => {
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
      return trimmed;
    }

    return fallback;
  }, []);

  const updateShowcaseThemeField = useCallback((themeIndex, field, value) => {
    if (typeof setShowcaseThemes !== 'function') {
      return;
    }

    setShowcaseThemes((previousThemes) => {
      const nextThemes = Array.isArray(previousThemes) ? previousThemes.slice() : [];
      const targetTheme = nextThemes[themeIndex];

      if (!targetTheme) {
        return previousThemes;
      }

      const aliases = Array.isArray(targetTheme.aliases) ? targetTheme.aliases.slice() : [];
      if (field === 'label' && typeof targetTheme.label === 'string' && targetTheme.label.trim().length > 0) {
        const currentLabel = targetTheme.label.trim();
        if (!aliases.includes(currentLabel)) {
          aliases.push(currentLabel);
        }
      }

      nextThemes[themeIndex] = {
        ...targetTheme,
        [field]: value,
        aliases
      };

      return nextThemes;
    });
  }, [setShowcaseThemes]);

  const updateShowcaseThemeActivation = useCallback((themeIndex, field, value) => {
    if (typeof setShowcaseThemes !== 'function') {
      return;
    }

    setShowcaseThemes((previousThemes) => {
      const nextThemes = Array.isArray(previousThemes) ? previousThemes.slice() : [];
      const targetTheme = nextThemes[themeIndex];

      if (!targetTheme) {
        return previousThemes;
      }

      const currentActivation = normalizeThemeActivation(targetTheme);
      const nextActivation = {
        ...currentActivation,
        [field]: value
      };

      if (field === 'questionId') {
        nextActivation.optionLabel = '';
      }

      nextThemes[themeIndex] = {
        ...targetTheme,
        activation: nextActivation
      };

      return nextThemes;
    });
  }, [setShowcaseThemes]);

  const updateShowcaseThemePalette = useCallback((themeIndex, key, value) => {
    if (typeof setShowcaseThemes !== 'function') {
      return;
    }

    setShowcaseThemes((previousThemes) => {
      const nextThemes = Array.isArray(previousThemes) ? previousThemes.slice() : [];
      const targetTheme = nextThemes[themeIndex];

      if (!targetTheme) {
        return previousThemes;
      }

      const nextPalette = {
        ...(targetTheme.palette || {}),
        [key]: normalizeColorValue(value, targetTheme.palette?.[key] || '#000000')
      };

      nextThemes[themeIndex] = {
        ...targetTheme,
        palette: nextPalette
      };

      return nextThemes;
    });
  }, [normalizeColorValue, setShowcaseThemes]);

  const addShowcaseTheme = useCallback(() => {
    if (typeof setShowcaseThemes !== 'function') {
      return;
    }

    const basePalette = safeShowcaseThemes[0]?.palette || initialShowcaseThemes[0]?.palette || {};
    const nextIndex = Array.isArray(showcaseThemes) ? showcaseThemes.length + 1 : safeShowcaseThemes.length + 1;
    const newTheme = {
      id: `theme-${nextIndex}-${Date.now().toString(36).slice(2, 6)}`,
      label: t('backOffice.main.newThemeNameDefault'),
      description: t('backOffice.main.newThemeDescriptionDefault'),
      aliases: [t('backOffice.main.newThemeNameDefault')],
      palette: { ...basePalette }
    };

    setShowcaseThemes((previousThemes) => {
      const nextThemes = Array.isArray(previousThemes) ? previousThemes.slice() : [];
      nextThemes.push(newTheme);
      return nextThemes;
    });
  }, [safeShowcaseThemes, setShowcaseThemes, showcaseThemes, t]);

  const deleteShowcaseTheme = useCallback((themeId) => {
    if (typeof setShowcaseThemes !== 'function' || !themeId || showcaseThemeCount <= 1) {
      return;
    }

    setShowcaseThemes((previousThemes) => {
      const nextThemes = Array.isArray(previousThemes)
        ? previousThemes.filter(theme => theme?.id !== themeId)
        : [];

      return nextThemes.length > 0 ? nextThemes : previousThemes;
    });
  }, [setShowcaseThemes, showcaseThemeCount]);

  const updateOnboardingConfig = useCallback((updater) => {
    if (typeof setOnboardingTourConfig !== 'function') {
      return;
    }

    setOnboardingTourConfig((prevConfig) => {
      const normalized = normalizeOnboardingConfig(prevConfig);
      const nextConfig = updater(normalized) || normalized;
      return normalizeOnboardingConfig(nextConfig);
    });
  }, [setOnboardingTourConfig]);

  const updateOnboardingField = useCallback((field, value) => {
    updateOnboardingConfig(prev => ({ ...prev, [field]: value }));
  }, [updateOnboardingConfig]);

  const updateOnboardingLabel = useCallback((field, value) => {
    updateOnboardingConfig(prev => ({
      ...prev,
      labels: {
        ...prev.labels,
        [field]: value
      }
    }));
  }, [updateOnboardingConfig]);

  const addOnboardingStep = useCallback(() => {
    updateOnboardingConfig((prev) => {
      const nextSteps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      nextSteps.push(createOnboardingStep(nextSteps.length));
      return { ...prev, steps: nextSteps };
    });
  }, [updateOnboardingConfig]);

  const moveOnboardingStep = useCallback((index, direction) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= steps.length) {
        return prev;
      }
      const [removed] = steps.splice(index, 1);
      steps.splice(nextIndex, 0, removed);
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const deleteOnboardingStep = useCallback((index) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      steps.splice(index, 1);
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const updateOnboardingStepField = useCallback((index, field, value) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      const target = steps[index];
      if (!target) {
        return prev;
      }
      steps[index] = {
        ...target,
        [field]: value
      };
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const addOnboardingAction = useCallback((stepIndex) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      const target = steps[stepIndex];
      if (!target) {
        return prev;
      }
      const actions = Array.isArray(target.actions) ? target.actions.slice() : [];
      actions.push(createOnboardingAction());
      steps[stepIndex] = { ...target, actions };
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const updateOnboardingActionField = useCallback((stepIndex, actionIndex, field, value) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      const target = steps[stepIndex];
      if (!target) {
        return prev;
      }
      const actions = Array.isArray(target.actions) ? target.actions.slice() : [];
      const action = actions[actionIndex];
      if (!action) {
        return prev;
      }
      actions[actionIndex] = {
        ...action,
        [field]: value
      };
      steps[stepIndex] = { ...target, actions };
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const deleteOnboardingAction = useCallback((stepIndex, actionIndex) => {
    updateOnboardingConfig((prev) => {
      const steps = Array.isArray(prev.steps) ? prev.steps.slice() : [];
      const target = steps[stepIndex];
      if (!target) {
        return prev;
      }
      const actions = Array.isArray(target.actions) ? target.actions.slice() : [];
      actions.splice(actionIndex, 1);
      steps[stepIndex] = { ...target, actions };
      return { ...prev, steps };
    });
  }, [updateOnboardingConfig]);

  const resetOnboardingConfig = useCallback(() => {
    if (typeof setOnboardingTourConfig !== 'function') {
      return;
    }
    setOnboardingTourConfig(normalizeOnboardingConfig(initialOnboardingTourConfig));
  }, [setOnboardingTourConfig]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (!stack || stack.length === 0) {
      setUndoMessage('');
      setCanUndo(false);
      return;
    }

    const entry = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);

    if (!entry) {
      setUndoMessage('');
      return;
    }

    switch (entry.type) {
      case 'question': {
        if (typeof setQuestions === 'function') {
          setQuestions((prevQuestions) => {
            const next = Array.isArray(prevQuestions) ? prevQuestions.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? next.length, next.length));
            next.splice(insertIndex, 0, entry.item);
            return next;
          });
        }
        setUndoMessage(t('backOffice.main.questionRestoredTemplate', { label: resolveLocalizedText(entry.item?.question, language) || entry.item?.id || t('backOffice.main.questionWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.questionDeletionUndoneAnnouncement'));
        break;
      }
      case 'rule': {
        if (typeof setRules === 'function') {
          setRules((prevRules) => {
            const next = Array.isArray(prevRules) ? prevRules.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? next.length, next.length));
            next.splice(insertIndex, 0, entry.item);
            return next;
          });
        }
        setUndoMessage(t('backOffice.main.ruleRestoredTemplate', { label: entry.item?.name || entry.item?.id || t('backOffice.main.ruleWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.ruleDeletionUndoneAnnouncement'));
        break;
      }
      case 'riskLevelRule': {
        if (typeof setRiskLevelRules === 'function') {
          setRiskLevelRules((prevRules) => {
            const base = Array.isArray(prevRules) ? prevRules.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? base.length, base.length));
            base.splice(insertIndex, 0, entry.item);
            return base;
          });
        }
        setUndoMessage(t('backOffice.main.levelRestoredTemplate', { label: entry.item?.label || entry.item?.id || t('backOffice.main.levelWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.levelDeletionUndoneAnnouncement'));
        break;
      }
      case 'team': {
        if (typeof setTeams === 'function') {
          setTeams((prevTeams) => {
            const next = Array.isArray(prevTeams) ? prevTeams.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? next.length, next.length));
            next.splice(insertIndex, 0, entry.item);
            return next;
          });
        }
        setUndoMessage(t('backOffice.main.teamRestoredTemplate', { label: entry.item?.name || entry.item?.id || t('backOffice.main.teamWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.teamDeletionUndoneAnnouncement'));
        break;
      }
      case 'projectFilter': {
        if (typeof setProjectFilters === 'function') {
          setProjectFilters((prevFilters) => {
            const normalized = normalizeProjectFilterConfig(prevFilters);
            const fields = Array.isArray(normalized.fields) ? normalized.fields.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? fields.length, fields.length));
            fields.splice(insertIndex, 0, entry.item);
            return {
              ...normalized,
              fields
            };
          });
        }
        setUndoMessage(t('backOffice.main.filterRestoredTemplate', { label: entry.item?.label || entry.item?.id || t('backOffice.main.filterWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.filterDeletionUndoneAnnouncement'));
        break;
      }
      case 'inspirationFilter': {
        if (typeof setInspirationFilters === 'function') {
          setInspirationFilters((prevFilters) => {
            const normalized = normalizeInspirationFiltersConfig(prevFilters);
            const fields = Array.isArray(normalized.fields) ? normalized.fields.slice() : [];
            const insertIndex = Math.max(0, Math.min(entry.index ?? fields.length, fields.length));
            fields.splice(insertIndex, 0, entry.item);
            return {
              ...normalized,
              fields
            };
          });
        }
        setUndoMessage(t('backOffice.main.filterRestoredTemplate', { label: entry.item?.label || entry.item?.id || t('backOffice.main.filterWordFallback') }));
        setReorderAnnouncement(t('backOffice.main.filterDeletionUndoneAnnouncement'));
        break;
      }
      default:
        setUndoMessage(t('backOffice.main.lastActionUndoneMessage'));
        break;
    }
  }, [
    setQuestions,
    setRules,
    setRiskLevelRules,
    setTeams,
    setProjectFilters,
    setInspirationFilters,
    setReorderAnnouncement,
    t,
    language
  ]);

  const confirmDeletion = useCallback((message) => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.confirm(message);
  }, []);

  const pushUndoEntry = useCallback((entry) => {
    undoStackRef.current = [...undoStackRef.current.slice(-19), entry];
    setCanUndo(true);
    if (entry && entry.message) {
      setUndoMessage(entry.message);
    } else {
      setUndoMessage(t('backOffice.main.lastDeletionSavedMessage'));
    }
  }, [t]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const keydownHandler = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }

        if (!undoStackRef.current.length) {
          return;
        }

        event.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', keydownHandler);

    return () => {
      window.removeEventListener('keydown', keydownHandler);
    };
  }, [handleUndo]);

  const questionTeamAssignments = useMemo(() => {
    const setMap = new Map();
    const safeRules = ruleVisibilitySource;

    const addTeamsForQuestion = (questionId, teamIds) => {
      if (!questionId) {
        return;
      }

      const normalizedQuestionId = typeof questionId === 'string' ? questionId : String(questionId);
      const candidates = Array.isArray(teamIds) ? teamIds : [];
      const validTeamIds = candidates.filter((teamId) => typeof teamId === 'string' && teamId.trim() !== '');

      if (validTeamIds.length === 0) {
        return;
      }

      const existing = setMap.get(normalizedQuestionId);
      if (existing) {
        validTeamIds.forEach((teamId) => existing.add(teamId));
        return;
      }

      setMap.set(normalizedQuestionId, new Set(validTeamIds));
    };

    safeRules.forEach((rule) => {
      const aggregatedTeamIds = collectRuleTeamIds(rule);
      const teamsForRule = Array.from(aggregatedTeamIds);

      if (teamsForRule.length === 0) {
        return;
      }

      const baseConditions = Array.isArray(rule?.conditions) ? rule.conditions : [];
      baseConditions.forEach((condition) => {
        if (!condition) {
          return;
        }

        if (condition.type === 'question' && condition.question) {
          addTeamsForQuestion(condition.question, teamsForRule);
          return;
        }

        if (condition.type === 'timing') {
          if (condition.startQuestion) {
            addTeamsForQuestion(condition.startQuestion, teamsForRule);
          }
          if (condition.endQuestion) {
            addTeamsForQuestion(condition.endQuestion, teamsForRule);
          }
        }
      });

      const groups = normalizeConditionGroups(rule, sanitizeRuleCondition);
      groups.forEach((group) => {
        const groupConditions = Array.isArray(group?.conditions) ? group.conditions : [];
        groupConditions.forEach((condition) => {
          if (!condition) {
            return;
          }

          if (condition.type === 'question' && condition.question) {
            addTeamsForQuestion(condition.question, teamsForRule);
            return;
          }

          if (condition.type === 'timing') {
            if (condition.startQuestion) {
              addTeamsForQuestion(condition.startQuestion, teamsForRule);
            }
            if (condition.endQuestion) {
              addTeamsForQuestion(condition.endQuestion, teamsForRule);
            }
          }
        });
      });

      const risks = Array.isArray(rule?.risks) ? rule.risks : [];
      risks.forEach((risk) => {
        const timingConstraint = sanitizeRiskTimingConstraint(risk?.timingConstraint);

        if (!timingConstraint.enabled) {
          return;
        }

        const relatedTeams = new Set(teamsForRule);
        if (risk && typeof risk.teamId === 'string' && risk.teamId.trim() !== '') {
          relatedTeams.add(risk.teamId);
        }

        if (timingConstraint.startQuestion) {
          addTeamsForQuestion(timingConstraint.startQuestion, Array.from(relatedTeams));
        }
        if (timingConstraint.endQuestion) {
          addTeamsForQuestion(timingConstraint.endQuestion, Array.from(relatedTeams));
        }
      });

      if (rule?.questions && typeof rule.questions === 'object') {
        Object.entries(rule.questions).forEach(([teamId, entries]) => {
          if (typeof teamId !== 'string' || teamId.trim() === '') {
            return;
          }

          const sanitizedEntries = Array.isArray(entries) ? entries : [];
          sanitizedEntries.forEach((entry) => {
            const sanitizedEntry = sanitizeTeamQuestionEntry(entry);
            const timingConstraint = sanitizeRiskTimingConstraint(sanitizedEntry?.timingConstraint);

            if (!timingConstraint.enabled) {
              return;
            }

            if (timingConstraint.startQuestion) {
              addTeamsForQuestion(timingConstraint.startQuestion, [teamId]);
            }
            if (timingConstraint.endQuestion) {
              addTeamsForQuestion(timingConstraint.endQuestion, [teamId]);
            }
          });
        });
      }
    });

    return new Map(
      Array.from(setMap.entries()).map(([questionId, teamSet]) => [
        questionId,
        Array.from(teamSet)
      ])
    );
  }, [ruleVisibilitySource]);

  const availableTeamFilterOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    const safeTeams = Array.isArray(teams) ? teams : [];

    safeTeams.forEach((team) => {
      if (!team || typeof team.id !== 'string' || team.id.trim() === '' || seen.has(team.id)) {
        return;
      }

      options.push({ value: team.id, label: getTeamLabel(team.id, safeTeams) });
      seen.add(team.id);
    });

    const safeRules = ruleVisibilitySource;
    safeRules.forEach((rule) => {
      collectRuleTeamIds(rule).forEach((teamId) => {
        if (!teamId || seen.has(teamId)) {
          return;
        }

        options.push({ value: teamId, label: getTeamLabel(teamId, safeTeams) });
        seen.add(teamId);
      });
    });

    return options;
  }, [teams, ruleVisibilitySource]);

  const visibleQuestionIds = useMemo(() => {
    const ids = [];
    const normalizedTitle = questionTitleFilter.trim().toLowerCase();
    const safeQuestions = Array.isArray(questions) ? questions : [];

    safeQuestions.forEach((question) => {
      if (!question) {
        return;
      }

      const questionId = typeof question.id === 'string' ? question.id : String(question.id || '');
      if (!questionId) {
        return;
      }

      const label = typeof question.question === 'string' ? question.question : '';
      const titleMatches =
        normalizedTitle === '' ||
        label.toLowerCase().includes(normalizedTitle) ||
        questionId.toLowerCase().includes(normalizedTitle);

      if (!titleMatches) {
        return;
      }

      const teamsForQuestion = questionTeamAssignments.get(questionId) || [];
      let teamMatches = true;

      if (questionTeamFilter === 'none') {
        teamMatches = teamsForQuestion.length === 0;
      } else if (questionTeamFilter !== 'all') {
        teamMatches = teamsForQuestion.includes(questionTeamFilter);
      }

      if (teamMatches) {
        ids.push(questionId);
      }
    });

    return ids;
  }, [questions, questionTitleFilter, questionTeamFilter, questionTeamAssignments]);

  const visibleQuestionIdSet = useMemo(() => new Set(visibleQuestionIds), [visibleQuestionIds]);
  const visibleQuestionEntries = useMemo(() => {
    const entries = [];
    const safeQuestions = Array.isArray(questions) ? questions : [];

    safeQuestions.forEach((question, index) => {
      if (!question || !visibleQuestionIdSet.has(question.id)) {
        return;
      }

      entries.push({ question, index });
    });

    return entries;
  }, [questions, visibleQuestionIdSet]);
  const shouldVirtualizeQuestions = visibleQuestionEntries.length > 12;

  const visibleRuleIds = useMemo(() => {
    const ids = [];
    const normalizedTitle = ruleTitleFilter.trim().toLowerCase();
    const safeRules = ruleVisibilitySource;

    safeRules.forEach((rule) => {
      if (!rule) {
        return;
      }

      const ruleId = typeof rule.id === 'string' ? rule.id : String(rule.id || '');
      if (!ruleId) {
        return;
      }

      const name = typeof rule.name === 'string' ? rule.name : '';
      const titleMatches =
        normalizedTitle === '' ||
        name.toLowerCase().includes(normalizedTitle) ||
        ruleId.toLowerCase().includes(normalizedTitle);

      if (!titleMatches) {
        return;
      }

      const associatedTeamIds = Array.from(collectRuleTeamIds(rule));
      let teamMatches = true;

      if (ruleTeamFilter === 'none') {
        teamMatches = associatedTeamIds.length === 0;
      } else if (ruleTeamFilter !== 'all') {
        teamMatches = associatedTeamIds.includes(ruleTeamFilter);
      }

      if (teamMatches) {
        ids.push(ruleId);
      }
    });

    return ids;
  }, [ruleVisibilitySource, ruleTitleFilter, ruleTeamFilter]);

  const visibleRuleIdSet = useMemo(() => new Set(visibleRuleIds), [visibleRuleIds]);
  const visibleRuleEntries = useMemo(() => {
    const entries = [];
    const safeRules = ruleVisibilitySource;

    safeRules.forEach((rule) => {
      if (!rule || !visibleRuleIdSet.has(rule.id)) {
        return;
      }

      entries.push(rule);
    });

    return entries;
  }, [ruleVisibilitySource, visibleRuleIdSet]);
  const shouldVirtualizeRules = visibleRuleEntries.length > 8;

  useEffect(() => {
    if (questionTeamFilter === 'all' || questionTeamFilter === 'none') {
      return;
    }

    const availableValues = new Set(availableTeamFilterOptions.map((option) => option.value));
    if (!availableValues.has(questionTeamFilter)) {
      setQuestionTeamFilter('all');
    }
  }, [questionTeamFilter, availableTeamFilterOptions]);

  useEffect(() => {
    if (ruleTeamFilter === 'all' || ruleTeamFilter === 'none') {
      return;
    }

    const availableValues = new Set(availableTeamFilterOptions.map((option) => option.value));
    if (!availableValues.has(ruleTeamFilter)) {
      setRuleTeamFilter('all');
    }
  }, [ruleTeamFilter, availableTeamFilterOptions]);

  const normalizedProjectFilters = useMemo(
    () => normalizeProjectFilterConfig(projectFilters),
    [projectFilters]
  );

  const defaultProjectFiltersConfig = useMemo(
    () => normalizeProjectFilterConfig(resetProjectFiltersConfig()),
    []
  );

  const projectFiltersAreDefault = useMemo(
    () => JSON.stringify(normalizedProjectFilters) === JSON.stringify(defaultProjectFiltersConfig),
    [normalizedProjectFilters, defaultProjectFiltersConfig]
  );

  const filterFields = Array.isArray(normalizedProjectFilters.fields)
    ? normalizedProjectFilters.fields
    : [];

  const normalizedInspirationFilters = useMemo(
    () => normalizeInspirationFiltersConfig(inspirationFilters),
    [inspirationFilters]
  );
  const normalizedInspirationFormFields = useMemo(
    () => normalizeInspirationFormConfig(inspirationFormFields),
    [inspirationFormFields]
  );
  const defaultInspirationFiltersConfig = useMemo(
    () => normalizeInspirationFiltersConfig(resetInspirationFiltersConfig()),
    []
  );
  const defaultInspirationFormConfig = useMemo(
    () => normalizeInspirationFormConfig(resetInspirationFormConfig()),
    []
  );
  const inspirationFiltersAreDefault = useMemo(
    () => JSON.stringify(normalizedInspirationFilters) === JSON.stringify(defaultInspirationFiltersConfig),
    [normalizedInspirationFilters, defaultInspirationFiltersConfig]
  );
  const inspirationFormAreDefault = useMemo(
    () => JSON.stringify(normalizedInspirationFormFields) === JSON.stringify(defaultInspirationFormConfig),
    [normalizedInspirationFormFields, defaultInspirationFormConfig]
  );
  const inspirationFilterFields = Array.isArray(normalizedInspirationFilters.fields)
    ? normalizedInspirationFilters.fields
    : [];
  const inspirationFormFieldEntries = Array.isArray(normalizedInspirationFormFields.fields)
    ? normalizedInspirationFormFields.fields
    : [];
  const inspirationFieldIds = useMemo(
    () => new Set(inspirationFormFieldEntries.map((field) => field.id)),
    [inspirationFormFieldEntries]
  );

  const availableFilterQuestionOptions = useMemo(() => {
    const usedQuestionIds = new Set();
    if (Array.isArray(normalizedProjectFilters.fields)) {
      normalizedProjectFilters.fields.forEach((field) => {
        if (!field) {
          return;
        }

        const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
          ? field.sourceQuestionId.trim()
          : field.id;

        if (sourceId) {
          usedQuestionIds.add(sourceId);
        }
      });
    }

    const options = Array.isArray(questions)
      ? questions
          .filter((question) => question && FILTER_COMPATIBLE_QUESTION_TYPES.has(question.type))
          .map((question) => ({
            value: question.id,
            label: question.question || question.id,
            disabled: usedQuestionIds.has(question.id),
            type: question.type
          }))
      : [];

    return options.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [questions, normalizedProjectFilters]);

  const selectedFilterOption = useMemo(() => {
    if (!selectedFilterQuestionId) {
      return null;
    }

    return availableFilterQuestionOptions.find((option) => option.value === selectedFilterQuestionId) || null;
  }, [availableFilterQuestionOptions, selectedFilterQuestionId]);

  const canAddProjectFilter = Boolean(selectedFilterOption && !selectedFilterOption.disabled);

  const availableInspirationFilterQuestionOptions = useMemo(() => {
    const usedQuestionIds = new Set();

    if (Array.isArray(normalizedInspirationFilters.fields)) {
      normalizedInspirationFilters.fields.forEach((field) => {
        if (!field) {
          return;
        }

        const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
          ? field.sourceQuestionId.trim()
          : field.id;

        if (sourceId) {
          usedQuestionIds.add(sourceId);
        }
      });
    }

    const options = Array.isArray(inspirationFormFieldEntries)
      ? inspirationFormFieldEntries
          .filter((field) => field && INSPIRATION_FILTER_COMPATIBLE_FIELD_TYPES.has(field.type))
          .map((field) => ({
            value: field.id,
            label: field.label || field.id,
            disabled: usedQuestionIds.has(field.id),
            type: field.type
          }))
      : [];

    return options.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [inspirationFormFieldEntries, normalizedInspirationFilters.fields]);

  const selectedInspirationFilterOption = useMemo(() => {
    if (!selectedInspirationFilterQuestionId) {
      return null;
    }

    return availableInspirationFilterQuestionOptions.find(
      (option) => option.value === selectedInspirationFilterQuestionId
    ) || null;
  }, [availableInspirationFilterQuestionOptions, selectedInspirationFilterQuestionId]);

  const canAddInspirationFilter = Boolean(
    selectedInspirationFilterOption && !selectedInspirationFilterOption.disabled
  );

  const handleProjectFilterToggle = useCallback((fieldId, enabled) => {
    if (typeof setProjectFilters !== 'function') {
      return;
    }

    setProjectFilters(prev => updateProjectFilterField(prev, fieldId, { enabled }));
  }, [setProjectFilters]);

  const handleProjectFilterLabelChange = useCallback((fieldId, label) => {
    if (typeof setProjectFilters !== 'function') {
      return;
    }

    setProjectFilters(prev => updateProjectFilterField(prev, fieldId, { label }));
  }, [setProjectFilters]);

  const handleAddProjectFilter = useCallback(() => {
    if (typeof setProjectFilters !== 'function') {
      return;
    }

    const questionId = typeof selectedFilterQuestionId === 'string'
      ? selectedFilterQuestionId.trim()
      : '';

    if (questionId.length === 0) {
      return;
    }

    const question = Array.isArray(questions)
      ? questions.find((item) => item && item.id === questionId)
      : null;

    if (!question || !FILTER_COMPATIBLE_QUESTION_TYPES.has(question.type)) {
      return;
    }

    setProjectFilters((prev) => {
      const normalized = normalizeProjectFilterConfig(prev);
      const existing = Array.isArray(normalized.fields)
        ? normalized.fields.some((field) => {
            if (!field) {
              return false;
            }

            const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
              ? field.sourceQuestionId.trim()
              : field.id;

            return sourceId === questionId;
          })
        : false;

      if (existing) {
        return normalized;
      }

      const type = question.type === 'choice' ? 'select' : 'text';
      const newField = {
        id: question.id,
        label: question.question || question.id,
        type,
        enabled: true,
        sourceQuestionId: question.id
      };

      if (type === 'select') {
        newField.emptyOptionLabel = question.id === 'teamLeadTeam' ? t('backOffice.main.allTeamsFilterOption') : t('backOffice.main.allValuesDefault');
      }

      const fields = Array.isArray(normalized.fields) ? [...normalized.fields, newField] : [newField];

      return {
        ...normalized,
        fields
      };
    });

    setSelectedFilterQuestionId('');
  }, [questions, selectedFilterQuestionId, setProjectFilters, t]);

  const handleAddInspirationFilter = useCallback(() => {
    if (typeof setInspirationFilters !== 'function') {
      return;
    }

    const fieldId = typeof selectedInspirationFilterQuestionId === 'string'
      ? selectedInspirationFilterQuestionId.trim()
      : '';

    if (fieldId.length === 0) {
      return;
    }

    const formField = Array.isArray(inspirationFormFieldEntries)
      ? inspirationFormFieldEntries.find((field) => field && field.id === fieldId)
      : null;

    if (!formField || !INSPIRATION_FILTER_COMPATIBLE_FIELD_TYPES.has(formField.type)) {
      return;
    }

    setInspirationFilters((prev) => {
      const normalized = normalizeInspirationFiltersConfig(prev);
      const existing = Array.isArray(normalized.fields)
        ? normalized.fields.some((field) => {
            if (!field) {
              return false;
            }

            const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
              ? field.sourceQuestionId.trim()
              : field.id;

            return sourceId === fieldId;
          })
        : false;

      if (existing) {
        return normalized;
      }

      const type = formField.type === 'select' || formField.type === 'multi_select' ? 'select' : 'text';
      const newField = {
        id: formField.id,
        label: formField.label || formField.id,
        type,
        enabled: true,
        sourceQuestionId: formField.id
      };

      if (type === 'select') {
        newField.emptyOptionLabel = t('backOffice.main.allValuesDefault');
        if (Array.isArray(formField.options)) {
          newField.options = formField.options;
        }
      }

      const fields = Array.isArray(normalized.fields) ? [...normalized.fields, newField] : [newField];

      return {
        ...normalized,
        fields
      };
    });

    setSelectedInspirationFilterQuestionId('');
  }, [
    inspirationFormFieldEntries,
    selectedInspirationFilterQuestionId,
    setInspirationFilters,
    t
  ]);

  const handleRemoveProjectFilter = useCallback((field) => {
    if (!field || typeof setProjectFilters !== 'function') {
      return;
    }

    if (field.id === 'dateOrder') {
      return;
    }

    const label = field.label || field.id || t('backOffice.main.filterWordFallback');
    const confirmationMessage = t('backOffice.main.confirmDeleteFilterTemplate', { label });
    const shouldDelete = confirmDeletion(confirmationMessage);

    if (!shouldDelete) {
      return;
    }

    const currentFields = Array.isArray(normalizedProjectFilters.fields)
      ? normalizedProjectFilters.fields
      : [];

    const index = currentFields.findIndex((item) => item && item.id === field.id);
    if (index === -1) {
      return;
    }

    const removedField = currentFields[index];
    pushUndoEntry({
      type: 'projectFilter',
      item: removedField,
      index,
      message: t('backOffice.main.filterDeletedUndoTemplate', { label: removedField.label || removedField.id || t('backOffice.main.filterWordFallback') })
    });

    setProjectFilters((prev) => {
      const normalized = normalizeProjectFilterConfig(prev);
      const fields = Array.isArray(normalized.fields)
        ? normalized.fields.filter((item) => item && item.id !== field.id)
        : [];

      return {
        ...normalized,
        fields
      };
    });
  }, [confirmDeletion, normalizedProjectFilters, pushUndoEntry, setProjectFilters, t]);

  const handleRemoveInspirationFilter = useCallback((field) => {
    if (!field || typeof setInspirationFilters !== 'function') {
      return;
    }

    const label = field.label || field.id || t('backOffice.main.filterWordFallback');
    const confirmationMessage = t('backOffice.main.confirmDeleteFilterTemplate', { label });
    const shouldDelete = confirmDeletion(confirmationMessage);

    if (!shouldDelete) {
      return;
    }

    const currentFields = Array.isArray(normalizedInspirationFilters.fields)
      ? normalizedInspirationFilters.fields
      : [];

    const index = currentFields.findIndex((item) => item && item.id === field.id);
    if (index === -1) {
      return;
    }

    const removedField = currentFields[index];
    pushUndoEntry({
      type: 'inspirationFilter',
      item: removedField,
      index,
      message: t('backOffice.main.filterDeletedUndoTemplate', { label: removedField.label || removedField.id || t('backOffice.main.filterWordFallback') })
    });

    setInspirationFilters((prev) => {
      const normalized = normalizeInspirationFiltersConfig(prev);
      const fields = Array.isArray(normalized.fields)
        ? normalized.fields.filter((item) => item && item.id !== field.id)
        : [];

      return {
        ...normalized,
        fields
      };
    });
  }, [confirmDeletion, normalizedInspirationFilters, pushUndoEntry, setInspirationFilters, t]);

  const handleProjectFilterDefaultSortChange = useCallback((value) => {
    if (typeof setProjectFilters !== 'function') {
      return;
    }

    const direction = value === 'asc' ? 'asc' : 'desc';
    setProjectFilters(prev => {
      const updated = updateProjectFilterField(prev, 'dateOrder', { defaultValue: direction });
      return {
        ...updated,
        sortOrder: direction
      };
    });
  }, [setProjectFilters]);

  const handleResetProjectFilters = useCallback(() => {
    if (typeof setProjectFilters !== 'function') {
      return;
    }

    setProjectFilters(resetProjectFiltersConfig());
  }, [setProjectFilters]);

  const formatOptionList = (options) => (Array.isArray(options) ? options.join(', ') : '');

  const parseOptionList = (value) => {
    if (typeof value !== 'string') {
      return [];
    }

    return value
      .split(',')
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  };

  const sanitizeInspirationFieldId = (value) => {
    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    return trimmed
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const suggestedNewInspirationFieldId = useMemo(() => {
    const directId = sanitizeInspirationFieldId(newInspirationFormField.id);
    if (directId) {
      return directId;
    }

    return sanitizeInspirationFieldId(newInspirationFormField.label);
  }, [newInspirationFormField.id, newInspirationFormField.label]);

  const isNewInspirationFieldIdDuplicate =
    suggestedNewInspirationFieldId.length > 0 && inspirationFieldIds.has(suggestedNewInspirationFieldId);

  const canAddInspirationFormField =
    suggestedNewInspirationFieldId.length > 0
    && newInspirationFormField.label.trim().length > 0
    && !isNewInspirationFieldIdDuplicate;

  const handleInspirationFilterToggle = useCallback((fieldId, enabled) => {
    if (typeof setInspirationFilters !== 'function') {
      return;
    }

    setInspirationFilters((prev) => updateInspirationFilterField(prev, fieldId, { enabled }));
  }, [setInspirationFilters]);

  const handleInspirationFilterLabelChange = useCallback((fieldId, label) => {
    if (typeof setInspirationFilters !== 'function') {
      return;
    }

    setInspirationFilters((prev) => updateInspirationFilterField(prev, fieldId, { label }));
  }, [setInspirationFilters]);

  const handleInspirationFilterOptionsChange = useCallback((fieldId, rawValue) => {
    if (typeof setInspirationFilters !== 'function') {
      return;
    }

    const options = parseOptionList(rawValue);
    setInspirationFilters((prev) => updateInspirationFilterField(prev, fieldId, { options }));
  }, [setInspirationFilters]);

  const handleResetInspirationFilters = useCallback(() => {
    if (typeof setInspirationFilters !== 'function') {
      return;
    }

    setInspirationFilters(resetInspirationFiltersConfig());
  }, [setInspirationFilters]);

  const handleInspirationFormFieldToggle = useCallback((fieldId, enabled) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields((prev) => updateInspirationFormField(prev, fieldId, { enabled }));
  }, [setInspirationFilters, setInspirationFormFields]);

  const handleInspirationFormFieldLabelChange = useCallback((fieldId, label) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields((prev) => updateInspirationFormField(prev, fieldId, { label }));
  }, [setInspirationFormFields]);

  const handleInspirationFormFieldTypeChange = useCallback((fieldId, nextType) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    const normalizedType = Object.prototype.hasOwnProperty.call(INSPIRATION_FORM_FIELD_TYPE_KEYS, nextType)
      ? nextType
      : 'text';

    setInspirationFormFields((prev) => {
      const normalized = normalizeInspirationFormConfig(prev);
      const currentField = normalized.fields.find((field) => field.id === fieldId);
      const nextOptions = normalizedType === 'select' || normalizedType === 'multi_select'
        ? (Array.isArray(currentField?.options) && currentField.options.length > 0
          ? currentField.options
          : ['Option 1', 'Option 2'])
        : undefined;

      return updateInspirationFormField(prev, fieldId, {
        type: normalizedType,
        options: nextOptions
      });
    });
  }, [setInspirationFormFields]);

  const handleInspirationFormFieldPlaceholderChange = useCallback((fieldId, placeholder) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields((prev) => updateInspirationFormField(prev, fieldId, { placeholder }));
  }, [setInspirationFormFields]);

  const handleInspirationFormFieldOptionsChange = useCallback((fieldId, rawValue) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    const options = parseOptionList(rawValue);
    setInspirationFormFields((prev) => updateInspirationFormField(prev, fieldId, { options }));
    if (typeof setInspirationFilters === 'function') {
      setInspirationFilters((prev) => {
        const normalized = normalizeInspirationFiltersConfig(prev);
        let nextConfig = normalized;

        normalized.fields.forEach((field) => {
          const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
            ? field.sourceQuestionId.trim()
            : field.id;

          if (sourceId === fieldId && field.type === 'select') {
            nextConfig = updateInspirationFilterField(nextConfig, field.id, { options });
          }
        });

        return nextConfig;
      });
    }
  }, [setInspirationFormFields]);

  const handleAddInspirationFormField = useCallback(() => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    const label = newInspirationFormField.label.trim();
    if (!label) {
      return;
    }

    const fieldId = suggestedNewInspirationFieldId;
    if (!fieldId || inspirationFieldIds.has(fieldId)) {
      return;
    }

    const normalizedType = Object.prototype.hasOwnProperty.call(INSPIRATION_FORM_FIELD_TYPE_KEYS, newInspirationFormField.type)
      ? newInspirationFormField.type
      : 'text';

    const nextField = {
      id: fieldId,
      label,
      type: normalizedType,
      enabled: Boolean(newInspirationFormField.enabled),
      required: Boolean(newInspirationFormField.required)
    };

    const placeholder = newInspirationFormField.placeholder.trim();
    if (INSPIRATION_FORM_FIELD_PLACEHOLDER_TYPES.has(normalizedType) && placeholder.length > 0) {
      nextField.placeholder = placeholder;
    }

    if (normalizedType === 'select' || normalizedType === 'multi_select') {
      const parsedOptions = parseOptionList(newInspirationFormField.options);
      nextField.options = parsedOptions.length > 0 ? parsedOptions : ['Option 1', 'Option 2'];
    }

    setInspirationFormFields((prev) => {
      const normalized = normalizeInspirationFormConfig(prev);
      return {
        ...normalized,
        fields: [...normalized.fields, nextField]
      };
    });

    setNewInspirationFormField(createEmptyInspirationFormField());
  }, [
    inspirationFieldIds,
    newInspirationFormField,
    setInspirationFormFields,
    suggestedNewInspirationFieldId
  ]);

  const handleInspirationFormFieldRequiredChange = useCallback((fieldId, required) => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields((prev) => updateInspirationFormField(prev, fieldId, { required }));
  }, [setInspirationFormFields]);

  const handleResetInspirationFormFields = useCallback(() => {
    if (typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields(resetInspirationFormConfig());
  }, [setInspirationFormFields]);

  const toggleQuestionExpansion = useCallback((questionId) => {
    if (!questionId && questionId !== 0) {
      return;
    }

    const normalizedId = typeof questionId === 'string' ? questionId : String(questionId);
    setExpandedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  }, []);

  const toggleRuleExpansion = useCallback((ruleId) => {
    if (!ruleId && ruleId !== 0) {
      return;
    }

    const normalizedId = typeof ruleId === 'string' ? ruleId : String(ruleId);
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  }, []);

  const handleRiskWeightChange = (key, rawValue) => {
    if (typeof setRiskWeights !== 'function') {
      return;
    }

    setRiskWeights(prevWeights => {
      const base = typeof prevWeights === 'object' && prevWeights !== null
        ? { ...prevWeights }
        : {};

      const parsed = Number.parseFloat(rawValue);

      if (Number.isNaN(parsed)) {
        return prevWeights;
      }

      const sanitized = parsed < 0 ? 0 : parsed;

      if (base[key] === sanitized) {
        return prevWeights;
      }

      base[key] = sanitized;
      return base;
    });
  };

  const dataIntegrityIssues = useMemo(() => {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const safeRules = ruleVisibilitySource;
    const safeTeams = Array.isArray(teams) ? teams : [];

    const questionMap = new Map();
    safeQuestions.forEach((question) => {
      if (question?.id) {
        questionMap.set(question.id, question);
      }
    });

    const conditionQuestionEntries = getConditionQuestionEntries(safeQuestions, language);
    const conditionQuestionMap = new Map();
    conditionQuestionEntries.forEach((question) => {
      if (question?.id) {
        conditionQuestionMap.set(question.id, question);
      }
    });

    const questionIds = new Set(conditionQuestionMap.keys());

    const questionOptionMap = new Map();
    questionMap.forEach((question, id) => {
      const normalizedOptions = getQuestionOptionEntries(question, { language }).map((entry) => entry.value);
      if (normalizedOptions.length > 0) {
        questionOptionMap.set(id, new Set(normalizedOptions));
      }
    });

    const teamIds = new Set(
      safeTeams
        .map((team) => (team?.id ? team.id : null))
        .filter(Boolean)
    );
    const teamNameMap = new Map();
    safeTeams.forEach(team => {
      if (team?.id) {
        teamNameMap.set(team.id, team?.name || team.id);
      }
    });

    const issues = [];
    let issueIndex = 0;

    const pushIssue = ({ scope, context, message, severity = 'warning' }) => {
      issueIndex += 1;
      issues.push({
        id: `integrity-${issueIndex}`,
        scope,
        context,
        message,
        severity
      });
    };

    const formatConditionPosition = (groupIndex, conditionIndex) => {
      return t('backOffice.main.conditionPositionTemplate', { group: groupIndex + 1, condition: conditionIndex + 1 });
    };

    const getQuestionLabel = (questionId) => {
      const reference = conditionQuestionMap.get(questionId);
      if (!reference) {
        return questionId || t('backOffice.main.unknownQuestionFallback');
      }
      return resolveLocalizedText(reference.question, language) || reference.id || questionId;
    };

    const collectInvalidOptionValues = (value, optionsSet) => {
      if (!optionsSet || optionsSet.size === 0) {
        return [];
      }

      const invalidValues = [];
      const inspectValue = (candidate) => {
        if (candidate === null || candidate === undefined) {
          return;
        }
        if (
          typeof candidate !== 'string' &&
          typeof candidate !== 'number' &&
          typeof candidate !== 'boolean'
        ) {
          return;
        }

        const normalizedCandidate = String(candidate);
        if (!optionsSet.has(normalizedCandidate)) {
          invalidValues.push(normalizedCandidate);
        }
      };

      if (Array.isArray(value)) {
        value.forEach(inspectValue);
      } else {
        inspectValue(value);
      }

      return invalidValues;
    };

    safeQuestions.forEach((question) => {
      const groups = normalizeConditionGroups(question);
      const context = t('backOffice.main.questionContextTemplate', { label: resolveLocalizedText(question.question, language) || question.id || t('backOffice.main.untitledFallback') });

      groups.forEach((group, groupIndex) => {
        const conditions = Array.isArray(group?.conditions) ? group.conditions : [];

        conditions.forEach((condition, conditionIndex) => {
          if (!condition) {
            return;
          }

          const position = formatConditionPosition(groupIndex, conditionIndex);
          const targetId = condition.question;

          if (!targetId) {
            pushIssue({
              scope: 'questions',
              context,
              message: t('backOffice.main.conditionNoTargetQuestionMessage', { position })
            });
            return;
          }

          if (!questionIds.has(targetId)) {
            pushIssue({
              scope: 'questions',
              context,
              message: t('backOffice.main.conditionTargetMissingMessage', { position, targetId })
            });
            return;
          }

          const optionsSet = questionOptionMap.get(targetId);
          if (optionsSet && optionsSet.size > 0) {
            const invalidValues = collectInvalidOptionValues(condition.value, optionsSet);

            if (invalidValues.length > 0) {
              const formattedValues = invalidValues.map((value) => `« ${value} »`).join(', ');
              const targetLabel = getQuestionLabel(targetId);

              pushIssue({
                scope: 'questions',
                context,
                message: t('backOffice.main.conditionInvalidValuesMessage', { position, values: formattedValues, target: targetLabel })
              });
            }
          }
        });
      });
    });

    safeRules.forEach((rule) => {
      const ruleLabel = resolveLocalizedText(rule?.name, language) || rule?.id || t('backOffice.main.ruleFallbackWord');
      const context = t('backOffice.main.ruleContextTemplate', { label: ruleLabel });
      const groups = normalizeConditionGroups(rule, sanitizeRuleCondition);

      groups.forEach((group, groupIndex) => {
        const conditions = Array.isArray(group?.conditions) ? group.conditions : [];

        conditions.forEach((condition, conditionIndex) => {
          if (!condition) {
            return;
          }

          const position = formatConditionPosition(groupIndex, conditionIndex);

          if (condition.type === 'timing') {
            if (!condition.startQuestion) {
              pushIssue({
                scope: 'rules',
                context,
                message: t('backOffice.main.ruleTimingNoStartMessage', { position })
              });
            } else if (!questionIds.has(condition.startQuestion)) {
              pushIssue({
                scope: 'rules',
                context,
                message: t('backOffice.main.ruleTimingStartMissingMessage', { id: condition.startQuestion, position })
              });
            }

            if (!condition.endQuestion) {
              pushIssue({
                scope: 'rules',
                context,
                message: t('backOffice.main.ruleTimingNoEndMessage', { position })
              });
            } else if (!questionIds.has(condition.endQuestion)) {
              pushIssue({
                scope: 'rules',
                context,
                message: t('backOffice.main.ruleTimingEndMissingMessage', { id: condition.endQuestion, position })
              });
            }

            return;
          }

          const targetId = condition.question;

          if (!targetId) {
            pushIssue({
              scope: 'rules',
              context,
              message: t('backOffice.main.ruleConditionNoTargetMessage', { position })
            });
            return;
          }

          if (!questionIds.has(targetId)) {
            pushIssue({
              scope: 'rules',
              context,
              message: t('backOffice.main.ruleConditionTargetMissingMessage', { position, targetId })
            });
            return;
          }

          const optionsSet = questionOptionMap.get(targetId);
          if (optionsSet && optionsSet.size > 0) {
            const invalidValues = collectInvalidOptionValues(condition.value, optionsSet);

            if (invalidValues.length > 0) {
              const formattedValues = invalidValues.map((value) => `« ${value} »`).join(', ');
              const targetLabel = getQuestionLabel(targetId);

              pushIssue({
                scope: 'rules',
                context,
                message: t('backOffice.main.ruleConditionInvalidValuesMessage', { position, values: formattedValues, target: targetLabel })
              });
            }
          }
        });
      });

      const ruleTeams = Array.isArray(rule?.teams) ? rule.teams : [];
      ruleTeams.forEach((teamId) => {
        if (!teamId) {
          return;
        }

        if (!teamIds.has(teamId)) {
          pushIssue({
            scope: 'teams',
            context,
            message: t('backOffice.main.teamNotInRepositoryMessage', { teamId })
          });
        }
      });

      if (rule?.questions && typeof rule.questions === 'object') {
        Object.entries(rule.questions).forEach(([teamId, teamQuestions]) => {
          if (!teamIds.has(teamId)) {
            pushIssue({
              scope: 'teams',
              context,
              message: t('backOffice.main.supportSectionUnknownTeamMessage', { teamId })
            });
            return;
          }

          const entries = Array.isArray(teamQuestions) ? teamQuestions : [];
          entries.forEach((questionEntry, questionIndex) => {
            const sanitizedEntry = sanitizeTeamQuestionEntry(questionEntry);
            const resolvedEntryText = resolveLocalizedText(sanitizedEntry.text, language);
            const questionLabel = resolvedEntryText || t('backOffice.main.questionNumberFallbackTemplate', { number: questionIndex + 1 });
            const questionContext = t('backOffice.main.ruleQuestionContextTemplate', { rule: ruleLabel, team: teamNameMap.get(teamId) || teamId, question: questionLabel });
            const timingConstraint = sanitizeRiskTimingConstraint(sanitizedEntry.timingConstraint);

            if (timingConstraint.enabled) {
              if (!timingConstraint.startQuestion) {
                pushIssue({
                  scope: 'rules',
                  context: questionContext,
                  message: t('backOffice.main.delayNoStartQuestionMessage')
                });
              } else if (!questionIds.has(timingConstraint.startQuestion)) {
                pushIssue({
                  scope: 'rules',
                  context: questionContext,
                  message: t('backOffice.main.delayStartMissingMessage', { id: timingConstraint.startQuestion })
                });
              } else {
                const startQuestion = questionMap.get(timingConstraint.startQuestion);
                if ((startQuestion?.type || 'choice') !== 'date') {
                  pushIssue({
                    scope: 'rules',
                    context: questionContext,
                    message: t('backOffice.main.delayStartNotDateMessage', { id: timingConstraint.startQuestion })
                  });
                }
              }

              if (!timingConstraint.endQuestion) {
                pushIssue({
                  scope: 'rules',
                  context: questionContext,
                  message: t('backOffice.main.delayNoEndQuestionMessage')
                });
              } else if (!questionIds.has(timingConstraint.endQuestion)) {
                pushIssue({
                  scope: 'rules',
                  context: questionContext,
                  message: t('backOffice.main.delayEndMissingMessage', { id: timingConstraint.endQuestion })
                });
              } else {
                const endQuestion = questionMap.get(timingConstraint.endQuestion);
                if ((endQuestion?.type || 'choice') !== 'date') {
                  pushIssue({
                    scope: 'rules',
                    context: questionContext,
                    message: t('backOffice.main.delayEndNotDateMessage', { id: timingConstraint.endQuestion })
                  });
                }
              }
            }
          });
        });
      }
    });

    return issues;
  }, [questions, ruleVisibilitySource, teams, t]);

  const dataIntegritySummary = useMemo(() => {
    if (!dataIntegrityIssues || dataIntegrityIssues.length === 0) {
      return [];
    }

    const labels = {
      questions: t('backOffice.main.questionsScopeLabel'),
      rules: t('backOffice.main.rulesScopeLabel'),
      teams: t('backOffice.main.teamsScopeLabel'),
      general: t('backOffice.main.generalScopeLabel')
    };

    const counts = dataIntegrityIssues.reduce((accumulator, issue) => {
      const key = issue.scope || 'general';
      const current = accumulator[key] || 0;
      return { ...accumulator, [key]: current + 1 };
    }, {});

    return Object.entries(counts).map(([scope, count]) => ({
      scope,
      count,
      label: labels[scope] || t('backOffice.main.otherScopeLabel')
    }));
  }, [dataIntegrityIssues, t]);

  useEffect(() => {
    if (!reorderAnnouncement || typeof window === 'undefined') {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setReorderAnnouncement('');
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [reorderAnnouncement]);

  const moveQuestion = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) {
      return;
    }

    setQuestions(prevQuestions => {
      if (
        fromIndex < 0 ||
        fromIndex >= prevQuestions.length ||
        toIndex < 0 ||
        toIndex >= prevQuestions.length
      ) {
        return prevQuestions;
      }

      const updated = [...prevQuestions];
      const [movedQuestion] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedQuestion);

      if (movedQuestion) {
        const label = resolveLocalizedText(movedQuestion.question, language) || movedQuestion.id || t('backOffice.main.questionWordFallback');
        setReorderAnnouncement(t('backOffice.main.questionMovedAnnouncementTemplate', { label, position: toIndex + 1, total: updated.length }));
      }

      return updated;
    });
  };

  const moveQuestionUp = (index) => {
    if (index <= 0) {
      return;
    }

    moveQuestion(index, index - 1);
  };

  const moveQuestionDown = (index) => {
    if (index >= questions.length - 1) {
      return;
    }

    moveQuestion(index, index + 1);
  };

  const moveInspirationFormField = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || typeof setInspirationFormFields !== 'function') {
      return;
    }

    setInspirationFormFields((prevFields) => {
      const normalized = normalizeInspirationFormConfig(prevFields);
      const fields = Array.isArray(normalized.fields) ? normalized.fields.slice() : [];

      if (
        fromIndex < 0 ||
        fromIndex >= fields.length ||
        toIndex < 0 ||
        toIndex >= fields.length
      ) {
        return prevFields;
      }

      const [movedField] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, movedField);

      if (movedField) {
        const label = movedField.label || movedField.id || t('backOffice.main.fieldWordFallback');
        setReorderAnnouncement(t('backOffice.main.fieldMovedAnnouncementTemplate', { label, position: toIndex + 1, total: fields.length }));
      }

      return { ...normalized, fields };
    });
  };

  const handleInspirationFieldDragStart = (event, index) => {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
    setDraggedInspirationFieldIndex(index);
    setDragOverInspirationFieldIndex(index);
  };

  const handleInspirationFieldDragOver = (event, index) => {
    event.preventDefault();
    if (dragOverInspirationFieldIndex !== index) {
      setDragOverInspirationFieldIndex(index);
    }
  };

  const handleInspirationFieldDrop = (event, index) => {
    event.preventDefault();

    let fromIndex = draggedInspirationFieldIndex;
    if (fromIndex === null) {
      const transferIndex = Number.parseInt(event?.dataTransfer?.getData('text/plain'), 10);
      if (Number.isFinite(transferIndex)) {
        fromIndex = transferIndex;
      }
    }

    if (fromIndex !== null) {
      moveInspirationFormField(fromIndex, index);
    }

    setDraggedInspirationFieldIndex(null);
    setDragOverInspirationFieldIndex(null);
  };

  const handleInspirationFieldDragEnd = () => {
    setDraggedInspirationFieldIndex(null);
    setDragOverInspirationFieldIndex(null);
  };

  const handleInspirationFieldKeyboardReorder = (event, index) => {
    if (inspirationFormFieldEntries.length <= 1) {
      return;
    }

    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      moveInspirationFormField(index, index - 1);
    } else if (event.key === 'ArrowDown' && index < inspirationFormFieldEntries.length - 1) {
      event.preventDefault();
      moveInspirationFormField(index, index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveInspirationFormField(index, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveInspirationFormField(index, inspirationFormFieldEntries.length - 1);
    }
  };

  const getNextId = (items, prefix) => {
    const ids = new Set(items.map((item) => item.id));
    const maxNumericSuffix = items
      .map((item) => item.id)
      .filter((id) => typeof id === 'string' && id.startsWith(prefix))
      .map((id) => Number.parseInt(id.slice(prefix.length), 10))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

    let counter = maxNumericSuffix + 1;
    let candidate = `${prefix}${counter}`;
    while (ids.has(candidate)) {
      counter += 1;
      candidate = `${prefix}${counter}`;
    }
    return candidate;
  };

  const cloneData = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => cloneData(item));
    }
    if (value && typeof value === 'object') {
      const cloned = {};
      Object.keys(value).forEach((key) => {
        cloned[key] = cloneData(value[key]);
      });
      return cloned;
    }
    return value;
  };

  const getDuplicateId = (items, baseId, fallbackPrefix) => {
    const existingIds = new Set(items.map((item) => item.id));
    const rawBase = typeof baseId === 'string' ? baseId.trim() : '';
    const sanitizedBase = rawBase !== '' ? rawBase.replace(/\s+/g, '_') : '';

    if (sanitizedBase) {
      let candidate = `${sanitizedBase}_copy`;
      let counter = 2;

      while (existingIds.has(candidate)) {
        candidate = `${sanitizedBase}_copy${counter}`;
        counter += 1;
      }

      return candidate;
    }

    return getNextId(items, fallbackPrefix);
  };

  const addRiskLevelRule = () => {
    if (typeof setRiskLevelRules !== 'function') {
      return;
    }

    const nextId = getNextId(safeRiskLevelRules, 'risk_level_');
    const lastRule = safeRiskLevelRules[safeRiskLevelRules.length - 1];
    const baseMinimum = lastRule
      ? Math.max(
        0,
        (() => {
          const lastMax = getRuleMaxScoreValue(lastRule);
          if (lastMax !== null) {
            return lastMax + 1;
          }
          const lastMin = getRuleMinScoreValue(lastRule);
          return lastMin + 1;
        })()
      )
      : 0;

    const newRule = {
      id: nextId,
      label: t('backOffice.main.newRiskLevelDefaultLabel'),
      minRisks: baseMinimum,
      maxRisks: null,
      minScore: baseMinimum,
      maxScore: null,
      description: ''
    };

    setRiskLevelRules([...safeRiskLevelRules, newRule]);
    setActiveTab('riskLevels');
    setReorderAnnouncement(t('backOffice.main.riskLevelAddedAnnouncementTemplate', { position: safeRiskLevelRules.length + 1 }));
  };

  const updateRiskLevelRuleField = (index, field, value) => {
    if (typeof setRiskLevelRules !== 'function') {
      return;
    }

    setRiskLevelRules(prevRules => {
      const baseRules = Array.isArray(prevRules) ? [...prevRules] : [];
      if (!baseRules[index]) {
        return prevRules;
      }

      const updatedRule = { ...baseRules[index] };

      if (field === 'label') {
        updatedRule.label = value;
      } else if (field === 'description') {
        updatedRule.description = value;
      } else if (field === 'minRisks' || field === 'minScore') {
        const parsed = Number.parseFloat(value);
        const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
        updatedRule.minRisks = sanitized;
        updatedRule.minScore = sanitized;
      } else if (field === 'maxRisks' || field === 'maxScore') {
        if (value === '' || value === null) {
          updatedRule.maxRisks = null;
          updatedRule.maxScore = null;
        } else {
          const parsed = Number.parseFloat(value);
          if (Number.isNaN(parsed)) {
            updatedRule.maxRisks = null;
            updatedRule.maxScore = null;
          } else {
            const sanitized = Math.max(0, parsed);
            updatedRule.maxRisks = sanitized;
            updatedRule.maxScore = sanitized;
          }
        }
      }

      baseRules[index] = updatedRule;
      return baseRules;
    });
  };

  const deleteRiskLevelRule = (id, index) => {
    if (typeof setRiskLevelRules !== 'function') {
      return;
    }

    if (safeRiskLevelRules.length <= 1) {
      setReorderAnnouncement(t('backOffice.main.atLeastOneRiskLevelMustRemain'));
      return;
    }

    const normalizedIndex = Number.isInteger(index) && index >= 0
      ? index
      : safeRiskLevelRules.findIndex((rule) => rule?.id === id);

    if (normalizedIndex < 0 || normalizedIndex >= safeRiskLevelRules.length) {
      return;
    }

    const targetRule = safeRiskLevelRules[normalizedIndex];
    const label = targetRule?.label || targetRule?.id || t('backOffice.main.levelNumberFallbackTemplate', { number: normalizedIndex + 1 });

    if (!confirmDeletion(t('backOffice.main.confirmDeleteLevelTemplate', { label }))) {
      return;
    }

    pushUndoEntry({
      type: 'riskLevelRule',
      index: normalizedIndex,
      item: cloneData(targetRule),
      message: t('backOffice.main.levelDeletedUndoTemplate', { label }),
    });

    setRiskLevelRules(prevRules => {
      const baseRules = Array.isArray(prevRules) ? [...prevRules] : [];
      if (normalizedIndex < 0 || normalizedIndex >= baseRules.length) {
        return baseRules;
      }
      baseRules.splice(normalizedIndex, 1);
      return baseRules;
    });

    setReorderAnnouncement(t('backOffice.main.riskLevelDeletedAnnouncementTemplate', { count: Math.max(safeRiskLevelRules.length - 1, 0) }));
  };

  const moveRiskLevelRule = (fromIndex, toIndex) => {
    if (typeof setRiskLevelRules !== 'function') {
      return;
    }

    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= safeRiskLevelRules.length ||
      toIndex >= safeRiskLevelRules.length
    ) {
      return;
    }

    const movedRule = safeRiskLevelRules[fromIndex];

    setRiskLevelRules(prevRules => {
      const baseRules = Array.isArray(prevRules) ? [...prevRules] : [];
      if (
        fromIndex < 0 ||
        fromIndex >= baseRules.length ||
        toIndex < 0 ||
        toIndex >= baseRules.length
      ) {
        return prevRules;
      }

      const next = [...baseRules];
      const [extracted] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, extracted);
      return next;
    });

    if (movedRule) {
      const label = movedRule.label || movedRule.id || t('backOffice.main.riskLevelFallbackLabel');
      setReorderAnnouncement(t('backOffice.main.riskLevelPositionAnnouncement', { label, position: toIndex + 1, total: safeRiskLevelRules.length }));
    }
  };

  const formatRiskRangeLabel = (rule) => {
    const minScore = getRuleMinScoreValue(rule);
    const maxScore = getRuleMaxScoreValue(rule);

    const minLabel = formatScoreValue(minScore, language);
    const minUnit = getPointUnit(minScore, t);

    if (maxScore === null) {
      return `≥ ${minLabel} ${minUnit}`;
    }

    if (minScore === maxScore) {
      return `${minLabel} ${getPointUnit(minScore, t)}`;
    }

    const maxLabel = formatScoreValue(maxScore, language);
    return t('backOffice.main.scoreRangeTemplate', { min: minLabel, max: maxLabel, unit: t('backOffice.main.pointPlural') });
  };

  const getRiskLevelRuleIssues = (rule, index, rulesList) => {
    const issues = [];
    const min = getRuleMinScoreValue(rule);
    const max = getRuleMaxScoreValue(rule);

    if (max !== null && max < min) {
      issues.push(t('backOffice.main.maxScoreMustBeGreaterOrEqual'));
    }

    if (index > 0) {
      const previous = rulesList[index - 1];
      const previousMax = getRuleMaxScoreValue(previous);

      if (previousMax === null) {
        issues.push(t('backOffice.main.previousLevelCoversAllScores'));
      } else if (min <= previousMax) {
        issues.push(t('backOffice.main.minScoreMustExceedPreviousMax', { value: formatScoreValue(previousMax, language) }));
      }
    }

    return issues;
  };

  const downloadDataModule = (filename, exportName, data) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const serialized = JSON.stringify(data, null, 2);
    const moduleContent = `export const ${exportName} = ${serialized};\n`;
    const blob = new Blob([moduleContent], { type: 'application/javascript;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDataFiles = () => {
    downloadDataModule('questions.js', 'initialQuestions', questions);
    downloadDataModule('rules.js', 'initialRules', rules);
    downloadDataModule('riskLevelRules.js', 'initialRiskLevelRules', safeRiskLevelRules);
    downloadDataModule('teams.js', 'initialTeams', teams);
    downloadDataModule(
      'inspirationFilters.js',
      'initialInspirationFilters',
      normalizeInspirationFiltersConfig(inspirationFilters)
    );
    downloadDataModule(
      'inspirationFormFields.js',
      'initialInspirationFormFields',
      normalizeInspirationFormConfig(inspirationFormFields)
    );
    downloadDataModule('showcaseThemes.js', 'initialShowcaseThemes', safeShowcaseThemes);
    downloadDataModule(
      'onboardingTour.js',
      'initialOnboardingTourConfig',
      normalizeOnboardingConfig(onboardingTourConfig)
    );
    downloadDataModule(
      'validationCommitteeConfig.js',
      'initialValidationCommitteeConfig',
      normalizeValidationCommitteeConfig(validationCommitteeConfig)
    );
    downloadDataModule('adminEmails.js', 'initialAdminEmails', normalizedAdminEmails);
  };

  const inspirationFilterCount = inspirationFilterFields.length;
  const inspirationFormCount = inspirationFormFieldEntries.length;
  const adminEmailCount = normalizedAdminEmails.length;
  const validationCommitteeRuleOptions = useMemo(
    () =>
      (Array.isArray(rules) ? rules : [])
        .filter((rule) => rule && rule.id)
        .map((rule) => ({
          value: rule.id,
          label: rule.name || t('backOffice.main.ruleFallbackNoName')
        })),
    [rules, t]
  );

  const updateComplianceReviewAnswer = useCallback((questionId, valueOrUpdater) => {
    if (!questionId) {
      return;
    }

    setComplianceReviewAnswers((prev) => {
      const nextValue = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(prev[questionId], prev)
        : valueOrUpdater;

      return {
        ...prev,
        [questionId]: nextValue
      };
    });
    setComplianceReviewActiveQuestionId(questionId);
  }, []);

  const handleComplianceReviewPreviousQuestion = useCallback(() => {
    if (complianceReviewActiveQuestionIndex <= 0) {
      return;
    }

    const previousQuestion = complianceReviewQuestionnaire[complianceReviewActiveQuestionIndex - 1];
    if (!previousQuestion?.id) {
      return;
    }

    setComplianceReviewActiveQuestionId(previousQuestion.id);
  }, [complianceReviewActiveQuestionIndex, complianceReviewQuestionnaire]);

  const handleComplianceReviewNextQuestion = useCallback(() => {
    if (complianceReviewActiveQuestionIndex < 0) {
      return;
    }

    const nextQuestion = complianceReviewQuestionnaire[complianceReviewActiveQuestionIndex + 1];
    if (!nextQuestion?.id) {
      return;
    }

    setComplianceReviewActiveQuestionId(nextQuestion.id);
  }, [complianceReviewActiveQuestionIndex, complianceReviewQuestionnaire]);

  const handleComplianceReviewResetQuestionnaire = useCallback(() => {
    setComplianceReviewAnswers({});
    setComplianceReviewActiveQuestionId('');
  }, []);

  useEffect(() => {
    setIsComplianceReviewGuidanceOpen(false);
  }, [complianceReviewEffectiveActiveQuestionId]);

  const rawComplianceReviewGuidance = complianceReviewCurrentQuestion?.guidance || {};
  const complianceReviewGuidanceObjective = resolveLocalizedText(rawComplianceReviewGuidance.objective, language).trim();
  const complianceReviewGuidanceDetails = resolveLocalizedText(rawComplianceReviewGuidance.details, language).trim();
  const complianceReviewGuidanceTips = Array.isArray(rawComplianceReviewGuidance.tips)
    ? rawComplianceReviewGuidance.tips.map((tip) => resolveLocalizedText(tip, language).trim()).filter((tip) => tip !== '')
    : [];
  const complianceReviewGuidance = {
    objective: complianceReviewGuidanceObjective,
    details: complianceReviewGuidanceDetails,
    tips: complianceReviewGuidanceTips
  };
  const complianceReviewGuidanceHasContent =
    complianceReviewGuidanceObjective !== '' ||
    complianceReviewGuidanceDetails !== '' ||
    complianceReviewGuidanceTips.length > 0;

  const visibleTeams = useMemo(() => {
    if (!allowedTabIds || !allowedTabIds.has('teams')) {
      return teams;
    }
    return teams.filter((team) => currentUserTeamIds.includes(team?.id));
  }, [allowedTabIds, currentUserTeamIds, teams]);

  const visibleCommittees = useMemo(() => {
    if (!allowedTabIds || !allowedTabIds.has('validationCommittee')) {
      return normalizedValidationCommitteeConfig.committees;
    }
    return normalizedValidationCommitteeConfig.committees.filter((committee) => currentUserCommitteeIds.includes(committee?.id));
  }, [allowedTabIds, currentUserCommitteeIds, normalizedValidationCommitteeConfig]);

  const tabDefinitions = [
    {
      id: 'dashboard',
      label: t('backOffice.main.tabDashboard'),
      panelId: 'backoffice-tabpanel-dashboard'
    },
    {
      id: 'filters',
      label: t('backOffice.main.tabFiltersTemplate', { count: filterFields.length }),
      panelId: 'backoffice-tabpanel-filters'
    },
    {
      id: 'inspiration',
      label: t('backOffice.main.tabInspirationTemplate', { count: inspirationFilterCount + inspirationFormCount }),
      panelId: 'backoffice-tabpanel-inspiration'
    },
    {
      id: 'themes',
      label: t('backOffice.main.tabThemesTemplate', { count: showcaseThemeCount }),
      panelId: 'backoffice-tabpanel-themes'
    },
    {
      id: 'onboarding',
      label: t('backOffice.main.tabOnboardingTemplate', { count: onboardingStepCount }),
      panelId: 'backoffice-tabpanel-onboarding'
    },
    {
      id: 'questions',
      label: t('backOffice.main.tabQuestionsTemplate', { count: questions.length }),
      panelId: 'backoffice-tabpanel-questions'
    },
    {
      id: 'rules',
      label: t('backOffice.main.tabRulesTemplate', { count: ruleVisibilitySource.length }),
      panelId: 'backoffice-tabpanel-rules'
    },
    {
      id: 'validationCommittee',
      label: t('backOffice.main.tabValidationCommittee'),
      panelId: 'backoffice-tabpanel-validationCommittee'
    },
    {
      id: 'administrators',
      label: t('backOffice.main.tabAdministratorsTemplate', { count: adminEmailCount }),
      panelId: 'backoffice-tabpanel-administrators'
    },
    {
      id: 'riskLevels',
      label: t('backOffice.main.tabRiskLevelsTemplate', { count: riskLevelRuleCount }),
      panelId: 'backoffice-tabpanel-risk-levels'
    },
    {
      id: 'teams',
      label: t('backOffice.main.tabTeamsTemplate', { count: visibleTeams.length }),
      panelId: 'backoffice-tabpanel-teams'
    },
    {
      id: 'complianceReview',
      label: t('backOffice.main.tabComplianceReview'),
      panelId: 'backoffice-tabpanel-complianceReview'
    }
  ].filter((tab) => !allowedTabIds || allowedTabIds.has(tab.id));

  useEffect(() => {
    if (tabDefinitions.some((tab) => tab.id === activeTab)) {
      return;
    }

    const fallbackTab = tabDefinitions[0]?.id || 'dashboard';
    if (fallbackTab !== activeTab) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, tabDefinitions]);

  const createDefaultQuestion = (existingQuestions) => ({
    id: getNextId(existingQuestions, 'q'),
    type: 'choice',
    question: 'Nouvelle question',
    options: [
      { label: 'Option 1', value: 'option_1', visibility: 'always' },
      { label: 'Option 2', value: 'option_2', visibility: 'always' }
    ],
    required: true,
    conditions: [],
    conditionLogic: 'all',
    conditionGroups: [],
    placeholder: '',
    numberUnit: '',
    guidance: {
      objective: '',
      details: '',
      tips: []
    }
  });

  const addQuestion = () => {
    const newQuestion = createDefaultQuestion(questions);

    setQuestions([...questions, newQuestion]);
    setEditingQuestion(newQuestion);
    if (newQuestion?.id) {
      setExpandedQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(newQuestion.id);
        return next;
      });
    }
  };

  const addQuestionAtIndex = (targetIndex) => {
    const newQuestion = createDefaultQuestion(questions);
    const next = questions.slice();
    next.splice(targetIndex, 0, newQuestion);

    setQuestions(next);
    setEditingQuestion(newQuestion);
    setReorderAnnouncement(t('backOffice.main.questionAddedAnnouncementTemplate', { position: targetIndex + 1, total: next.length }));
    if (newQuestion?.id) {
      setExpandedQuestionIds((prev) => {
        const updated = new Set(prev);
        updated.add(newQuestion.id);
        return updated;
      });
    }
  };

  const deleteQuestion = (id) => {
    if (PROTECTED_QUESTION_IDS.has(id)) {
      return;
    }

    const targetIndex = questions.findIndex((question) => question.id === id);
    if (targetIndex < 0) {
      return;
    }

    const target = questions[targetIndex];
    if (target && target.showcase) {
      return;
    }

    const label = resolveLocalizedText(target?.question, language) || target?.id || t('backOffice.main.defaultQuestionThisFallback');

    if (!confirmDeletion(t('backOffice.main.confirmDeleteQuestionFullTemplate', { label }))) {
      return;
    }

    pushUndoEntry({
      type: 'question',
      index: targetIndex,
      item: cloneData(target),
      message: t('backOffice.main.questionDeletedUndoTemplate', { label }),
    });

    setQuestions((prevQuestions) => prevQuestions.filter((question) => question.id !== id));
  };

  const duplicateQuestion = (id) => {
    const originalIndex = questions.findIndex((question) => question.id === id);
    if (originalIndex < 0) {
      return;
    }

    const originalQuestion = questions[originalIndex];
    const duplicateId = getDuplicateId(questions, originalQuestion?.id, 'q');
    const copiedQuestion = cloneData(originalQuestion || {});

    copiedQuestion.id = duplicateId;
    copiedQuestion.question = typeof originalQuestion?.question === 'string' && originalQuestion.question.trim() !== ''
      ? t('backOffice.main.duplicateSuffixTemplate', { text: originalQuestion.question })
      : t('backOffice.main.copyOfTemplate', { id: duplicateId });

    const updatedQuestions = questions.slice();
    updatedQuestions.splice(originalIndex + 1, 0, copiedQuestion);

    setQuestions(updatedQuestions);
    setEditingQuestion(copiedQuestion);
    if (copiedQuestion?.id) {
      setExpandedQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(copiedQuestion.id);
        return next;
      });
    }

    const sourceLabel = originalQuestion?.id || t('backOffice.main.originQuestionFallback');
    setReorderAnnouncement(t('backOffice.main.questionDuplicatedAnnouncementTemplate', { duplicateId, sourceLabel, position: originalIndex + 2, total: updatedQuestions.length }));
  };

  const saveQuestion = (updatedQuestion) => {
    const index = questions.findIndex((question) => question.id === updatedQuestion.id);

    if (index >= 0) {
      const next = questions.slice();
      next[index] = updatedQuestion;
      setQuestions(next);
    } else {
      setQuestions([...questions, updatedQuestion]);
    }
    setEditingQuestion(null);
  };

  const addRule = () => {
    const newRule = {
      id: getNextId(rules, 'rule'),
      name: t('backOffice.main.newRuleNameDefault'),
      notifyTeam: true,
      conditions: [],
      conditionGroups: [],
      conditionLogic: 'all',
      teams: [],
      teamRoutingRules: [],
      questions: {},
      risks: []
    };

    setRules([...rules, newRule]);
    setEditingRule(newRule);
    if (newRule?.id) {
      setExpandedRuleIds((prev) => {
        const next = new Set(prev);
        next.add(newRule.id);
        return next;
      });
    }
  };

  const deleteRule = (id) => {
    const targetIndex = rules.findIndex((rule) => rule.id === id);
    if (targetIndex < 0) {
      return;
    }

    const target = rules[targetIndex];
    const label = target?.name || target?.id || t('backOffice.main.defaultRuleThisFallback');

    if (!confirmDeletion(t('backOffice.main.confirmDeleteRuleFullTemplate', { label }))) {
      return;
    }

    pushUndoEntry({
      type: 'rule',
      index: targetIndex,
      item: cloneData(target),
      message: t('backOffice.main.ruleDeletedUndoTemplate', { label }),
    });

    setRules((prevRules) => prevRules.filter((ruleItem) => ruleItem.id !== id));
    if (editingRule && editingRule.id === id) {
      setEditingRule(null);
    }
  };

  const duplicateRule = (id) => {
    const originalIndex = rules.findIndex((rule) => rule.id === id);
    if (originalIndex < 0) {
      return;
    }

    const originalRule = rules[originalIndex];
    const duplicateId = getDuplicateId(rules, originalRule?.id, 'rule');
    const copiedRule = cloneData(originalRule || {});

    copiedRule.id = duplicateId;
    copiedRule.name = typeof originalRule?.name === 'string' && originalRule.name.trim() !== ''
      ? `${originalRule.name} (copie)`
      : `Copie de ${duplicateId}`;
    delete copiedRule.priority;

    const updatedRules = rules.slice();
    updatedRules.splice(originalIndex + 1, 0, copiedRule);

    setRules(updatedRules);
    setEditingRule(copiedRule);
    if (copiedRule?.id) {
      setExpandedRuleIds((prev) => {
        const next = new Set(prev);
        next.add(copiedRule.id);
        return next;
      });
    }
  };

  const saveRule = (updatedRule) => {
    const index = rules.findIndex((rule) => rule.id === updatedRule.id);

    if (index >= 0) {
      const next = rules.slice();
      next[index] = updatedRule;
      setRules(next);
    } else {
      setRules([...rules, updatedRule]);
    }
    setEditingRule(null);
  };

  const addTeam = () => {
    const newTeam = {
      id: getNextId(teams, 'team'),
      name: t('backOffice.main.newTeamNameDefault'),
      contacts: ['email@company.com'],
      expertise: t('backOffice.main.expertiseAreaLabel')
    };

    setTeams([...teams, newTeam]);
  };

  const updateTeamField = (index, field, value) => {
    const next = teams.slice();
    if (!next[index]) {
      return;
    }
    next[index] = { ...next[index], [field]: value };
    setTeams(next);
  };

  const handleTeamContactsChange = (index, teamId, value) => {
    setTeamContactDrafts((prev) => ({
      ...prev,
      [teamId]: value
    }));
    updateTeamField(index, 'contacts', parseTeamContacts(value));
  };

  const handleTeamContactsBlur = (teamId) => {
    setTeamContactDrafts((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, teamId)) {
        return prev;
      }
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  };

  const deleteTeam = (id) => {
    const targetIndex = teams.findIndex((team) => team.id === id);
    if (targetIndex < 0) {
      return;
    }

    const target = teams[targetIndex];
    const label = target?.name || target?.id || t('backOffice.main.defaultTeamThisFallback');

    if (!confirmDeletion(t('backOffice.main.confirmDeleteTeamTemplate', { label }))) {
      return;
    }

    pushUndoEntry({
      type: 'team',
      index: targetIndex,
      item: cloneData(target),
      message: t('backOffice.main.teamDeletedUndoTemplate', { label }),
    });

    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== id));
    setTeamContactDrafts((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8" role="region" aria-label={t('backOffice.main.backOfficeTitle')}>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-xl">
                <Settings className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">{t('backOffice.main.backOfficeTitle')}</h1>
                <p className="text-sm text-gray-500">{t('backOffice.main.backOfficeSubtitle')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title={t('backOffice.main.undoLastDeletionTitle')}
                className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 text-sm sm:text-base"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                {t('backOffice.main.undoCtrlZButton')}
              </button>
              <button
                type="button"
                onClick={handleDownloadDataFiles}
                className="inline-flex items-center justify-center px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg shadow-sm hover:bg-blue-50 text-sm sm:text-base"
              >
                <Download className="w-5 h-5 mr-2" />
                {t('backOffice.main.downloadDataFilesButton')}
              </button>
            </div>
          </header>

          {undoMessage ? (
            <div
              className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-800"
              role="status"
              aria-live="polite"
            >
              {undoMessage}
            </div>
          ) : null}

          <section
            className="mb-6"
            aria-label={t('backOffice.main.inconsistencyDetectionAriaLabel')}
            aria-live="polite"
          >
            {dataIntegrityIssues.length > 0 ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-yellow-900">
                        {t(dataIntegrityIssues.length > 1 ? 'backOffice.main.inconsistencyDetectedPlural' : 'backOffice.main.inconsistencyDetectedSingular', { count: dataIntegrityIssues.length })}
                      </p>
                      {dataIntegritySummary.map((entry) => (
                        <span
                          key={entry.scope}
                          className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
                        >
                          {entry.label} · {entry.count}
                        </span>
                      ))}
                    </div>
                    <ul className="space-y-2 text-sm text-yellow-900">
                      {dataIntegrityIssues.map((issue) => (
                        <li
                          key={issue.id}
                          className="rounded-lg border border-yellow-200 bg-white/60 p-3"
                        >
                          <p className="font-medium">{issue.context}</p>
                          <p className="mt-1 leading-snug">{issue.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle className="w-6 h-6 text-emerald-600 mt-1" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {t('backOffice.main.noInconsistencyDetected')}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {t('backOffice.main.conditionsAndTeamsAligned')}
                  </p>
                </div>
              </div>
            )}
          </section>

          <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-6" role="tablist" aria-label={t('backOffice.main.backOfficeNavAriaLabel')}>
            {tabDefinitions.map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`backoffice-tab-${tab.id}`}
                role="tab"
                aria-controls={tab.panelId}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-md text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'dashboard' && (
            <section
              id="backoffice-tabpanel-dashboard"
              role="tabpanel"
              aria-labelledby="backoffice-tab-dashboard"
              className="space-y-6"
            >
              <BackOfficeDashboard projects={projects} teams={teams} />
            </section>
          )}

          {activeTab === 'filters' && (
            <section
              id="backoffice-tabpanel-filters"
              role="tabpanel"
              aria-labelledby="backoffice-tab-filters"
              className="space-y-6"
            >
              <article className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.projectFiltersTitle')}</h2>
                    <p className="text-sm text-gray-600">
                      {t('backOffice.main.projectFiltersSubtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetProjectFilters}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      projectFiltersAreDefault
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={projectFiltersAreDefault}
                  >
                    {t('backOffice.main.resetFiltersButton')}
                  </button>
                </header>

                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-4 md:flex md:items-end md:justify-between md:gap-4">
                    <div className="flex-1 space-y-2">
                      <label htmlFor="new-filter-question" className="text-sm font-medium text-blue-900">
                        {t('backOffice.main.addFilterFromQuestionLabel')}
                      </label>
                      <select
                        id="new-filter-question"
                        value={selectedFilterQuestionId}
                        onChange={(event) => setSelectedFilterQuestionId(event.target.value)}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">{t('backOffice.main.selectQuestionPlaceholder')}</option>
                        {availableFilterQuestionOptions.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}{option.disabled ? t('backOffice.main.alreadyUsedSuffix') : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-700">
                        {t('backOffice.main.filterableFieldsHint')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProjectFilter}
                      disabled={!canAddProjectFilter}
                      className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:mt-0 ${
                        canAddProjectFilter
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> {t('backOffice.main.addFilterButton')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {filterFields.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
                        {t('backOffice.main.noFilterConfiguredYet')}
                      </div>
                    ) : (
                      filterFields.map((field) => {
                        const typeLabel = getProjectFilterTypeLabel(t, field.type) || t('backOffice.main.parameterFallbackLabel');
                        const description = getProjectFilterFieldDescription(t, field.id) || '';
                        const labelInputId = `project-filter-label-${field.id}`;
                        const sortDefault = field.type === 'sort' && field.defaultValue === 'asc' ? 'asc' : 'desc';
                        const sourceQuestionId = field.sourceQuestionId || field.id;
                        const sourceQuestion = Array.isArray(questions)
                          ? questions.find((question) => question && question.id === sourceQuestionId)
                          : null;
                        const sourceLabel = resolveLocalizedText(sourceQuestion?.question, language);
                        const canRemoveFilter = field.id !== 'dateOrder';

                        return (
                          <article
                            key={field.id}
                            className="border border-gray-200 rounded-xl bg-white p-5 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                    {typeLabel}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-1 ${
                                      field.enabled
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {field.enabled ? t('backOffice.main.enabledLabel') : t('backOffice.main.disabledLabel')}
                                  </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">{field.label}</h3>
                                {description && <p className="text-sm text-gray-600">{description}</p>}
                                {sourceQuestionId && (
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.sourceLabelTemplate', { value: sourceQuestionId })}
                                    {sourceLabel ? ` – ${sourceLabel}` : ''}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={field.enabled}
                                    onChange={(event) => handleProjectFilterToggle(field.id, event.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{t('backOffice.main.activateLabel')}</span>
                                </label>
                                {canRemoveFilter && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProjectFilter(field)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-4 h-4" /> {t('backOffice.main.removeButton')}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="flex flex-col gap-2">
                                <label htmlFor={labelInputId} className="text-sm font-medium text-gray-700">
                                  {t('backOffice.main.displayedLabelLabel')}
                                </label>
                                <input
                                  id={labelInputId}
                                  type="text"
                                  value={field.label}
                                  onChange={(event) => handleProjectFilterLabelChange(field.id, event.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <p className="text-xs text-gray-500">
                                  {t('backOffice.main.filterLabelHint')}
                                </p>
                              </div>

                              {field.type === 'sort' ? (
                                <fieldset className="flex flex-col gap-2">
                                  <legend className="text-sm font-medium text-gray-700">{t('backOffice.main.defaultOrderLegend')}</legend>
                                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="radio"
                                      name={`project-filter-sort-order-${field.id}`}
                                      value="desc"
                                      checked={sortDefault === 'desc'}
                                      onChange={() => handleProjectFilterDefaultSortChange('desc')}
                                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('backOffice.main.mostRecentFirst')}</span>
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="radio"
                                      name={`project-filter-sort-order-${field.id}`}
                                      value="asc"
                                      checked={sortDefault === 'asc'}
                                      onChange={() => handleProjectFilterDefaultSortChange('asc')}
                                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('backOffice.main.oldestFirst')}</span>
                                  </label>
                                </fieldset>
                              ) : field.type === 'select' ? (
                                <div className="flex flex-col gap-2">
                                  <label
                                    htmlFor={`project-filter-empty-option-${field.id}`}
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    {t('backOffice.main.allOptionLabelLabel')}
                                  </label>
                                  <input
                                    id={`project-filter-empty-option-${field.id}`}
                                    type="text"
                                    value={field.emptyOptionLabel || t('backOffice.main.allValuesDefault')}
                                    onChange={(event) =>
                                      setProjectFilters((prev) =>
                                        updateProjectFilterField(prev, field.id, {
                                          emptyOptionLabel: event.target.value
                                        })
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  />
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.allValuesHint')}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 text-sm text-gray-600">
                                  <span className="font-medium text-gray-700">{t('backOffice.main.behaviorLabel')}</span>
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.fullTextSearchHint')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </article>
            </section>
          )}

          {activeTab === 'inspiration' && (
            <section
              id="backoffice-tabpanel-inspiration"
              role="tabpanel"
              aria-labelledby="backoffice-tab-inspiration"
              className="space-y-6"
            >
              <div className="sr-only" aria-live="polite">{reorderAnnouncement}</div>
              <article className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.inspirationFiltersTitle')}</h2>
                    <p className="text-sm text-gray-600">
                      {t('backOffice.main.inspirationFiltersSubtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetInspirationFilters}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      inspirationFiltersAreDefault
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={inspirationFiltersAreDefault}
                  >
                    {t('backOffice.main.resetButton')}
                  </button>
                </header>

                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-4 md:flex md:items-end md:justify-between md:gap-4">
                    <div className="flex-1 space-y-2">
                      <label htmlFor="new-inspiration-filter-question" className="text-sm font-medium text-blue-900">
                        {t('backOffice.main.addInspirationFilterFromFieldLabel')}
                      </label>
                      <select
                        id="new-inspiration-filter-question"
                        value={selectedInspirationFilterQuestionId}
                        onChange={(event) => setSelectedInspirationFilterQuestionId(event.target.value)}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">{t('backOffice.main.selectFieldPlaceholder')}</option>
                        {availableInspirationFilterQuestionOptions.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}{option.disabled ? t('backOffice.main.alreadyUsedSuffix') : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-700">
                        {t('backOffice.main.inspirationFilterableFieldsHint')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddInspirationFilter}
                      disabled={!canAddInspirationFilter}
                      className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:mt-0 ${
                        canAddInspirationFilter
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> {t('backOffice.main.addFilterButton')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {inspirationFilterFields.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
                        {t('backOffice.main.noFilterConfiguredYet')}
                      </div>
                    ) : (
                      inspirationFilterFields.map((field) => {
                        const typeLabel = getInspirationFilterTypeLabel(t, field.type) || t('backOffice.main.parameterFallbackLabel');
                        const labelInputId = `inspiration-filter-label-${field.id}`;
                        const sourceQuestionId = field.sourceQuestionId || field.id;
                        const sourceQuestion = inspirationFormFieldEntries.find(
                          (item) => item && item.id === sourceQuestionId
                        );
                        const sourceLabel = sourceQuestion?.label;

                        return (
                          <article key={field.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                    {typeLabel}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-1 ${
                                      field.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {field.enabled ? t('backOffice.main.enabledLabel') : t('backOffice.main.disabledLabel')}
                                  </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">{field.label}</h3>
                                {sourceQuestionId && (
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.sourceLabelTemplate', { value: sourceQuestionId })}
                                    {sourceLabel ? ` – ${sourceLabel}` : ''}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={field.enabled}
                                    onChange={(event) => handleInspirationFilterToggle(field.id, event.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{t('backOffice.main.activateLabel')}</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInspirationFilter(field)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 className="w-4 h-4" /> {t('backOffice.main.removeButton')}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="flex flex-col gap-2">
                                <label htmlFor={labelInputId} className="text-sm font-medium text-gray-700">
                                  {t('backOffice.main.displayedLabelLabel')}
                                </label>
                                <input
                                  id={labelInputId}
                                  type="text"
                                  value={field.label}
                                  onChange={(event) => handleInspirationFilterLabelChange(field.id, event.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <p className="text-xs text-gray-500">
                                  {t('backOffice.main.inspirationFilterLabelHint')}
                                </p>
                              </div>

                              {field.type === 'select' ? (
                                <div className="flex flex-col gap-2">
                                  <label
                                    htmlFor={`inspiration-filter-empty-option-${field.id}`}
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    {t('backOffice.main.allOptionLabelLabel')}
                                  </label>
                                  <input
                                    id={`inspiration-filter-empty-option-${field.id}`}
                                    type="text"
                                    value={field.emptyOptionLabel || t('backOffice.main.allValuesDefault')}
                                    onChange={(event) =>
                                      setInspirationFilters((prev) =>
                                        updateInspirationFilterField(prev, field.id, {
                                          emptyOptionLabel: event.target.value
                                        })
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  />
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.allValuesHint')}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 text-sm text-gray-600">
                                  <span className="font-medium text-gray-700">{t('backOffice.main.behaviorLabel')}</span>
                                  <p className="text-xs text-gray-500">
                                    {t('backOffice.main.inspirationFullTextSearchHint')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </article>

              <article className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.formFieldsTitle')}</h2>
                    <p className="text-sm text-gray-600">
                      {t('backOffice.main.formFieldsSubtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetInspirationFormFields}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      inspirationFormAreDefault
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={inspirationFormAreDefault}
                  >
                    {t('backOffice.main.resetButton')}
                  </button>
                </header>

                <div className="space-y-4">
                  <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor="new-inspiration-field-label"
                              className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                            >
                              {t('backOffice.main.fieldLabelLabel')}
                            </label>
                            <input
                              id="new-inspiration-field-label"
                              type="text"
                              value={newInspirationFormField.label}
                              onChange={(event) =>
                                setNewInspirationFormField((prev) => ({
                                  ...prev,
                                  label: event.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder={t('backOffice.main.fieldLabelPlaceholderExample')}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="new-inspiration-field-id"
                              className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                            >
                              {t('backOffice.main.technicalIdLabel')}
                            </label>
                            <input
                              id="new-inspiration-field-id"
                              type="text"
                              value={newInspirationFormField.id}
                              onChange={(event) =>
                                setNewInspirationFormField((prev) => ({
                                  ...prev,
                                  id: event.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder={t('backOffice.main.fieldIdPlaceholderExample')}
                            />
                            <p className="mt-1 text-xs text-blue-700">
                              {isNewInspirationFieldIdDuplicate
                                ? t('backOffice.main.duplicateIdError')
                                : suggestedNewInspirationFieldId
                                  ? t('backOffice.main.idUsedTemplate', { id: suggestedNewInspirationFieldId })
                                  : t('backOffice.main.leaveEmptyToGenerateId')}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <label
                              htmlFor="new-inspiration-field-type"
                              className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                            >
                              {t('backOffice.main.fieldTypeLabel')}
                            </label>
                            <select
                              id="new-inspiration-field-type"
                              value={newInspirationFormField.type}
                              onChange={(event) =>
                                setNewInspirationFormField((prev) => ({
                                  ...prev,
                                  type: event.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              {buildInspirationFormFieldTypeOptions(t).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {newInspirationFormField.type === 'select' || newInspirationFormField.type === 'multi_select' ? (
                            <div className="md:col-span-2 space-y-3">
                              <div>
                                <label
                                  htmlFor="new-inspiration-field-options"
                                  className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                                >
                                  {t('backOffice.main.optionsCommaSeparatedLabel')}
                                </label>
                                <input
                                  id="new-inspiration-field-options"
                                  type="text"
                                  value={newInspirationFormField.options}
                                  onChange={(event) =>
                                    setNewInspirationFormField((prev) => ({
                                      ...prev,
                                      options: event.target.value
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  placeholder={t('backOffice.main.optionsPlaceholderExample')}
                                />
                              </div>
                              {newInspirationFormField.type === 'select' && (
                                <div>
                                  <label
                                    htmlFor="new-inspiration-field-select-placeholder"
                                    className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                                  >
                                    {t('backOffice.main.defaultSelectLabelLabel')}
                                  </label>
                                  <input
                                    id="new-inspiration-field-select-placeholder"
                                    type="text"
                                    value={newInspirationFormField.placeholder}
                                    onChange={(event) =>
                                      setNewInspirationFormField((prev) => ({
                                        ...prev,
                                        placeholder: event.target.value
                                      }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder={t('backOffice.main.defaultSelectPlaceholderExample')}
                                  />
                                </div>
                              )}
                            </div>
                          ) : INSPIRATION_FORM_FIELD_PLACEHOLDER_TYPES.has(newInspirationFormField.type) ? (
                            <div className="md:col-span-2">
                              <label
                                htmlFor="new-inspiration-field-placeholder"
                                className="text-xs font-semibold uppercase tracking-wide text-blue-800"
                              >
                                {t('backOffice.main.placeholderFieldLabel')}
                              </label>
                              <input
                                id="new-inspiration-field-placeholder"
                                type="text"
                                value={newInspirationFormField.placeholder}
                                onChange={(event) =>
                                  setNewInspirationFormField((prev) => ({
                                    ...prev,
                                    placeholder: event.target.value
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder={t('backOffice.main.placeholderDisplayedText')}
                              />
                            </div>
                          ) : (
                            <div className="md:col-span-2 flex items-center text-xs text-blue-700">
                              {t('backOffice.main.noPlaceholderNeeded')}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-blue-900">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newInspirationFormField.required}
                              onChange={(event) =>
                                setNewInspirationFormField((prev) => ({
                                  ...prev,
                                  required: event.target.checked
                                }))
                              }
                              className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            {t('backOffice.main.requiredFieldLabel')}
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newInspirationFormField.enabled}
                              onChange={(event) =>
                                setNewInspirationFormField((prev) => ({
                                  ...prev,
                                  enabled: event.target.checked
                                }))
                              }
                              className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            {t('backOffice.main.activeFieldLabel')}
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddInspirationFormField}
                        disabled={!canAddInspirationFormField}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          canAddInspirationFormField
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {t('backOffice.main.addFieldButton')}
                      </button>
                    </div>
                  </div>

                  {inspirationFormFieldEntries.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
                      {t('backOffice.main.noFieldConfigured')}
                    </div>
                  ) : (
                    inspirationFormFieldEntries.map((field, index) => {
                      const positionId = `inspiration-form-position-${field.id}`;

                      return (
                        <article
                          key={field.id}
                          className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${
                            dragOverInspirationFieldIndex === index ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                          } ${
                            draggedInspirationFieldIndex === index ? 'opacity-75' : ''
                          }`}
                          onDragOver={(event) => handleInspirationFieldDragOver(event, index)}
                          onDrop={(event) => handleInspirationFieldDrop(event, index)}
                        >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                {getInspirationFormFieldTypeLabel(t, field.type)}
                              </span>
                              <span
                                className={`rounded-full px-2 py-1 ${
                                  field.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {field.enabled ? t('backOffice.main.enabledLabel') : t('backOffice.main.disabledLabel')}
                              </span>
                              {field.required && (
                                <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">{t('backOffice.main.requiredBadge')}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500" id={positionId}>
                              {t('backOffice.main.positionTemplate', { position: index + 1, total: inspirationFormFieldEntries.length })}
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <label className="flex flex-col gap-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-700">{t('backOffice.main.labelFieldLabel')}</span>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(event) => handleInspirationFormFieldLabelChange(field.id, event.target.value)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                              </label>
                              <label className="flex flex-col gap-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-700">{t('backOffice.main.fieldTypeLabel')}</span>
                                <select
                                  value={field.type}
                                  onChange={(event) => handleInspirationFormFieldTypeChange(field.id, event.target.value)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                  {buildInspirationFormFieldTypeOptions(t).map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            {INSPIRATION_FORM_FIELD_PLACEHOLDER_TYPES.has(field.type) && (
                              <label className="flex flex-col gap-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-700">
                                  {field.type === 'select' ? t('backOffice.main.selectionLabelLabel') : t('backOffice.main.placeholderLabel')}
                                </span>
                                {field.type === 'long_text' ? (
                                  <textarea
                                    rows={2}
                                    value={field.placeholder || ''}
                                    onChange={(event) => handleInspirationFormFieldPlaceholderChange(field.id, event.target.value)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder={t('backOffice.main.placeholderIndicativeText')}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(event) => handleInspirationFormFieldPlaceholderChange(field.id, event.target.value)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder={t('backOffice.main.placeholderIndicativeText')}
                                  />
                                )}
                              </label>
                            )}
                            {field.type === 'select' || field.type === 'multi_select' ? (
                              <label className="flex flex-col gap-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-700">{t('backOffice.main.optionsCommaSeparatedLabel')}</span>
                                <input
                                  type="text"
                                  value={formatOptionList(field.options)}
                                  onChange={(event) => handleInspirationFormFieldOptionsChange(field.id, event.target.value)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                              </label>
                            ) : null}
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(field.required)}
                                onChange={(event) => handleInspirationFormFieldRequiredChange(field.id, event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {t('backOffice.main.requiredFieldLabel')}
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="p-2 text-gray-500 hover:text-blue-600 rounded cursor-move"
                              aria-label={t('backOffice.main.reorderFieldAriaLabelTemplate', { field: field.label || field.id, position: index + 1, total: inspirationFormFieldEntries.length })}
                              aria-describedby={positionId}
                              draggable
                              onDragStart={(event) => handleInspirationFieldDragStart(event, index)}
                              onDragOver={(event) => handleInspirationFieldDragOver(event, index)}
                              onDrop={(event) => handleInspirationFieldDrop(event, index)}
                              onDragEnd={handleInspirationFieldDragEnd}
                              onKeyDown={(event) => handleInspirationFieldKeyboardReorder(event, index)}
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInspirationFormFieldToggle(field.id, !field.enabled)}
                              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                field.enabled
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {field.enabled ? t('backOffice.main.disableButton') : t('backOffice.main.activateLabel')}
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          )}

          {activeTab === 'themes' && (
            <section
              id="backoffice-tabpanel-themes"
              role="tabpanel"
              aria-labelledby="backoffice-tab-themes"
              className="space-y-6"
            >
              <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.showcaseThemesTitle')}</h2>
                    <p className="text-sm text-gray-600">
                      {t('backOffice.main.showcaseThemesSubtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addShowcaseTheme}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                    {t('backOffice.main.addThemeButton')}
                  </button>
                </div>

                {showcaseThemeActivationConflicts.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">{t('backOffice.main.multipleThemesWarning')}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {showcaseThemeActivationConflicts.map((conflict, index) => (
                        <li key={`theme-conflict-${index}`}>
                          {conflict[0].questionId} → {conflict[0].optionLabel} : {conflict.map((entry) => entry.label).join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {safeShowcaseThemes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                    {t('backOffice.main.noThemeConfigured')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {safeShowcaseThemes.map((theme, index) => {
                      const palette = theme?.palette || {};
                      const themeId = theme?.id || `theme-${index + 1}`;
                      const disableDelete = showcaseThemeCount <= 1;

                      return (
                        <article key={themeId} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-label`}>
                                    {t('backOffice.main.displayedNameLabel')}
                                  </label>
                                  <input
                                    id={`${themeId}-label`}
                                    type="text"
                                    value={theme?.label || ''}
                                    onChange={(event) => updateShowcaseThemeField(index, 'label', event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    placeholder={t('backOffice.main.themeNamePlaceholder')}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-id`}>
                                    {t('backOffice.main.technicalKeyLabel')}
                                  </label>
                                  <input
                                    id={`${themeId}-id`}
                                    type="text"
                                    value={themeId}
                                    readOnly
                                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">{t('backOffice.main.technicalKeyHint')}</p>
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-description`}>
                                  {t('backOffice.main.descriptionLabel')}
                                </label>
                                <textarea
                                  id={`${themeId}-description`}
                                  rows={2}
                                  value={theme?.description || ''}
                                  onChange={(event) => updateShowcaseThemeField(index, 'description', event.target.value)}
                                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  placeholder={t('backOffice.main.themeDescriptionPlaceholder')}
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-activation-question`}>
                                    {t('backOffice.main.triggerQuestionLabel')}
                                  </label>
                                  <select
                                    id={`${themeId}-activation-question`}
                                    value={normalizeThemeActivation(theme).questionId}
                                    onChange={(event) => updateShowcaseThemeActivation(index, 'questionId', event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  >
                                    <option value="">{t('backOffice.main.noTrigger')}</option>
                                    {showcaseActivationQuestions.map((entry) => (
                                      <option key={`${themeId}-${entry.id}`} value={entry.id}>
                                        {entry.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-activation-option`}>
                                    {t('backOffice.main.triggerOptionLabel')}
                                  </label>
                                  <select
                                    id={`${themeId}-activation-option`}
                                    value={normalizeThemeActivation(theme).optionLabel}
                                    onChange={(event) => updateShowcaseThemeActivation(index, 'optionLabel', event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    disabled={!normalizeThemeActivation(theme).questionId}
                                  >
                                    <option value="">{t('backOffice.main.noOption')}</option>
                                    {(showcaseActivationQuestions.find((entry) => entry.id === normalizeThemeActivation(theme).questionId)?.options || []).map((option) => (
                                      <option key={`${themeId}-${option.value}`} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 lg:flex-col lg:items-end">
                              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">#{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => deleteShowcaseTheme(themeId)}
                                disabled={disableDelete}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-disabled={disableDelete}
                              >
                                <Trash2 className="w-5 h-5" />
                                {t('backOffice.main.removeButton')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {buildShowcaseThemePaletteFields(t).map((field) => (
                              <div key={`${themeId}-${field.key}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor={`${themeId}-${field.key}`}>
                                  {field.label}
                                </label>
                                <div className="flex items-center gap-3">
                                  <input
                                    id={`${themeId}-${field.key}`}
                                    type="color"
                                    value={normalizeColorValue(palette[field.key], '#000000')}
                                    onChange={(event) => updateShowcaseThemePalette(index, field.key, event.target.value)}
                                    className="h-10 w-16 cursor-pointer rounded border border-gray-300 bg-white"
                                    aria-label={t('backOffice.main.selectColorAriaLabelTemplate', { label: field.label.toLowerCase() })}
                                  />
                                  <input
                                    type="text"
                                    value={palette[field.key] || ''}
                                    onChange={(event) => updateShowcaseThemePalette(index, field.key, event.target.value)}
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                                    placeholder="#000000"
                                  />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                              </div>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeTab === 'onboarding' && (
            <section
              id="backoffice-tabpanel-onboarding"
              role="tabpanel"
              aria-labelledby="backoffice-tab-onboarding"
              className="space-y-6"
            >
              <article className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.onboardingTourTitle')}</h2>
                    <p className="text-sm text-gray-600">
                      {t('backOffice.main.onboardingTourSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addOnboardingStep}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      {t('backOffice.main.addStepButton')}
                    </button>
                    <button
                      type="button"
                      onClick={resetOnboardingConfig}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                      {t('backOffice.main.resetButton')}
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-700">{t('backOffice.main.nextLabelLabel')}</span>
                    <input
                      type="text"
                      value={normalizedOnboardingConfig.labels.next}
                      onChange={(event) => updateOnboardingLabel('next', event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-700">{t('backOffice.main.prevLabelLabel')}</span>
                    <input
                      type="text"
                      value={normalizedOnboardingConfig.labels.prev}
                      onChange={(event) => updateOnboardingLabel('prev', event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-700">{t('backOffice.main.closeLabelLabel')}</span>
                    <input
                      type="text"
                      value={normalizedOnboardingConfig.labels.close}
                      onChange={(event) => updateOnboardingLabel('close', event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-700">{t('backOffice.main.finishLabelLabel')}</span>
                    <input
                      type="text"
                      value={normalizedOnboardingConfig.labels.finish}
                      onChange={(event) => updateOnboardingLabel('finish', event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={normalizedOnboardingConfig.allowClose}
                      onChange={(event) => updateOnboardingField('allowClose', event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t('backOffice.main.allowManualCloseLabel')}
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={normalizedOnboardingConfig.showStepDots}
                      onChange={(event) => updateOnboardingField('showStepDots', event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t('backOffice.main.showStepDotsLabel')}
                  </label>
                </div>
              </article>

              {normalizedOnboardingConfig.steps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                  {t('backOffice.main.noStepConfigured')}
                </div>
              ) : (
                <div className="space-y-4">
                  {normalizedOnboardingConfig.steps.map((step, index) => (
                    <article key={`${step.id}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t('backOffice.main.stepPositionTemplate', { position: index + 1, total: normalizedOnboardingConfig.steps.length })}
                          </p>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {step.title || step.id || t('backOffice.main.untitledStepFallback')}
                          </h3>
                          <p className="text-sm text-gray-600">{step.target || t('backOffice.main.noTargetDefined')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveOnboardingStep(index, -1)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                            aria-label={t('backOffice.main.moveStepUpAriaLabel')}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOnboardingStep(index, 1)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                            aria-label={t('backOffice.main.moveStepDownAriaLabel')}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOnboardingStep(index)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-red-600 hover:bg-red-50"
                            aria-label={t('backOffice.main.removeStepAriaLabel')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.identifierLabel')}</span>
                          <input
                            type="text"
                            value={step.id}
                            onChange={(event) => updateOnboardingStepField(index, 'id', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.targetElementIdLabel')}</span>
                          <input
                            type="text"
                            value={typeof step.target === 'string' && step.target.startsWith('#') ? step.target.slice(1) : ''}
                            onChange={(event) => {
                              const nextId = event.target.value.trim();
                              if (nextId.length > 0) {
                                updateOnboardingStepField(index, 'target', `#${nextId}`);
                              } else if (typeof step.target === 'string' && step.target.startsWith('#')) {
                                updateOnboardingStepField(index, 'target', '');
                              }
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="mon-element"
                          />
                          <span className="text-xs text-gray-500">{t('backOffice.main.targetElementIdHint')}</span>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.targetCssSelectorLabel')}</span>
                          <input
                            type="text"
                            value={step.target || ''}
                            onChange={(event) => updateOnboardingStepField(index, 'target', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="#mon-element ou .ma-classe"
                          />
                          <span className="text-xs text-gray-500">
                            {t('backOffice.main.targetCssSelectorHint')}
                          </span>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.titleFieldLabel')}</span>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(event) => updateOnboardingStepField(index, 'title', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.tooltipPositionLabel')}</span>
                          <select
                            value={step.placement || ''}
                            onChange={(event) => updateOnboardingStepField(index, 'placement', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">{t('backOffice.main.automaticOption')}</option>
                            <option value="top">{t('backOffice.main.topOption')}</option>
                            <option value="bottom">{t('backOffice.main.bottomOption')}</option>
                            <option value="left">{t('backOffice.main.leftOption')}</option>
                            <option value="right">{t('backOffice.main.rightOption')}</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.focusVisibilityLabel')}</span>
                          <select
                            value={step.highlightScope || 'target'}
                            onChange={(event) => updateOnboardingStepField(index, 'highlightScope', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="target">{t('backOffice.main.targetOnlyOption')}</option>
                            <option value="page">{t('backOffice.main.fullPageOption')}</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-700 md:col-span-2">
                          <span className="font-semibold text-gray-700">{t('backOffice.main.messageLabel')}</span>
                          <textarea
                            rows={3}
                            value={step.content}
                            onChange={(event) => updateOnboardingStepField(index, 'content', event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={step.showDefaultButtons !== false}
                            onChange={(event) => updateOnboardingStepField(index, 'showDefaultButtons', event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {t('backOffice.main.showPrevNextButtonsLabel')}
                        </label>
                      </div>

                      <div className="mt-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{t('backOffice.main.actionButtonsTitle')}</p>
                            <p className="text-xs text-gray-500">
                              {t('backOffice.main.actionButtonsHint')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addOnboardingAction(index)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3" />
                            {t('backOffice.main.addButtonButton')}
                          </button>
                        </div>

                        {Array.isArray(step.actions) && step.actions.length > 0 ? (
                          <div className="space-y-3">
                            {step.actions.map((action, actionIndex) => (
                              <div key={`${action.id}-${actionIndex}`} className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                  <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                                    {t('backOffice.main.labelFieldLabel')}
                                    <input
                                      type="text"
                                      value={action.label}
                                      onChange={(event) =>
                                        updateOnboardingActionField(index, actionIndex, 'label', event.target.value)
                                      }
                                      className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                                    {t('backOffice.main.actionLabel')}
                                    <select
                                      value={action.action}
                                      onChange={(event) =>
                                        updateOnboardingActionField(index, actionIndex, 'action', event.target.value)
                                      }
                                      className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                      <option value="next">{t('backOffice.main.goToNextStepOption')}</option>
                                      <option value="prev">{t('backOffice.main.goToPrevStepOption')}</option>
                                      <option value="goTo">{t('backOffice.main.goToSpecificStepOption')}</option>
                                      <option value="finish">{t('backOffice.main.finishTourOption')}</option>
                                      <option value="close">{t('backOffice.main.closeTourOption')}</option>
                                    </select>
                                  </label>
                                  <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                                    {t('backOffice.main.styleLabel')}
                                    <select
                                      value={action.variant || 'ghost'}
                                      onChange={(event) =>
                                        updateOnboardingActionField(index, actionIndex, 'variant', event.target.value)
                                      }
                                      className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                      <option value="primary">{t('backOffice.main.primaryOption')}</option>
                                      <option value="ghost">{t('backOffice.main.secondaryOption')}</option>
                                    </select>
                                  </label>
                                  <div className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                                    {t('backOffice.main.targetStepLabel')}
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={action.stepId || ''}
                                        onChange={(event) =>
                                          updateOnboardingActionField(index, actionIndex, 'stepId', event.target.value)
                                        }
                                        disabled={action.action !== 'goTo'}
                                        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                                      >
                                        <option value="">{t('backOffice.main.selectStepPlaceholder')}</option>
                                        {normalizedOnboardingConfig.steps.map((targetStep) => (
                                          <option key={targetStep.id} value={targetStep.id}>
                                            {targetStep.id}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => deleteOnboardingAction(index, actionIndex)}
                                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-red-600 hover:bg-red-50"
                                        aria-label={t('backOffice.main.removeButtonAriaLabel')}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">{t('backOffice.main.noCustomButtonForStep')}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'questions' && (
            <section id="backoffice-tabpanel-questions" role="tabpanel" aria-labelledby="backoffice-tab-questions" className="space-y-4">
              <div className="sr-only" aria-live="polite">{reorderAnnouncement}</div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.questionsManagementTitle')}</h2>
                  <p className="text-sm text-gray-600">{t('backOffice.main.questionsManagementSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('backOffice.main.addQuestionButton')}
                </button>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                <p className="font-medium">{t('backOffice.main.showcaseQuestionsHeading')}</p>
                <p className="mt-1 text-blue-800">
                  {t('backOffice.main.showcaseQuestionsExplanationTemplate', { badge: t('backOffice.main.showcaseQuestionBadge') })}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label
                      htmlFor="question-title-filter"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {t('backOffice.main.filterByTitleLabel')}
                    </label>
                    <input
                      id="question-title-filter"
                      type="text"
                      value={questionTitleFilter}
                      onChange={(event) => setQuestionTitleFilter(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t('backOffice.main.filterByTitlePlaceholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="question-team-filter"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {t('backOffice.main.filterByTeamLabel')}
                    </label>
                    <select
                      id="question-team-filter"
                      value={questionTeamFilter}
                      onChange={(event) => setQuestionTeamFilter(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">{t('backOffice.main.allTeamsFilterOption')}</option>
                      <option value="none">{t('backOffice.main.noTeamIdentifiedOption')}</option>
                      {availableTeamFilterOptions.map((option) => (
                        <option key={`question-team-filter-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1 flex items-end">
                    <p className="text-xs text-gray-500">
                      {questions.length === 0
                        ? t('backOffice.main.noQuestionConfiguredShort')
                        : visibleQuestionIds.length === questions.length
                          ? t('backOffice.main.allQuestionsDisplayed')
                          : visibleQuestionIds.length === 0
                            ? t('backOffice.main.noQuestionMatchesFilters')
                            : t(visibleQuestionIds.length > 1 ? 'backOffice.main.questionMatchCountPlural' : 'backOffice.main.questionMatchCountSingular', { count: visibleQuestionIds.length })}
                    </p>
                  </div>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noQuestionConfiguredYet')}
                </div>
              ) : visibleQuestionIds.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noQuestionMatchesSelectedFilters')}
                </div>
              ) : (
                shouldVirtualizeQuestions ? (
                  <VirtualizedList
                    items={visibleQuestionEntries}
                    itemKey={(entry) => entry.question.id}
                    estimatedItemHeight={360}
                    overscan={4}
                    className="relative"
                    renderItem={(entry) => {
                      const { question, index } = entry;
                      const typeMeta = getQuestionTypeMeta(question.type, t);
                      const conditionSummary = buildConditionSummary(question, questions, t, language);
                      const guidance = question.guidance || {};
                      const tips = formatGuidanceTips(guidance, language);
                      const guidanceObjective = resolveLocalizedText(guidance.objective, language);
                      const guidanceDetails = resolveLocalizedText(guidance.details, language);

                      const numberUnitLabel =
                        question.type === 'number' && typeof question.numberUnit === 'string'
                          ? question.numberUnit.trim()
                          : '';
                      const isShowcaseQuestion = Boolean(question && question.showcase);
                      const isProtectedQuestion = question?.id === 'ProjectType';
                      const deleteButtonDisabled = isShowcaseQuestion || isProtectedQuestion;
                      const deleteButtonClasses = deleteButtonDisabled
                        ? 'p-2 text-gray-300 bg-gray-100 cursor-not-allowed rounded'
                        : 'p-2 text-red-600 hover:bg-red-50 rounded';
                      const deleteButtonTitle = isShowcaseQuestion
                        ? t('backOffice.main.showcaseQuestionDeleteBlockedTitle')
                        : isProtectedQuestion
                          ? t('backOffice.main.protectedQuestionDeleteBlockedTitle')
                          : t('backOffice.main.deleteQuestionTitleTemplate', { id: question.id });
                      const questionTeams = questionTeamAssignments.get(question.id) || [];
                      const questionTeamLabels = questionTeams.map((teamId) => getTeamLabel(teamId, teams));
                      const isExpanded = expandedQuestionIds.has(question.id);
                      const detailsId = `question-details-${question.id}`;
                      const toggleLabel = isExpanded
                        ? t('backOffice.main.hideQuestionDetailsTemplate', { id: question.id })
                        : t('backOffice.main.showQuestionDetailsTemplate', { id: question.id });

                      return (
                        <div className="pb-6">
                          <article
                            className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm transition-shadow"
                            aria-label={t('backOffice.main.questionAriaLabelTemplate', { id: question.id })}
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => toggleQuestionExpansion(question.id)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                  aria-expanded={isExpanded}
                                  aria-controls={detailsId}
                                >
                                  <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  <span className="sr-only">{toggleLabel}</span>
                                </button>
                                <div className="space-y-2 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                      {typeMeta.label}
                                    </span>
                                    {isShowcaseQuestion && (
                                      <span className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded-full font-medium">
                                        {t('backOffice.main.showcaseQuestionBadge')}
                                      </span>
                                    )}
                                    {question.required && (
                                      <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">{t('backOffice.main.mandatoryBadge')}</span>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-800">{resolveLocalizedText(question.question, language)}</h3>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                    <span id={`question-${question.id}-position`}>
                                      {t('backOffice.main.positionTemplate', { position: index + 1, total: questions.length })}
                                    </span>
                                  </div>
                                  {questionTeamLabels.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {questionTeamLabels.map((label) => (
                                        <span
                                          key={`${question.id}-team-${label}`}
                                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-100"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <div className="flex flex-col gap-1" role="group" aria-label={t('backOffice.main.reorderQuestionAriaLabelTemplate', { id: question.id })}>
                                  <button
                                    type="button"
                                    onClick={() => moveQuestionUp(index)}
                                    disabled={index === 0}
                                    className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label={t('backOffice.main.moveUpAriaLabelTemplate', { id: question.id })}
                                    title={t('backOffice.main.moveUpTitle')}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveQuestionDown(index)}
                                    disabled={index === questions.length - 1}
                                    className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label={t('backOffice.main.moveDownAriaLabelTemplate', { id: question.id })}
                                    title={t('backOffice.main.moveDownTitle')}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => duplicateQuestion(question.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  aria-label={t('backOffice.main.duplicateQuestionAriaLabelTemplate', { id: question.id })}
                                  title={t('backOffice.main.duplicateQuestionAriaLabelTemplate', { id: question.id })}
                                >
                                  <Copy className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestion(question)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  aria-label={t('backOffice.main.editQuestionAriaLabelTemplate', { id: question.id })}
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (deleteButtonDisabled) {
                                      return;
                                    }

                                    const confirmationMessage = t('backOffice.main.confirmDeleteQuestionTemplate', { id: question.id });
                                    const shouldDelete = typeof window === 'undefined'
                                      ? true
                                      : window.confirm(confirmationMessage);

                                    if (shouldDelete) {
                                      deleteQuestion(question.id);
                                    }
                                  }}
                                  className={deleteButtonClasses}
                                  aria-label={deleteButtonTitle}
                                  aria-disabled={deleteButtonDisabled}
                                  disabled={deleteButtonDisabled}
                                  title={deleteButtonTitle}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div id={detailsId} className="mt-4 space-y-6">
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p>{typeMeta.description}</p>
                                  {numberUnitLabel && (
                                    <p className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                                      <Info className="w-4 h-4" />
                                      {t('backOffice.main.displayedUnitTemplate', { unit: numberUnitLabel })}
                                    </p>
                                  )}
                                </div>

                                {getQuestionOptionLabels(question).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                      <Info className="w-4 h-4 mr-2" /> {t('backOffice.main.proposedOptionsHeading')}
                                    </h4>
                                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                                      {getQuestionOptionLabels(question).map((option, optionIndex) => (
                                        <li key={`${question.id}-option-${optionIndex}`} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                          {option}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {conditionSummary.length > 0 ? (
                                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700">
                                    <h4 className="text-sm font-semibold text-blue-700 mb-3">{t('backOffice.main.displayConditionsHeading')}</h4>
                                    <ol className="space-y-3">
                                      {conditionSummary.map((group) => (
                                        <li key={`${question.id}-condition-group-${group.index}`} className="space-y-2">
                                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                            {t('backOffice.main.groupLogicTemplate', {
                                              index: group.index,
                                              logic: group.logic === t('backOffice.main.logicOr') ? t('backOffice.main.logicOrExpanded') : t('backOffice.main.logicAndExpanded')
                                            })}
                                          </div>
                                          <ul className="space-y-1">
                                            {group.parts.map((part, partIndex) => (
                                              <li key={`${question.id}-part-${group.index}-${partIndex}`} className="flex items-baseline space-x-2">
                                                {part.connector && <span className="text-xs text-blue-500">{part.connector}</span>}
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-100">{part.label}</span>
                                                <span>{part.operator}</span>
                                                <span className="font-semibold text-blue-700">« {part.value} »</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">{t('backOffice.main.questionAlwaysDisplayed')}</p>
                                )}

                                {(guidanceObjective || guidanceDetails || tips.length > 0) && (
                                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 space-y-2">
                                    {guidanceObjective && (
                                      <p>
                                        <strong className="text-gray-800">{t('backOffice.main.objectiveLabel')}</strong>{' '}
                                        {renderTextWithLinks(guidanceObjective)}
                                      </p>
                                    )}
                                    {guidanceDetails && (
                                      <p>{renderTextWithLinks(guidanceDetails)}</p>
                                    )}
                                    {tips.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">{t('backOffice.main.practicalTipsHeading')}</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {tips.map((tip, tipIndex) => (
                                            <li key={`${question.id}-tip-${tipIndex}`}>{renderTextWithLinks(tip)}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                          {index < questions.length - 1 && (
                            <div className="flex justify-center my-3">
                              <button
                                type="button"
                                onClick={() => addQuestionAtIndex(index + 1)}
                                className="w-10 h-10 rounded-full border-2 border-dashed border-blue-300 text-blue-600 bg-white flex items-center justify-center shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                aria-label={t('backOffice.main.insertQuestionAfterAriaLabelTemplate', { id: question.id })}
                              >
                                <Plus className="w-5 h-5" />
                                <span className="sr-only">{t('backOffice.main.addQuestionHereSrOnly')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                ) : (
                  visibleQuestionEntries.map((entry) => {
                    const { question, index } = entry;
                    const typeMeta = getQuestionTypeMeta(question.type, t);
                    const conditionSummary = buildConditionSummary(question, questions, t, language);
                    const guidance = question.guidance || {};
                    const tips = formatGuidanceTips(guidance, language);
                    const guidanceObjective = resolveLocalizedText(guidance.objective, language);
                    const guidanceDetails = resolveLocalizedText(guidance.details, language);

                    const numberUnitLabel =
                      question.type === 'number' && typeof question.numberUnit === 'string'
                        ? question.numberUnit.trim()
                        : '';
                    const isShowcaseQuestion = Boolean(question && question.showcase);
                    const isProtectedQuestion = question?.id === 'ProjectType';
                    const deleteButtonDisabled = isShowcaseQuestion || isProtectedQuestion;
                    const deleteButtonClasses = deleteButtonDisabled
                      ? 'p-2 text-gray-300 bg-gray-100 cursor-not-allowed rounded'
                      : 'p-2 text-red-600 hover:bg-red-50 rounded';
                    const deleteButtonTitle = isShowcaseQuestion
                      ? t('backOffice.main.showcaseQuestionDeleteBlockedTitle')
                      : isProtectedQuestion
                        ? t('backOffice.main.protectedQuestionDeleteBlockedTitle')
                        : t('backOffice.main.deleteQuestionTitleTemplate', { id: question.id });
                    const questionTeams = questionTeamAssignments.get(question.id) || [];
                    const questionTeamLabels = questionTeams.map((teamId) => getTeamLabel(teamId, teams));
                    const isExpanded = expandedQuestionIds.has(question.id);
                    const detailsId = `question-details-${question.id}`;
                    const toggleLabel = isExpanded
                      ? t('backOffice.main.hideQuestionDetailsTemplate', { id: question.id })
                      : t('backOffice.main.showQuestionDetailsTemplate', { id: question.id });

                    return (
                      <React.Fragment key={question.id}>
                        <article
                          className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm transition-shadow"
                          aria-label={t('backOffice.main.questionAriaLabelTemplate', { id: question.id })}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleQuestionExpansion(question.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                aria-expanded={isExpanded}
                                aria-controls={detailsId}
                              >
                                <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                <span className="sr-only">{toggleLabel}</span>
                              </button>
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {typeMeta.label}
                                  </span>
                                  {isShowcaseQuestion && (
                                    <span className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded-full font-medium">
                                      {t('backOffice.main.showcaseQuestionBadge')}
                                    </span>
                                  )}
                                  {question.required && (
                                    <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">{t('backOffice.main.mandatoryBadge')}</span>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">{resolveLocalizedText(question.question, language)}</h3>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                  <span id={`question-${question.id}-position`}>
                                    {t('backOffice.main.positionTemplate', { position: index + 1, total: questions.length })}
                                  </span>
                                </div>
                                {questionTeamLabels.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {questionTeamLabels.map((label) => (
                                      <span
                                        key={`${question.id}-team-${label}`}
                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-100"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <div className="flex flex-col gap-1" role="group" aria-label={t('backOffice.main.reorderQuestionAriaLabelTemplate', { id: question.id })}>
                                <button
                                  type="button"
                                  onClick={() => moveQuestionUp(index)}
                                  disabled={index === 0}
                                  className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={t('backOffice.main.moveUpAriaLabelTemplate', { id: question.id })}
                                  title={t('backOffice.main.moveUpTitle')}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveQuestionDown(index)}
                                  disabled={index === questions.length - 1}
                                  className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={t('backOffice.main.moveDownAriaLabelTemplate', { id: question.id })}
                                  title={t('backOffice.main.moveDownTitle')}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => duplicateQuestion(question.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                aria-label={t('backOffice.main.duplicateQuestionAriaLabelTemplate', { id: question.id })}
                                title={t('backOffice.main.duplicateQuestionAriaLabelTemplate', { id: question.id })}
                              >
                                <Copy className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingQuestion(question)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                aria-label={t('backOffice.main.editQuestionAriaLabelTemplate', { id: question.id })}
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (deleteButtonDisabled) {
                                    return;
                                  }

                                  const confirmationMessage = t('backOffice.main.confirmDeleteQuestionTemplate', { id: question.id });
                                  const shouldDelete = typeof window === 'undefined'
                                    ? true
                                    : window.confirm(confirmationMessage);

                                  if (shouldDelete) {
                                    deleteQuestion(question.id);
                                  }
                                }}
                                className={deleteButtonClasses}
                                aria-label={deleteButtonTitle}
                                aria-disabled={deleteButtonDisabled}
                                disabled={deleteButtonDisabled}
                                title={deleteButtonTitle}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div id={detailsId} className="mt-4 space-y-6">
                              <div className="space-y-2 text-sm text-gray-600">
                                <p>{typeMeta.description}</p>
                                {numberUnitLabel && (
                                  <p className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                                    <Info className="w-4 h-4" />
                                    {t('backOffice.main.displayedUnitTemplate', { unit: numberUnitLabel })}
                                  </p>
                                )}
                              </div>

                              {getQuestionOptionLabels(question).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Info className="w-4 h-4 mr-2" /> {t('backOffice.main.proposedOptionsHeading')}
                                  </h4>
                                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                                    {getQuestionOptionLabels(question).map((option, optionIndex) => (
                                      <li key={`${question.id}-option-${optionIndex}`} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                        {option}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {conditionSummary.length > 0 ? (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700">
                                  <h4 className="text-sm font-semibold text-blue-700 mb-3">{t('backOffice.main.displayConditionsHeading')}</h4>
                                  <ol className="space-y-3">
                                    {conditionSummary.map((group) => (
                                      <li key={`${question.id}-condition-group-${group.index}`} className="space-y-2">
                                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                          {t('backOffice.main.groupLogicTemplate', {
                                            index: group.index,
                                            logic: group.logic === t('backOffice.main.logicOr') ? t('backOffice.main.logicOrExpanded') : t('backOffice.main.logicAndExpanded')
                                          })}
                                        </div>
                                        <ul className="space-y-1">
                                          {group.parts.map((part, partIndex) => (
                                            <li key={`${question.id}-part-${group.index}-${partIndex}`} className="flex items-baseline space-x-2">
                                              {part.connector && <span className="text-xs text-blue-500">{part.connector}</span>}
                                              <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-100">{part.label}</span>
                                              <span>{part.operator}</span>
                                              <span className="font-semibold text-blue-700">« {part.value} »</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">{t('backOffice.main.questionAlwaysDisplayed')}</p>
                              )}

                              {(guidanceObjective || guidanceDetails || tips.length > 0) && (
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 space-y-2">
                                  {guidanceObjective && (
                                    <p>
                                      <strong className="text-gray-800">{t('backOffice.main.objectiveLabel')}</strong>{' '}
                                      {renderTextWithLinks(guidanceObjective)}
                                    </p>
                                  )}
                                  {guidanceDetails && (
                                    <p>{renderTextWithLinks(guidanceDetails)}</p>
                                  )}
                                  {tips.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">{t('backOffice.main.practicalTipsHeading')}</p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {tips.map((tip, tipIndex) => (
                                          <li key={`${question.id}-tip-${tipIndex}`}>{renderTextWithLinks(tip)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                        {index < questions.length - 1 && (
                          <div className="flex justify-center my-3">
                            <button
                              type="button"
                              onClick={() => addQuestionAtIndex(index + 1)}
                              className="w-10 h-10 rounded-full border-2 border-dashed border-blue-300 text-blue-600 bg-white flex items-center justify-center shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                              aria-label={t('backOffice.main.insertQuestionAfterAriaLabelTemplate', { id: question.id })}
                            >
                              <Plus className="w-5 h-5" />
                              <span className="sr-only">{t('backOffice.main.addQuestionHereSrOnly')}</span>
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )
              )}
            </section>
          )}

          {activeTab === 'rules' && (
            <section id="backoffice-tabpanel-rules" role="tabpanel" aria-labelledby="backoffice-tab-rules" className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.rulesManagementTitle')}</h2>
                  <p className="text-sm text-gray-600">{t('backOffice.main.rulesManagementSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('backOffice.main.addRuleButton')}
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label
                      htmlFor="rule-title-filter"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {t('backOffice.main.filterByTitleLabel')}
                    </label>
                    <input
                      id="rule-title-filter"
                      type="text"
                      value={ruleTitleFilter}
                      onChange={(event) => setRuleTitleFilter(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t('backOffice.main.filterByTitlePlaceholderRules')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="rule-team-filter"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {t('backOffice.main.filterByTeamLabel')}
                    </label>
                    <select
                      id="rule-team-filter"
                      value={ruleTeamFilter}
                      onChange={(event) => setRuleTeamFilter(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">{t('backOffice.main.allTeamsFilterOption')}</option>
                      <option value="none">{t('backOffice.main.noTeamIdentifiedOption')}</option>
                      {availableTeamFilterOptions.map((option) => (
                        <option key={`rule-team-filter-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1 flex items-end">
                    <p className="text-xs text-gray-500">
                      {ruleVisibilitySource.length === 0
                        ? t('backOffice.main.noRuleConfigured')
                        : visibleRuleIds.length === ruleVisibilitySource.length
                          ? t('backOffice.main.allRulesDisplayed')
                          : visibleRuleIds.length === 0
                            ? t('backOffice.main.noRuleMatchesFilters')
                            : t(visibleRuleIds.length > 1 ? 'backOffice.main.ruleMatchCountPlural' : 'backOffice.main.ruleMatchCountSingular', { count: visibleRuleIds.length })}
                    </p>
                  </div>
                </div>
              </div>

              {ruleVisibilitySource.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noRuleConfigured')}
                </div>
              ) : visibleRuleIds.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noRuleMatchesSelectedFilters')}
                </div>
              ) : (
                shouldVirtualizeRules ? (
                  <VirtualizedList
                    items={visibleRuleEntries}
                    itemKey={(rule) => rule.id}
                    estimatedItemHeight={320}
                    overscan={3}
                    className="relative"
                    renderItem={(rule) => {
                      const conditionSummary = buildRuleConditionSummary(rule, questions, t, language);
                      const risks = Array.isArray(rule.risks) ? rule.risks : [];
                      const highestRiskPriority = getHighestRiskPriority(risks);
                      const associatedTeamIds = Array.from(collectRuleTeamIds(rule));
                      const associatedTeamLabels = associatedTeamIds.map((teamId) => getTeamLabel(teamId, teams));
                      const isExpanded = expandedRuleIds.has(rule.id);
                      const detailsId = `rule-details-${rule.id}`;
                      const ruleDisplayName = resolveLocalizedText(rule.name, language) || rule.id;
                      const toggleLabel = isExpanded
                        ? t('backOffice.main.hideRuleDetailsTemplate', { name: ruleDisplayName })
                        : t('backOffice.main.showRuleDetailsTemplate', { name: ruleDisplayName });

                      return (
                        <div className="pb-6">
                          <article className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => toggleRuleExpansion(rule.id)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                  aria-expanded={isExpanded}
                                  aria-controls={detailsId}
                                >
                                  <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  <span className="sr-only">{toggleLabel}</span>
                                </button>
                                <div className="space-y-2 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                    <span className={`px-2 py-1 rounded-full font-semibold ${getPriorityBadgeClasses(highestRiskPriority)}`}>
                                      {highestRiskPriority
                                        ? t('backOffice.main.mainPriorityTemplate', { priority: getRiskPriorityLabel(t, highestRiskPriority) })
                                        : t('backOffice.main.priorityNotProvided')}
                                    </span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-800">{ruleDisplayName}</h3>
                                  {associatedTeamLabels.length > 0 && (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {associatedTeamLabels.map((label) => (
                                        <span
                                          key={`${rule.id}-team-${label}`}
                                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingRule(rule)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  aria-label={t('backOffice.main.viewRuleAriaLabelTemplate', { name: ruleDisplayName })}
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => duplicateRule(rule.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  aria-label={t('backOffice.main.duplicateRuleAriaLabelTemplate', { name: ruleDisplayName })}
                                  title={t('backOffice.main.duplicateRuleAriaLabelTemplate', { name: ruleDisplayName })}
                                >
                                  <Copy className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRule(rule.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  aria-label={t('backOffice.main.deleteRuleAriaLabelTemplate', { name: ruleDisplayName })}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div id={detailsId} className="mt-4 space-y-6 text-sm text-gray-700">
                                {conditionSummary.length > 0 ? (
                                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-blue-700 mb-3">{t('backOffice.main.triggerConditionsHeading')}</h4>
                                    <ol className="space-y-3">
                                      {conditionSummary.map((group) => (
                                        <li key={`${rule.id}-group-${group.index}`} className="space-y-2">
                                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                            {t('backOffice.main.groupLogicTemplate', { index: group.index, logic: group.logic })}
                                          </div>
                                          <ul className="space-y-1">
                                            {group.items.map((item, idx) => (
                                              <li key={`${rule.id}-item-${group.index}-${idx}`} className="flex items-start space-x-2">
                                                <span className="text-blue-500 mt-1">•</span>
                                                <span>{item.description}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">
                                    {t('backOffice.main.ruleAlwaysActiveNote')}
                                  </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-800">{t('backOffice.main.involvedTeamsHeading')}</h4>
                                    {associatedTeamLabels.length > 0 ? (
                                      <ul className="flex flex-wrap gap-2">
                                        {associatedTeamLabels.map((label) => (
                                          <li key={`${rule.id}-details-team-${label}`} className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                            {label}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-gray-500 italic">{t('backOffice.main.noAssociatedTeam')}</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-800">{t('backOffice.main.identifiedRisksHeading')}</h4>
                                    {risks.length > 0 ? (
                                      <ul className="space-y-1">
                                        {risks.map((risk, index) => {
                                          const riskDescription = resolveLocalizedText(risk?.description, language) || t('backOffice.main.riskNotProvidedFallback');
                                          const riskPriority = getRiskPriorityLabel(t, risk?.priority || 'standard');
                                          const riskTeamLabel = risk?.teamId ? getTeamLabel(risk.teamId, teams) : t('backOffice.dashboard.teamNotSet');

                                          return (
                                            <li key={`${rule.id}-risk-${index}`} className="space-y-1">
                                              <div className="flex items-start space-x-2">
                                                <span className="text-red-500 mt-1">•</span>
                                                <span>{riskDescription}</span>
                                              </div>
                                              <div className="text-xs text-gray-500 flex flex-wrap gap-2 pl-4">
                                                <span className="inline-flex items-center gap-1">
                                                  <strong className="font-semibold text-gray-600">{t('backOffice.main.teamColonLabel')}</strong>
                                                  <span>{riskTeamLabel}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                  <strong className="font-semibold text-gray-600">{t('backOffice.main.priorityColonLabel')}</strong>
                                                  <span>{riskPriority}</span>
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-600 pl-4">{t('backOffice.main.detailColonTemplate', { value: resolveLocalizedText(risk?.mitigation, language) || t('backOffice.main.noDetailProvided') })}</p>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-gray-500 italic">{t('backOffice.main.noRiskDocumented')}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </article>
                        </div>
                      );
                    }}
                  />
                ) : (
                  visibleRuleEntries.map((rule) => {
                    const conditionSummary = buildRuleConditionSummary(rule, questions, t, language);
                    const risks = Array.isArray(rule.risks) ? rule.risks : [];
                    const highestRiskPriority = getHighestRiskPriority(risks);
                    const associatedTeamIds = Array.from(collectRuleTeamIds(rule));
                    const associatedTeamLabels = associatedTeamIds.map((teamId) => getTeamLabel(teamId, teams));
                    const isExpanded = expandedRuleIds.has(rule.id);
                    const detailsId = `rule-details-${rule.id}`;
                    const ruleDisplayName = resolveLocalizedText(rule.name, language) || rule.id;
                    const toggleLabel = isExpanded
                      ? t('backOffice.main.hideRuleDetailsTemplate', { name: ruleDisplayName })
                      : t('backOffice.main.showRuleDetailsTemplate', { name: ruleDisplayName });

                    return (
                      <article key={rule.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleRuleExpansion(rule.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              aria-expanded={isExpanded}
                              aria-controls={detailsId}
                            >
                              <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <span className="sr-only">{toggleLabel}</span>
                            </button>
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full font-semibold ${getPriorityBadgeClasses(highestRiskPriority)}`}>
                                  {highestRiskPriority
                                    ? t('backOffice.main.mainPriorityTemplate', { priority: getRiskPriorityLabel(t, highestRiskPriority) })
                                    : t('backOffice.main.priorityNotProvided')}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800">{ruleDisplayName}</h3>
                              {associatedTeamLabels.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {associatedTeamLabels.map((label) => (
                                    <span
                                      key={`${rule.id}-team-${label}`}
                                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingRule(rule)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              aria-label={t('backOffice.main.viewRuleAriaLabelTemplate', { name: ruleDisplayName })}
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateRule(rule.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              aria-label={t('backOffice.main.duplicateRuleAriaLabelTemplate', { name: ruleDisplayName })}
                              title={t('backOffice.main.duplicateRuleAriaLabelTemplate', { name: ruleDisplayName })}
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRule(rule.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              aria-label={t('backOffice.main.deleteRuleAriaLabelTemplate', { name: ruleDisplayName })}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div id={detailsId} className="mt-4 space-y-6 text-sm text-gray-700">
                            {conditionSummary.length > 0 ? (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-blue-700 mb-3">{t('backOffice.main.triggerConditionsHeading')}</h4>
                                <ol className="space-y-3">
                                  {conditionSummary.map((group) => (
                                    <li key={`${rule.id}-group-${group.index}`} className="space-y-2">
                                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                        {t('backOffice.main.groupLogicTemplate', { index: group.index, logic: group.logic })}
                                      </div>
                                      <ul className="space-y-1">
                                        {group.items.map((item, idx) => (
                                          <li key={`${rule.id}-item-${group.index}-${idx}`} className="flex items-start space-x-2">
                                            <span className="text-blue-500 mt-1">•</span>
                                            <span>{item.description}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">
                                {t('backOffice.main.ruleAlwaysActiveNote')}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-800">{t('backOffice.main.involvedTeamsHeading')}</h4>
                                {associatedTeamLabels.length > 0 ? (
                                  <ul className="flex flex-wrap gap-2">
                                    {associatedTeamLabels.map((label) => (
                                      <li key={`${rule.id}-details-team-${label}`} className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                        {label}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">{t('backOffice.main.noAssociatedTeam')}</p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-800">{t('backOffice.main.identifiedRisksHeading')}</h4>
                                {risks.length > 0 ? (
                                  <ul className="space-y-1">
                                    {risks.map((risk, index) => {
                                      const riskDescription = resolveLocalizedText(risk?.description, language) || t('backOffice.main.riskNotProvidedFallback');
                                      const riskPriority = getRiskPriorityLabel(t, risk?.priority || 'standard');
                                      const riskTeamLabel = risk?.teamId ? getTeamLabel(risk.teamId, teams) : t('backOffice.dashboard.teamNotSet');

                                      return (
                                        <li key={`${rule.id}-risk-${index}`} className="space-y-1">
                                          <div className="flex items-start space-x-2">
                                            <span className="text-red-500 mt-1">•</span>
                                            <span>{riskDescription}</span>
                                          </div>
                                          <div className="text-xs text-gray-500 flex flex-wrap gap-2 pl-4">
                                            <span className="inline-flex items-center gap-1">
                                              <strong className="font-semibold text-gray-600">{t('backOffice.main.teamColonLabel')}</strong>
                                              <span>{riskTeamLabel}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                              <strong className="font-semibold text-gray-600">{t('backOffice.main.priorityColonLabel')}</strong>
                                              <span>{riskPriority}</span>
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-600 pl-4">{t('backOffice.main.detailColonTemplate', { value: resolveLocalizedText(risk?.mitigation, language) || t('backOffice.main.noDetailProvided') })}</p>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">{t('backOffice.main.noRiskDocumented')}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )
              )}
            </section>
          )}

          {activeTab === 'validationCommittee' && (
            <section
              id="backoffice-tabpanel-validationCommittee"
              role="tabpanel"
              aria-labelledby="backoffice-tab-validationCommittee"
              className="space-y-6"
            >
              <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
                <header className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.validationCommitteeTitle')}</h2>
                  <p className="text-sm text-gray-600">
                    {t('backOffice.main.validationCommitteeSubtitle')}
                  </p>
                </header>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  {t('backOffice.main.commentRequestInfoBox')}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      checked={normalizedValidationCommitteeConfig.enabled}
                      onChange={(event) => {
                        updateValidationCommitteeConfig((prev) => ({
                          ...prev,
                          enabled: event.target.checked
                        }));
                      }}
                    />
                    {t('backOffice.main.enableCommitteeTrackingLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={addCommitteeEntry}
                    className="ml-auto inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {t('backOffice.main.addCommitteeButton')}
                  </button>
                </div>

                {visibleCommittees.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {t('backOffice.main.noCommitteeConfigured')}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {visibleCommittees.map((committee, index) => (
                      <article
                        key={committee.id}
                        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {committee.name || t('backOffice.main.committeeNumberTemplate', { number: index + 1 })}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {t('backOffice.main.committeeConfigureHint')}
                            </p>
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                checked={committee.commentRequired !== false}
                                onChange={(event) =>
                                  updateCommitteeEntry(committee.id, (prev) => ({
                                    ...prev,
                                    commentRequired: event.target.checked
                                  }))
                                }
                              />
                              {t('backOffice.main.enableCommentRequestLabel')}
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCommitteeEntry(committee.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            {t('backOffice.main.removeButton')}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`validation-committee-name-${committee.id}`}
                              className="text-sm font-medium text-gray-700"
                            >
                              {t('backOffice.main.committeeNameLabel')}
                            </label>
                            <input
                              id={`validation-committee-name-${committee.id}`}
                              type="text"
                              value={committee.name}
                              onChange={(event) =>
                                updateCommitteeEntry(committee.id, (prev) => ({
                                  ...prev,
                                  name: event.target.value
                                }))
                              }
                              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder={t('backOffice.main.committeeNumberTemplate', { number: index + 1 })}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`validation-committee-emails-${committee.id}`}
                              className="text-sm font-medium text-gray-700"
                            >
                              {t('backOffice.main.emailAddressesLabel')}
                            </label>
                            <input
                              id={`validation-committee-emails-${committee.id}`}
                              type="text"
                              value={committee.emails.join(', ')}
                              onChange={(event) =>
                                updateCommitteeEntry(committee.id, (prev) => ({
                                  ...prev,
                                  emails: parseEmailList(event.target.value)
                                }))
                              }
                              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder={t('backOffice.main.committeeEmailsPlaceholder')}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                              {t('backOffice.main.separateAddressesHint')}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800">
                                {t('backOffice.main.triggerConditionsHeading')}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {t('backOffice.main.triggerByAnswersHint')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addCommitteeConditionGroup(committee.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Plus className="h-4 w-4" />
                              {t('backOffice.main.addGroupButton')}
                            </button>
                          </div>

                          {(() => {
                            const conditionGroups = normalizeRuleConditionGroups(committee);

                            if (conditionGroups.length === 0) {
                              return (
                                <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-center text-sm text-blue-700">
                                  <p>{t('backOffice.main.committeeNoConditionYet')}</p>
                                  <button
                                    type="button"
                                    onClick={() => addCommitteeConditionGroup(committee.id)}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                  >
                                    <Plus className="h-4 w-4" />
                                    {t('backOffice.main.createConditionGroupButton')}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-4">
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                  {conditionGroups.length === 1 ? (
                                    (() => {
                                      const logic = conditionGroups[0].logic === 'any' ? 'any' : 'all';
                                      const logicLabel = logic === 'any' ? 'OU' : 'ET';
                                      const logicDescription = logic === 'any'
                                        ? t('backOffice.main.atLeastOneConditionMet')
                                        : t('backOffice.main.allConditionsMet');

                                      return (
                                        <p>
                                          <strong>{t('backOffice.main.logicLabel')}</strong>{' '}
                                          {interpolateNodes(t('backOffice.main.committeeTriggersIfTemplate'), {
                                            description: (
                                              <strong className="text-blue-700">{logicDescription}</strong>
                                            ),
                                            logic: logicLabel
                                          })}
                                        </p>
                                      );
                                    })()
                                  ) : (
                                    <div className="space-y-1">
                                      <p>
                                        <strong>{t('backOffice.main.logicLabel')}</strong>{' '}
                                        {interpolateNodes(t('backOffice.main.committeeTriggersWhenEachGroupTemplate'), {
                                          groupLabel: (
                                            <strong className="text-blue-700">{t('backOffice.main.eachGroupOfConditionsBold')}</strong>
                                          ),
                                          andLabel: <strong>{t('backOffice.main.logicAnd')}</strong>
                                        })}
                                      </p>
                                      <p>
                                        {interpolateNodes(t('backOffice.main.insideGroupChooseHintTemplate'), {
                                          allLabel: <strong className="text-blue-700">{t('backOffice.main.allBold')}</strong>,
                                          atLeastOneLabel: (
                                            <strong className="text-blue-700">{t('backOffice.main.atLeastOneBold')}</strong>
                                          )
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-6">
                                  {conditionGroups.map((group, groupIdx) => {
                                    const logic = group.logic === 'any' ? 'any' : 'all';
                                    const conditions = Array.isArray(group.conditions) ? group.conditions : [];
                                    const connectorLabel = logic === 'any' ? 'OU' : 'ET';

                                    return (
                                      <div key={`${committee.id}-group-${groupIdx}`}>
                                        {groupIdx > 0 && (
                                          <div className="flex justify-center -mb-3" aria-hidden="true">
                                            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow">
                                              {t('backOffice.main.logicAnd')}
                                            </span>
                                          </div>
                                        )}

                                        <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                                          <div className="mb-4 flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-700">
                                              {t('backOffice.main.groupNumberTemplate', { number: groupIdx + 1 })}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-800">
                                              <span className="font-semibold">{t('backOffice.main.internalLogicLabel')}</span>
                                              <select
                                                value={logic}
                                                onChange={(event) =>
                                                  updateCommitteeConditionGroupLogic(
                                                    committee.id,
                                                    groupIdx,
                                                    event.target.value
                                                  )
                                                }
                                                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                                              >
                                                <option value="all">{t('backOffice.main.allConditionsAndOption')}</option>
                                                <option value="any">{t('backOffice.main.atLeastOneConditionOrOption')}</option>
                                              </select>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => deleteCommitteeConditionGroup(committee.id, groupIdx)}
                                              className="ml-auto rounded p-2 text-red-600 hover:bg-red-50"
                                              aria-label={t('backOffice.main.removeGroupAriaLabelTemplate', { number: groupIdx + 1 })}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>

                                          {conditions.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-blue-700">
                                              <p>{t('backOffice.main.addConditionToDefineGroup')}</p>
                                              <button
                                                type="button"
                                                onClick={() => addCommitteeCondition(committee.id, groupIdx)}
                                                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                                              >
                                                <Plus className="h-4 w-4" />
                                                {t('backOffice.main.addConditionButton')}
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              {conditions.map((condition, conditionIdx) => {
                                                const conditionType = condition.type === 'timing' ? 'timing' : 'question';
                                                const selectedQuestion = conditionQuestionEntries.find(
                                                  (item) => item.id === condition.question
                                                );
                                                const selectedQuestionType = selectedQuestion?.type || 'choice';
                                                const usesOptions = ['choice', 'multi_choice'].includes(selectedQuestionType);
                                                const inputType = selectedQuestionType === 'number'
                                                  ? 'number'
                                                  : selectedQuestionType === 'date'
                                                    ? 'date'
                                                    : 'text';
                                                const placeholder = selectedQuestionType === 'date'
                                                  ? t('backOffice.ruleEditor.datePlaceholder')
                                                  : selectedQuestionType === 'url'
                                                    ? t('backOffice.ruleEditor.urlPlaceholder')
                                                    : t('backOffice.main.valuePlaceholder');

                                                return (
                                                  <div
                                                    key={`${committee.id}-condition-${groupIdx}-${conditionIdx}`}
                                                    className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm"
                                                  >
                                                    <div className="mb-3 flex flex-wrap items-center gap-3">
                                                      {conditionIdx > 0 && (
                                                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                                                          {connectorLabel}
                                                        </span>
                                                      )}
                                                      <span className="text-sm font-semibold text-gray-700">
                                                        {t('backOffice.main.conditionNumberTemplate', { number: conditionIdx + 1 })}
                                                      </span>
                                                      <select
                                                        value={conditionType}
                                                        onChange={(event) =>
                                                          handleCommitteeConditionTypeChange(
                                                            committee.id,
                                                            groupIdx,
                                                            conditionIdx,
                                                            event.target.value
                                                          )
                                                        }
                                                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                      >
                                                        <option value="question">{t('backOffice.main.basedOnAnswerOption')}</option>
                                                        <option value="timing">{t('backOffice.main.dateComparisonOption')}</option>
                                                      </select>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          deleteCommitteeCondition(committee.id, groupIdx, conditionIdx)
                                                        }
                                                        className="ml-auto rounded p-1 text-red-600 hover:bg-red-50"
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                      </button>
                                                    </div>

                                                    {conditionType === 'timing' ? (
                                                      <div className="space-y-4">
                                                        {dateQuestions.length >= 2 ? (
                                                          <>
                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                              <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                  {t('backOffice.main.startDateLabel')}
                                                                </label>
                                                                <select
                                                                  value={condition.startQuestion}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'startQuestion',
                                                                      event.target.value
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                  <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                                                  {dateQuestions.map((question) => (
                                                                    <option key={question.id} value={question.id}>
                                                                      {question.question || question.id}
                                                                    </option>
                                                                  ))}
                                                                </select>
                                                              </div>

                                                              <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                  {t('backOffice.main.endDateLabel')}
                                                                </label>
                                                                <select
                                                                  value={condition.endQuestion}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'endQuestion',
                                                                      event.target.value
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                  <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                                                  {dateQuestions.map((question) => (
                                                                    <option key={question.id} value={question.id}>
                                                                      {question.question || question.id}
                                                                    </option>
                                                                  ))}
                                                                </select>
                                                              </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                              <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                  {t('backOffice.main.minDurationWeeksLabel')}
                                                                </label>
                                                                <input
                                                                  type="number"
                                                                  min="0"
                                                                  value={condition.minimumWeeks ?? ''}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'minimumWeeks',
                                                                      event.target.value === '' ? undefined : Number(event.target.value)
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                  placeholder={t('backOffice.main.exampleEightPlaceholder')}
                                                                />
                                                              </div>

                                                              <div>
                                                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                                                  {t('backOffice.main.maxDurationWeeksLabel')}
                                                                </label>
                                                                <input
                                                                  type="number"
                                                                  min="0"
                                                                  value={condition.maximumWeeks ?? ''}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'maximumWeeks',
                                                                      event.target.value === '' ? undefined : Number(event.target.value)
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                  placeholder={t('backOffice.main.leaveEmptyIfNotConcerned')}
                                                                />
                                                              </div>
                                                            </div>

                                                            <p className="text-xs text-gray-500">
                                                              {t('backOffice.main.committeeDurationHint')}
                                                            </p>
                                                          </>
                                                        ) : (
                                                          <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-blue-700">
                                                            {t('backOffice.main.needTwoDateQuestionsWarning')}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                        <div>
                                                          <label className="mb-1 block text-xs font-medium text-gray-600">
                                                            {t('backOffice.main.questionLabel')}
                                                          </label>
                                                          <select
                                                            value={condition.question}
                                                            onChange={(event) =>
                                                              updateCommitteeConditionField(
                                                                committee.id,
                                                                groupIdx,
                                                                conditionIdx,
                                                                'question',
                                                                event.target.value
                                                              )
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                          >
                                                            <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                                            {conditionQuestionEntries.map((question) => (
                                                              <option key={question.id} value={question.id}>
                                                                {resolveLocalizedText(question.question, language) || question.id}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        </div>

                                                        <div>
                                                          <label className="mb-1 block text-xs font-medium text-gray-600">
                                                            {t('backOffice.main.operatorLabel')}
                                                          </label>
                                                          {(() => {
                                                            const operatorOptions = getOperatorOptionsForType(selectedQuestionType);
                                                            const operatorValue = ensureOperatorForType(
                                                              selectedQuestionType,
                                                              condition.operator
                                                            );
                                                            return (
                                                              <select
                                                                value={operatorValue}
                                                                onChange={(event) =>
                                                                  updateCommitteeConditionField(
                                                                    committee.id,
                                                                    groupIdx,
                                                                    conditionIdx,
                                                                    'operator',
                                                                    event.target.value
                                                                  )
                                                                }
                                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                              >
                                                                {operatorOptions.map((option) => (
                                                                  <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                            );
                                                          })()}
                                                        </div>

                                                        <div>
                                                          <label className="mb-1 block text-xs font-medium text-gray-600">
                                                            {t('backOffice.main.valueLabel')}
                                                          </label>
                                                          {(() => {
                                                            if (!condition.question) {
                                                              return (
                                                                <input
                                                                  type="text"
                                                                  value={condition.value}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'value',
                                                                      event.target.value
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                  placeholder={t('backOffice.main.valuePlaceholder')}
                                                                />
                                                              );
                                                            }

                                                            if (selectedQuestionType === 'boolean') {
                                                              return (
                                                                <select
                                                                  value={condition.value}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'value',
                                                                      event.target.value
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                  <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                                                  <option value="true">{t('backOffice.main.checkedOption')}</option>
                                                                  <option value="false">{t('backOffice.main.uncheckedOption')}</option>
                                                                </select>
                                                              );
                                                            }

                                                            if (usesOptions) {
                                                              return (
                                                                <select
                                                                  value={condition.value}
                                                                  onChange={(event) =>
                                                                    updateCommitteeConditionField(
                                                                      committee.id,
                                                                      groupIdx,
                                                                      conditionIdx,
                                                                      'value',
                                                                      event.target.value
                                                                    )
                                                                  }
                                                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                  <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                                                  {getQuestionOptionLabels(selectedQuestion).map((option, optionIndex) => (
                                                                    <option key={optionIndex} value={option}>
                                                                      {option}
                                                                    </option>
                                                                  ))}
                                                                </select>
                                                              );
                                                            }

                                                            return (
                                                              <input
                                                                type={inputType}
                                                                value={condition.value}
                                                                onChange={(event) =>
                                                                  updateCommitteeConditionField(
                                                                    committee.id,
                                                                    groupIdx,
                                                                    conditionIdx,
                                                                    'value',
                                                                    event.target.value
                                                                  )
                                                                }
                                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                                                placeholder={placeholder}
                                                              />
                                                            );
                                                          })()}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}

                                              <div className="flex justify-end border-t border-blue-100 pt-3">
                                                <button
                                                  type="button"
                                                  onClick={() => addCommitteeCondition(committee.id, groupIdx)}
                                                  className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                                                >
                                                  <Plus className="h-4 w-4" />
                                                  {t('backOffice.main.addConditionButton')}
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.triggeringRulesHeading')}</h4>
                              <p className="text-xs text-gray-600">
                                {t('backOffice.main.triggerByRulesHint')}
                              </p>
                            </div>
                            <div>
                              <label
                                htmlFor={`validation-committee-rules-${committee.id}`}
                                className="text-sm font-medium text-gray-700"
                              >
                                {t('backOffice.main.targetedRulesLabel')}
                              </label>
                              <select
                                id={`validation-committee-rules-${committee.id}`}
                                multiple
                                value={committee.ruleTriggers.ruleIds}
                                onChange={(event) => {
                                  const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                                  updateCommitteeEntry(committee.id, (prev) => ({
                                    ...prev,
                                    ruleTriggers: {
                                      ...prev.ruleTriggers,
                                      ruleIds: selected
                                    }
                                  }));
                                }}
                                className="mt-2 h-36 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              >
                                {validationCommitteeRuleOptions.length === 0 && (
                                  <option value="" disabled>
                                    {t('backOffice.main.noRuleAvailable')}
                                  </option>
                                )}
                                {validationCommitteeRuleOptions.map((option) => (
                                  <option key={`validation-rule-${committee.id}-${option.value}`} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-2 text-xs text-gray-500">
                                {t('backOffice.main.ctrlCmdMultiSelectHint')}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {t('backOffice.main.committeeTriggersOnRuleHint')}
                            </p>
                          </div>

                          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.identifiedRisksHeading')}</h4>
                              <p className="text-xs text-gray-600">
                                {t('backOffice.main.linkRiskAnalysisHint')}
                              </p>
                            </div>
                            <div>
                              <label
                                htmlFor={`validation-committee-risk-score-${committee.id}`}
                                className="text-sm font-medium text-gray-700"
                              >
                                {t('backOffice.main.minRiskScoreLabel')}
                              </label>
                              <input
                                id={`validation-committee-risk-score-${committee.id}`}
                                type="number"
                                min="0"
                                step="0.5"
                                value={committee.riskTriggers.minRiskScore ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  updateCommitteeEntry(committee.id, (prev) => ({
                                    ...prev,
                                    riskTriggers: {
                                      ...prev.riskTriggers,
                                      minRiskScore: value === '' ? null : Number(value)
                                    }
                                  }));
                                }}
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder={t('backOffice.main.exampleThreeFivePlaceholder')}
                              />
                            </div>
                          </div>

                          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.solicitedTeamsHeading')}</h4>
                              <p className="text-xs text-gray-600">
                                {t('backOffice.main.triggerByTeamCountHint')}
                              </p>
                            </div>
                            <div>
                              <label
                                htmlFor={`validation-committee-team-count-${committee.id}`}
                                className="text-sm font-medium text-gray-700"
                              >
                                {t('backOffice.main.minTeamsCountLabel')}
                              </label>
                              <input
                                id={`validation-committee-team-count-${committee.id}`}
                                type="number"
                                min="1"
                                value={committee.teamTriggers.minTeamsCount ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  updateCommitteeEntry(committee.id, (prev) => ({
                                    ...prev,
                                    teamTriggers: {
                                      ...prev.teamTriggers,
                                      minTeamsCount: value === '' ? null : Number(value)
                                    }
                                  }));
                                }}
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder={t('backOffice.main.exampleThreePlaceholder')}
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeTab === 'administrators' && (
            <section
              id="backoffice-tabpanel-administrators"
              role="tabpanel"
              aria-labelledby="backoffice-tab-administrators"
              className="space-y-4"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.administratorsHeading')}</h2>
                <p className="text-sm text-gray-600">
                  {t('backOffice.main.administratorsSubtitle')}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <label htmlFor="admin-emails" className="text-sm font-medium text-gray-700">
                    {t('backOffice.main.adminEmailsLabel')}
                  </label>
                  <textarea
                    id="admin-emails"
                    rows={4}
                    value={adminEmailsDraft}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setAdminEmailsDraft(nextValue);
                      const nextEmails = parseEmailList(nextValue);
                      if (typeof setAdminEmails === 'function') {
                        setAdminEmails(nextEmails);
                      }
                    }}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder={t('backOffice.main.adminEmailsPlaceholder')}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {t('backOffice.main.adminEmailsSeparateHint')}
                  </p>
                </div>

                {normalizedAdminEmails.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('backOffice.main.registeredAdminsTemplate', { count: normalizedAdminEmails.length })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {normalizedAdminEmails.map((email) => (
                        <span
                          key={email}
                          className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium"
                        >
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t('backOffice.main.noAdminRegistered')}
                  </p>
                )}
              </div>

              {isCurrentUserAdmin && (
                <div className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.main.sharePointPublishTitle')}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('backOffice.main.sharePointPublishDescription')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onSharePointReinitialize}
                    disabled={sharePointReinitializeState.inProgress || typeof onSharePointReinitialize !== 'function'}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sharePointReinitializeState.inProgress ? t('backOffice.main.publishingInProgress') : t('backOffice.main.publishConfigButton')}
                  </button>

                  {sharePointReinitializeState.message && (
                    <p
                      className={`text-sm ${sharePointReinitializeState.status === 'error' ? 'text-red-700' : 'text-gray-700'}`}
                      role="status"
                    >
                      {sharePointReinitializeState.message}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === 'riskLevels' && (
            <section
              id="backoffice-tabpanel-risk-levels"
              role="tabpanel"
              aria-labelledby="backoffice-tab-riskLevels"
              className="space-y-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.riskLevelsTitle')}</h2>
                  <p className="text-sm text-gray-600">
                    {t('backOffice.main.riskLevelsSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRiskLevelRule}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('backOffice.main.addLevelButton')}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 space-y-2">
                <p className="flex items-start gap-2">
                  <Info className="w-5 h-5 mt-0.5" />
                  <span>
                    {t('backOffice.main.levelsEvaluatedTopDownHint')}
                  </span>
                </p>
                <p className="text-xs text-blue-700">
                  {t('backOffice.main.riskScoreExplanationHint')}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.main.criticalityWeightingTitle')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('backOffice.main.criticalityWeightingSubtitle')}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {buildRiskWeightFields(t).map((field) => (
                    <div key={field.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={`risk-weight-${field.key}`}>
                        {field.label}
                      </label>
                      <input
                        id={`risk-weight-${field.key}`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={normalizedRiskWeights[field.key] ?? 0}
                        onChange={(event) => handleRiskWeightChange(field.key, event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="mt-2 text-xs text-gray-500">{field.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {riskLevelRuleCount === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noRiskLevelConfigured')}
                </div>
              ) : (
                <div className="space-y-4">
                  {safeRiskLevelRules.map((rule, index) => {
                    const ruleId = rule?.id || `risk-level-${index + 1}`;
                    const labelInputId = `${ruleId}-label`;
                    const minInputId = `${ruleId}-min`;
                    const maxInputId = `${ruleId}-max`;
                    const descriptionId = `${ruleId}-description`;
                    const rangeLabel = formatRiskRangeLabel(rule);
                    const issues = getRiskLevelRuleIssues(rule, index, safeRiskLevelRules);
                    const disableDelete = riskLevelRuleCount <= 1;
                    const minValue = getRuleMinScoreValue(rule);
                    const maxScoreValue = getRuleMaxScoreValue(rule);
                    const maxValue = maxScoreValue === null ? '' : maxScoreValue;

                    return (
                      <article key={ruleId} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">{ruleId}</span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">{rangeLabel}</span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">{t('backOffice.main.tierNumberTemplate', { number: index + 1 })}</span>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
                                htmlFor={labelInputId}
                              >
                                {t('backOffice.main.levelNameLabel')}
                              </label>
                              <input
                                id={labelInputId}
                                type="text"
                                value={rule?.label || ''}
                                onChange={(event) => updateRiskLevelRuleField(index, 'label', event.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-start gap-2 self-stretch md:self-start">
                            <div className="flex flex-col gap-2" role="group" aria-label={t('backOffice.main.reorderLevelAriaLabelTemplate', { name: rule?.label || index + 1 })}>
                              <button
                                type="button"
                                onClick={() => moveRiskLevelRule(index, index - 1)}
                                disabled={index === 0}
                                className="p-2 text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label={t('backOffice.main.moveLevelUpAriaLabelTemplate', { name: rule?.label || ruleId })}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRiskLevelRule(index, index + 1)}
                                disabled={index === riskLevelRuleCount - 1}
                                className="p-2 text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label={t('backOffice.main.moveLevelDownAriaLabelTemplate', { name: rule?.label || ruleId })}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteRiskLevelRule(ruleId, index)}
                              disabled={disableDelete}
                              className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label={t('backOffice.main.removeLevelAriaLabelTemplate', { name: rule?.label || ruleId })}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label
                              className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
                              htmlFor={minInputId}
                            >
                              {t('backOffice.main.minScoreLabel')}
                            </label>
                            <input
                              id={minInputId}
                              type="number"
                              min="0"
                              step="0.5"
                              value={minValue}
                              onChange={(event) => updateRiskLevelRuleField(index, 'minScore', event.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label
                              className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
                              htmlFor={maxInputId}
                            >
                              {t('backOffice.main.maxScoreOptionalLabel')}
                            </label>
                            <input
                              id={maxInputId}
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder={t('backOffice.main.unlimitedPlaceholder')}
                              value={maxValue}
                              onChange={(event) => updateRiskLevelRuleField(index, 'maxScore', event.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {t('backOffice.main.leaveEmptyForAllScoresHint')}
                            </p>
                          </div>
                          <div>
                            <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                              {t('backOffice.main.autoSummaryLabel')}
                            </span>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                              {rangeLabel}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label
                            className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
                            htmlFor={descriptionId}
                          >
                            {t('backOffice.main.contextMessageLabel')}
                          </label>
                          <textarea
                            id={descriptionId}
                            rows={3}
                            value={rule?.description || ''}
                            onChange={(event) => updateRiskLevelRuleField(index, 'description', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                          />
                        </div>

                        {issues.length > 0 && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                            {issues.map((issue, issueIndex) => (
                              <p key={`${ruleId}-issue-${issueIndex}`}>• {issue}</p>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'teams' && (
            <section id="backoffice-tabpanel-teams" role="tabpanel" aria-labelledby="backoffice-tab-teams" className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.teamsManagementTitle')}</h2>
                  <p className="text-sm text-gray-600">{t('backOffice.main.teamsManagementSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={addTeam}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('backOffice.main.addTeamButton')}
                </button>
              </div>

              {visibleTeams.length === 0 && (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                  {t('backOffice.main.noTeamRegistered')}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleTeams.map((team, index) => (
                  <article key={team.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm" aria-label={t('backOffice.main.teamAriaLabelTemplate', { name: team.name })}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(event) => updateTeamField(index, 'name', event.target.value)}
                        className="text-lg font-semibold text-gray-800 border-b border-transparent focus:border-blue-600 focus:outline-none flex-1"
                        aria-label={t('backOffice.main.teamNameAriaLabelTemplate', { id: team.id })}
                      />
                      <div className="flex justify-end sm:justify-start">
                        <button
                          type="button"
                          onClick={() => deleteTeam(team.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          aria-label={t('backOffice.main.removeTeamAriaLabelTemplate', { name: team.name })}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1" htmlFor={`${team.id}-contact`}>
                      {t('backOffice.main.emailContactsLabel')}
                    </label>
                    <textarea
                      id={`${team.id}-contact`}
                      value={teamContactDrafts[team.id] ?? formatTeamContacts(team, ', ')}
                      onChange={(event) =>
                        handleTeamContactsChange(index, team.id, event.target.value)
                      }
                      onBlur={() => handleTeamContactsBlur(team.id)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                      rows={2}
                      placeholder={t('backOffice.main.teamContactsPlaceholder')}
                    />
                    <p className="text-xs text-gray-500 mb-4">
                      {t('backOffice.main.separateAddressesHint')}
                    </p>

                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1" htmlFor={`${team.id}-expertise`}>
                      {t('backOffice.main.expertiseAreaLabel')}
                    </label>
                    <textarea
                      id={`${team.id}-expertise`}
                      value={team.expertise}
                      onChange={(event) => updateTeamField(index, 'expertise', event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                      rows={3}
                    />
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'complianceReview' && (
            <section id="backoffice-tabpanel-complianceReview" role="tabpanel" aria-labelledby="backoffice-tab-complianceReview" className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.main.complianceReviewModeTitle')}</h2>
                <p className="text-sm text-gray-600">
                  {t('backOffice.main.complianceReviewModeSubtitle')}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2" htmlFor="compliance-review-team">
                  {t('backOffice.main.complianceTeamToDisplayLabel')}
                </label>
                <select
                  id="compliance-review-team"
                  value={selectedComplianceReviewTeamId}
                  onChange={(event) => setSelectedComplianceReviewTeamId(event.target.value)}
                  className="w-full md:max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">{t('backOffice.main.selectTeamPlaceholder')}</option>
                  {visibleTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name || team.id}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <article className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.main.guidedQuestionnaireTitle')}</h3>

                  {complianceReviewCurrentQuestion ? (
                    <div className="space-y-5">
                      <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600" aria-live="polite">
                            {t('backOffice.main.questionOfTotalTemplate', { position: complianceReviewActiveQuestionIndex + 1, total: complianceReviewQuestionnaire.length })}
                          </span>
                          <span className="text-sm font-medium text-blue-600" aria-live="polite">
                            {t('backOffice.main.questionsRemainingTemplate', { count: Math.max(complianceReviewQuestionnaire.length - (complianceReviewActiveQuestionIndex + 1), 0) })}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={Math.round(((complianceReviewActiveQuestionIndex + 1) / complianceReviewQuestionnaire.length) * 100)} aria-valuemin={0} aria-valuemax={100}>
                          <span className="block bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((complianceReviewActiveQuestionIndex + 1) / complianceReviewQuestionnaire.length) * 100}%` }} />
                        </div>
                        {complianceReviewActiveQuestionIndex === 0 && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center">
                            <Info className="w-3 h-3 mr-1" />
                            {t('backOffice.main.someQuestionsMayAppearHint')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <p className="text-xl font-bold text-gray-800 sm:text-2xl">
                            {resolveLocalizedText(complianceReviewCurrentQuestion.question, language) || complianceReviewCurrentQuestion.id}
                          </p>
                          {complianceReviewGuidanceHasContent && (
                            <button
                              type="button"
                              onClick={() => setIsComplianceReviewGuidanceOpen((prev) => !prev)}
                              className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                            >
                              <Info className="w-4 h-4 mr-2" />
                              {isComplianceReviewGuidanceOpen ? t('backOffice.main.hideHelpButton') : t('backOffice.main.understandQuestionButton')}
                            </button>
                          )}
                        </div>

                        {isComplianceReviewGuidanceOpen && complianceReviewGuidanceHasContent && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 text-sm text-gray-700">
                            {complianceReviewGuidance.objective && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('backOffice.main.objectiveHeading')}</h4>
                                <p className="mt-1">{renderTextWithLinks(complianceReviewGuidance.objective)}</p>
                              </div>
                            )}
                            {complianceReviewGuidance.details && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('backOffice.main.detailsHeading')}</h4>
                                <p className="mt-1">{renderTextWithLinks(complianceReviewGuidance.details)}</p>
                              </div>
                            )}
                            {Array.isArray(complianceReviewGuidance.tips) && complianceReviewGuidance.tips.filter((tip) => typeof tip === 'string' && tip.trim().length > 0).length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('backOffice.main.practicalTipsHeading')}</h4>
                                <ul className="mt-1 list-disc pl-5 space-y-1">
                                  {complianceReviewGuidance.tips
                                    .filter((tip) => typeof tip === 'string' && tip.trim().length > 0)
                                    .map((tip, index) => (
                                      <li key={`${complianceReviewCurrentQuestion.id || 'question'}-tip-${index}`}>{renderTextWithLinks(tip)}</li>
                                    ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="rounded-lg border border-blue-100 p-3 space-y-3 bg-white/90">
                          {(() => {
                            const question = complianceReviewCurrentQuestion;
                            const answerValue = complianceReviewAnswers[question.id];
                            const visibleOptions = normalizeQuestionOptions(question, { language }).filter((option) => shouldShowOption(option, complianceReviewAnswers));
                            const choiceAnswerState = normalizeChoiceAnswer(answerValue);
                            const multiAnswerState = normalizeMultiChoiceAnswer(answerValue);
                            const rawExtraCheckbox = question.extraCheckbox || { enabled: false, label: '' };
                            const extraCheckbox = { ...rawExtraCheckbox, label: resolveLocalizedText(rawExtraCheckbox.label, language) };
                            const extraCheckboxId = buildExtraCheckboxQuestionId(question.id);
                            const showExtraCheckbox = extraCheckbox.enabled && extraCheckbox.label.trim();

                            if (question.type === 'text' || question.type === 'long_text') {
                              return (
                                <input
                                  type="text"
                                  value={toDisplayText(answerValue)}
                                  disabled
                                  readOnly
                                  placeholder={t('backOffice.main.freeTextNotEditableHint')}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                              );
                            }

                            if (question.type === 'choice') {
                              return (
                                <div className="space-y-3">
                                  {visibleOptions.map((option, index) => {
                                    const optionLabel = getQuestionOptionLabel(option);
                                    const optionValue = option.value || optionLabel;
                                    if (!optionLabel) {
                                      return null;
                                    }

                                    const optionId = `${question.id}-review-choice-${index}`;
                                    const subOptions = Array.isArray(option.subOptions)
                                      ? option.subOptions.filter((subOption) => shouldShowOption(subOption, complianceReviewAnswers))
                                      : [];
                                    const hasSubOptions = subOptions.length > 0;
                                    const isOtherOption = option.isOther === true;
                                    const isSelected = choiceAnswerState.value === optionValue;
                                    const childSelections = isSelected ? choiceAnswerState.children : [];
                                    const subType = option.subType === 'multi_choice' ? 'multi_choice' : 'choice';

                                    return (
                                      <div key={optionId} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                                        <label htmlFor={optionId} className="flex items-center gap-2 text-sm text-gray-700">
                                          <input
                                            id={optionId}
                                            type="radio"
                                            name={`review-choice-${question.id}`}
                                            checked={isSelected}
                                            onChange={() => {
                                              if (hasSubOptions || isOtherOption) {
                                                updateComplianceReviewAnswer(question.id, {
                                                  value: optionValue,
                                                  children: [],
                                                  otherText: ''
                                                });
                                                return;
                                              }
                                              updateComplianceReviewAnswer(question.id, optionValue);
                                            }}
                                            className="h-4 w-4 text-blue-600 border-gray-300"
                                          />
                                          <span>{optionLabel}</span>
                                        </label>

                                        {isSelected && isOtherOption && (
                                          <input
                                            type="text"
                                            value={choiceAnswerState.otherText}
                                            onChange={(event) =>
                                              updateComplianceReviewAnswer(question.id, {
                                                value: optionValue,
                                                children: [],
                                                otherText: event.target.value
                                              })
                                            }
                                            placeholder={t('backOffice.main.specifyYourAnswerPlaceholder')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                          />
                                        )}

                                        {isSelected && hasSubOptions && !isOtherOption && (
                                          <div className="space-y-2 pl-5">
                                            {subOptions.map((subOption, subIndex) => {
                                              const subLabel = getQuestionOptionLabel(subOption);
                                              const subValue = subOption.value || subLabel;
                                              if (!subLabel) {
                                                return null;
                                              }

                                              const subId = `${optionId}-sub-${subIndex}`;
                                              const isSubSelected = childSelections.includes(subValue);
                                              const isSubOtherOption = subOption.isOther === true;

                                              return (
                                                <div key={subId} className="space-y-1">
                                                  <label htmlFor={subId} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                      id={subId}
                                                      type={subType === 'multi_choice' ? 'checkbox' : 'radio'}
                                                      name={subType === 'multi_choice' ? subId : `${optionId}-sub-group`}
                                                      checked={isSubSelected}
                                                      onChange={(event) => {
                                                        const nextChildren = subType === 'multi_choice'
                                                          ? (event.target.checked
                                                            ? [...childSelections, subValue]
                                                            : childSelections.filter((entry) => entry !== subValue))
                                                          : [subValue];
                                                        const isOtherSelected = nextChildren.includes(subValue) && isSubOtherOption;
                                                        updateComplianceReviewAnswer(question.id, {
                                                          value: optionValue,
                                                          children: nextChildren,
                                                          otherText: isOtherSelected ? choiceAnswerState.childrenOtherText : ''
                                                        });
                                                      }}
                                                      className="h-4 w-4 text-blue-600 border-gray-300"
                                                    />
                                                    <span>{subLabel}</span>
                                                  </label>
                                                  {isSubSelected && isSubOtherOption && (
                                                    <input
                                                      type="text"
                                                      value={choiceAnswerState.childrenOtherText}
                                                      onChange={(event) =>
                                                        updateComplianceReviewAnswer(question.id, {
                                                          value: optionValue,
                                                          children: childSelections,
                                                          otherText: event.target.value,
                                                          childrenOtherText: event.target.value
                                                        })
                                                      }
                                                      placeholder={t('backOffice.main.specifyYourAnswerPlaceholder')}
                                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {showExtraCheckbox && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(complianceReviewAnswers[extraCheckboxId])}
                                        onChange={(event) => updateComplianceReviewAnswer(extraCheckboxId, event.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                      />
                                      <span>{extraCheckbox.label.trim()}</span>
                                    </label>
                                  )}
                                </div>
                              );
                            }

                            if (question.type === 'multi_choice') {
                              return (
                                <div className="space-y-3">
                                  {visibleOptions.map((option, index) => {
                                    const optionLabel = getQuestionOptionLabel(option);
                                    const optionValue = option.value || optionLabel;
                                    if (!optionLabel) {
                                      return null;
                                    }

                                    const optionId = `${question.id}-review-multi-${index}`;
                                    const isSelected = multiAnswerState.values.includes(optionValue);
                                    const isOtherOption = option.isOther === true;
                                    const subOptions = Array.isArray(option.subOptions)
                                      ? option.subOptions.filter((subOption) => shouldShowOption(subOption, complianceReviewAnswers))
                                      : [];
                                    const hasSubOptions = subOptions.length > 0;
                                    const subType = option.subType === 'multi_choice' ? 'multi_choice' : 'choice';
                                    const childSelections = Array.isArray(multiAnswerState.children[optionValue])
                                      ? multiAnswerState.children[optionValue]
                                      : [];
                                    const childOtherText = typeof multiAnswerState.childrenOtherText[optionValue] === 'string'
                                      ? multiAnswerState.childrenOtherText[optionValue]
                                      : '';

                                    return (
                                      <div key={optionId} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                                        <label htmlFor={optionId} className="flex items-center gap-2 text-sm text-gray-700">
                                          <input
                                            id={optionId}
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(event) => {
                                              const nextValues = event.target.checked
                                                ? [...multiAnswerState.values, optionValue]
                                                : multiAnswerState.values.filter((entry) => entry !== optionValue);
                                              const nextChildren = { ...multiAnswerState.children };
                                              const nextChildrenOtherText = { ...multiAnswerState.childrenOtherText };
                                              if (!event.target.checked) {
                                                delete nextChildren[optionValue];
                                                delete nextChildrenOtherText[optionValue];
                                              }

                                              const nextOtherText = option.isOther && !event.target.checked
                                                ? ''
                                                : multiAnswerState.otherText;

                                              updateComplianceReviewAnswer(
                                                question.id,
                                                buildMultiChoiceAnswerPayload(nextValues, nextChildren, nextOtherText, nextChildrenOtherText)
                                              );
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                          />
                                          <span>{optionLabel}</span>
                                        </label>

                                        {isSelected && isOtherOption && (
                                          <input
                                            type="text"
                                            value={multiAnswerState.otherText}
                                            onChange={(event) =>
                                              updateComplianceReviewAnswer(
                                                question.id,
                                                buildMultiChoiceAnswerPayload(
                                                  multiAnswerState.values,
                                                  multiAnswerState.children,
                                                  event.target.value,
                                                  multiAnswerState.childrenOtherText
                                                )
                                              )
                                            }
                                            placeholder={t('backOffice.main.specifyYourAnswerPlaceholder')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                          />
                                        )}

                                        {isSelected && hasSubOptions && !isOtherOption && (
                                          <div className="space-y-2 pl-5">
                                            {subOptions.map((subOption, subIndex) => {
                                              const subLabel = getQuestionOptionLabel(subOption);
                                              const subValue = subOption.value || subLabel;
                                              if (!subLabel) {
                                                return null;
                                              }

                                              const subId = `${optionId}-sub-${subIndex}`;
                                              const isSubSelected = childSelections.includes(subValue);
                                              const isSubOtherOption = subOption.isOther === true;

                                              return (
                                                <div key={subId} className="space-y-1">
                                                  <label htmlFor={subId} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                      id={subId}
                                                      type={subType === 'multi_choice' ? 'checkbox' : 'radio'}
                                                      name={subType === 'multi_choice' ? subId : `${optionId}-sub-group`}
                                                      checked={isSubSelected}
                                                      onChange={(event) => {
                                                        const nextChildren = subType === 'multi_choice'
                                                          ? (event.target.checked
                                                            ? [...childSelections, subValue]
                                                            : childSelections.filter((entry) => entry !== subValue))
                                                          : [subValue];
                                                        const nextChildrenMap = {
                                                          ...multiAnswerState.children,
                                                          [optionValue]: nextChildren
                                                        };
                                                        const nextChildrenOtherText = { ...multiAnswerState.childrenOtherText };
                                                        if (!(isSubOtherOption && nextChildren.includes(subValue))) {
                                                          delete nextChildrenOtherText[optionValue];
                                                        }

                                                        updateComplianceReviewAnswer(
                                                          question.id,
                                                          buildMultiChoiceAnswerPayload(
                                                            multiAnswerState.values,
                                                            nextChildrenMap,
                                                            multiAnswerState.otherText,
                                                            nextChildrenOtherText
                                                          )
                                                        );
                                                      }}
                                                      className="h-4 w-4 text-blue-600 border-gray-300"
                                                    />
                                                    <span>{subLabel}</span>
                                                  </label>

                                                  {isSubSelected && isSubOtherOption && (
                                                    <input
                                                      type="text"
                                                      value={childOtherText}
                                                      onChange={(event) => {
                                                        updateComplianceReviewAnswer(
                                                          question.id,
                                                          buildMultiChoiceAnswerPayload(
                                                            multiAnswerState.values,
                                                            {
                                                              ...multiAnswerState.children,
                                                              [optionValue]: childSelections
                                                            },
                                                            multiAnswerState.otherText,
                                                            {
                                                              ...multiAnswerState.childrenOtherText,
                                                              [optionValue]: event.target.value
                                                            }
                                                          )
                                                        );
                                                      }}
                                                      placeholder={t('backOffice.main.specifyYourAnswerPlaceholder')}
                                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {showExtraCheckbox && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(complianceReviewAnswers[extraCheckboxId])}
                                        onChange={(event) => updateComplianceReviewAnswer(extraCheckboxId, event.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                      />
                                      <span>{extraCheckbox.label.trim()}</span>
                                    </label>
                                  )}
                                </div>
                              );
                            }

                            if (question.type === 'date') {
                              return (
                                <input
                                  type="date"
                                  value={typeof answerValue === 'string' ? answerValue : ''}
                                  onChange={(event) => updateComplianceReviewAnswer(question.id, event.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              );
                            }

                            if (question.type === 'number') {
                              return (
                                <input
                                  type="number"
                                  value={typeof answerValue === 'number' || typeof answerValue === 'string' ? answerValue : ''}
                                  onChange={(event) => updateComplianceReviewAnswer(question.id, event.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              );
                            }

                            if (question.type === 'url' || question.type === 'file' || question.type === 'milestone_list') {
                              return (
                                <input
                                  type="text"
                                  value={toDisplayText(answerValue)}
                                  onChange={(event) => updateComplianceReviewAnswer(question.id, event.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder={t('backOffice.main.demoAnswerPlaceholder')}
                                />
                              );
                            }

                            return <p className="text-sm text-gray-500">{t('backOffice.main.unsupportedQuestionType')}</p>;
                          })()}
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <button
                            type="button"
                            onClick={handleComplianceReviewResetQuestionnaire}
                            disabled={Object.keys(complianceReviewAnswers).length === 0 && complianceReviewActiveQuestionIndex === 0}
                            className="flex items-center justify-center px-4 py-2 rounded-lg font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {t('backOffice.main.resetButton')}
                          </button>

                          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end lg:flex-1">
                            <button
                              type="button"
                              onClick={handleComplianceReviewPreviousQuestion}
                              disabled={complianceReviewActiveQuestionIndex <= 0}
                              className="flex items-center justify-center px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              {t('backOffice.main.previousButton')}
                            </button>
                            <button
                              type="button"
                              onClick={handleComplianceReviewNextQuestion}
                              disabled={complianceReviewActiveQuestionIndex >= complianceReviewQuestionnaire.length - 1}
                              className="flex items-center justify-center px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {t('backOffice.main.nextButton')}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('backOffice.main.noQuestionAvailableDemo')}</p>
                  )}
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.main.analysisForTeamTemplate', { team: selectedComplianceReviewTeam?.name || t('backOffice.main.selectedTeamFallback') })}</h3>
                    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-50 p-1" role="group" aria-label={t('backOffice.main.complianceAnalysisModeAriaLabel')}>
                      <button
                        type="button"
                        onClick={() => setComplianceReviewDisplayMode('direct')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          complianceReviewDisplayMode === 'direct'
                            ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        aria-pressed={complianceReviewDisplayMode === 'direct'}
                      >
                        {t('backOffice.main.directModeButton')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setComplianceReviewDisplayMode('cumulative')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          complianceReviewDisplayMode === 'cumulative'
                            ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        aria-pressed={complianceReviewDisplayMode === 'cumulative'}
                      >
                        {t('backOffice.main.cumulativeModeButton')}
                      </button>
                    </div>
                  </div>

                  {!complianceReviewEffectiveActiveQuestionId && (
                    <p className="text-sm text-gray-500">
                      {t('backOffice.main.selectOptionToDisplayHint')}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">{t('backOffice.main.triggersHeadingTemplate', { count: complianceReviewTriggeredRules.length })}</h4>
                      {complianceReviewTriggeredRules.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('backOffice.main.noTriggerForTeam')}</p>
                      ) : (
                        <ul className="mt-1 space-y-1 list-disc pl-5 text-sm text-gray-700">
                          {complianceReviewTriggeredRules.map((rule) => (
                            <li key={rule.id}>{resolveLocalizedText(rule.name, language) || rule.id}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">{t('backOffice.main.complianceQuestionsHeadingTemplate', { count: complianceReviewTeamQuestions.length })}</h4>
                      {complianceReviewTeamQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('backOffice.main.noComplianceQuestionTriggered')}</p>
                      ) : (
                        <ul className="mt-1 space-y-1 list-disc pl-5 text-sm text-gray-700">
                          {complianceReviewTeamQuestions.map((entry, index) => {
                            const entryText = resolveLocalizedText(entry?.text, language);
                            return (
                              <li key={`${entryText || 'question'}-${index}`}>{renderTextWithLinks(entryText || t('backOffice.main.questionNotProvidedFallback'))}</li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">{t('backOffice.main.identifiedRisksHeading')} ({complianceReviewTeamRisks.length})</h4>
                      {complianceReviewTeamRisks.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('backOffice.main.noRiskIdentifiedForTeam')}</p>
                      ) : (
                        <ul className="mt-1 space-y-2">
                          {complianceReviewTeamRisks.map((risk, index) => (
                            <li key={`${risk?.id || 'risk'}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                              <p className="font-semibold">{renderTextWithLinks(resolveLocalizedText(risk?.description, language) || t('backOffice.main.riskNotProvidedFallback'))}</p>
                              <p className="text-xs mt-1">{t('backOffice.main.levelPriorityTemplate', { level: risk?.level ? getRiskLevelLabel(t, risk.level) : t('backOffice.main.naFallback'), priority: risk?.priority ? getRiskPriorityLabel(t, risk.priority) : t('backOffice.main.naFallback') })}</p>
                              <p className="text-xs mt-1 text-amber-800">{t('backOffice.main.detailColonTemplate', { value: resolveLocalizedText(risk?.mitigation, language) || t('backOffice.main.noDetailProvided') })}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}
        </div>

        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion}
            onSave={saveQuestion}
            onCancel={() => setEditingQuestion(null)}
            allQuestions={questions}
          />
        )}

        {editingRule && (
          <RuleEditor
            rule={editingRule}
            onSave={saveRule}
            onCancel={() => setEditingRule(null)}
            questions={questions}
            teams={teams}
          />
        )}
      </div>
    </div>
  );
};
