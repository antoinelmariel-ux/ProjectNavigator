import { applyConditionGroups, normalizeConditionGroups } from './conditionGroups.js';
import { formatRankingAnswer } from './ranking.js';
import { DEFAULT_LANGUAGE, getLocaleTag } from '../i18n/languages.js';
import { resolveLocalizedText, isLocalizedValueEmpty } from './localizedContent.js';
import {
  ACTIVITY_SCOPE_CONDITION_LABEL,
  ACTIVITY_SCOPE_LABELS,
  ACTIVITY_SCOPE_VALUES
} from './activityScope.js';

const EXTRA_CHECKBOX_SUFFIX = '__extra_checkbox';

// Pseudo-question technique : le périmètre d'activité choisi dans le profil n'est pas une
// vraie question du questionnaire, mais doit rester sélectionnable comme condition au même
// titre qu'une question (cf. getConditionQuestionEntries ci-dessous).
export const ACTIVITY_SCOPE_QUESTION_ID = '__activity_scope__';

// Injecte le périmètre d'activité de la personne connectée dans un objet de réponses, sans
// jamais le persister dans les réponses réelles d'un projet (donnée du profil, pas du projet).
export const withActivityScope = (answers, activityScope) => ({
  ...answers,
  [ACTIVITY_SCOPE_QUESTION_ID]: Array.isArray(activityScope) ? activityScope : []
});

export const buildExtraCheckboxQuestionId = (questionId) => {
  if (!questionId || typeof questionId !== 'string') {
    return '';
  }

  return `${questionId}${EXTRA_CHECKBOX_SUFFIX}`;
};
export const getConditionQuestionEntries = (questions = [], language = DEFAULT_LANGUAGE) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  const entries = [...questions];

  questions.forEach((question) => {
    if (!question || !question.id) {
      return;
    }

    const extraCheckbox = question.extraCheckbox;
    const label = resolveLocalizedText(extraCheckbox?.label, language).trim();
    const enabled = Boolean(extraCheckbox?.enabled);

    if (!enabled || label.length === 0) {
      return;
    }

    const questionLabel = resolveLocalizedText(question.question, language) || question.id;

    entries.push({
      id: buildExtraCheckboxQuestionId(question.id),
      question: `${questionLabel} · Case à cocher : ${label}`,
      type: 'boolean'
    });
  });

  entries.push({
    id: ACTIVITY_SCOPE_QUESTION_ID,
    question: ACTIVITY_SCOPE_CONDITION_LABEL,
    type: 'multi_choice',
    options: ACTIVITY_SCOPE_VALUES.map((value) => ({ value, label: ACTIVITY_SCOPE_LABELS[value] }))
  });

  return entries;
};

const normalizeAnswerForComparison = (answer) => {
  if (Array.isArray(answer)) {
    return answer;
  }

  if (answer && typeof answer === 'object') {
    if (Array.isArray(answer.values)) {
      const childEntries = answer.children && typeof answer.children === 'object'
        ? Object.values(answer.children)
        : [];
      const flattenedChildren = childEntries.reduce((acc, values) => {
        if (Array.isArray(values)) {
          acc.push(...values);
        }
        return acc;
      }, []);
      return [...answer.values, ...flattenedChildren];
    }
    if (typeof answer.value !== 'undefined') {
      const children = Array.isArray(answer.children) ? answer.children : [];
      if (children.length > 0) {
        return [answer.value, ...children];
      }
      return answer.value;
    }

    if (typeof answer.name !== 'undefined') {
      return answer.name;
    }
  }

  return answer;
};

export const normalizeConditionValueForAnswer = (answer, expected) => {
  if (typeof answer === 'boolean') {
    if (expected === true || expected === 'true') {
      return true;
    }
    if (expected === false || expected === 'false') {
      return false;
    }
  }

  return expected;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const evaluateQuestionCondition = (condition, answers) => {
  const rawAnswer = answers[condition.question];
  if (Array.isArray(rawAnswer) && rawAnswer.length === 0) return false;
  if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') return false;

  const answer = normalizeAnswerForComparison(rawAnswer);
  const normalizedExpected = normalizeConditionValueForAnswer(
    Array.isArray(answer) ? answer[0] : answer,
    condition.value
  );

  switch (condition.operator) {
    case 'equals':
      if (Array.isArray(answer)) {
        return answer.includes(normalizedExpected);
      }
      return answer === normalizedExpected;
    case 'not_equals':
      if (Array.isArray(answer)) {
        return !answer.includes(normalizedExpected);
      }
      return answer !== normalizedExpected;
    case 'contains':
      if (Array.isArray(answer)) {
        return answer.includes(normalizedExpected);
      }
      if (typeof answer === 'string') {
        return answer.includes(normalizedExpected);
      }
      return false;
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      if (Array.isArray(answer)) {
        return false;
      }

      const answerNumber = toNumber(answer);
      const expectedNumber = toNumber(condition.value);

      if (answerNumber === null || expectedNumber === null) {
        return false;
      }

      switch (condition.operator) {
        case 'lt':
          return answerNumber < expectedNumber;
        case 'lte':
          return answerNumber <= expectedNumber;
        case 'gt':
          return answerNumber > expectedNumber;
        case 'gte':
          return answerNumber >= expectedNumber;
        default:
          return false;
      }
    }
    default:
      return false;
  }
};

const evaluateConditionGroups = (conditionGroups, answers) => {
  if (conditionGroups.length === 0) {
    return true;
  }

  return conditionGroups.every((group) => {
    const groupConditions = Array.isArray(group.conditions) ? group.conditions : [];
    if (groupConditions.length === 0) {
      return true;
    }

    const logic = group.logic === 'any' ? 'any' : 'all';

    if (logic === 'any') {
      return groupConditions.some(condition => evaluateQuestionCondition(condition, answers));
    }

    return groupConditions.every(condition => evaluateQuestionCondition(condition, answers));
  });
};

export const shouldShowQuestion = (question, answers) => {
  const conditionGroups = normalizeConditionGroups(question);
  return evaluateConditionGroups(conditionGroups, answers);
};

const normalizeQuestionOption = (option, language = DEFAULT_LANGUAGE) => {
  const baseOption =
    option && typeof option === 'object' && !Array.isArray(option) ? { ...option } : { label: option };
  const rawLabel = baseOption.label ?? baseOption.value;
  const label = resolveLocalizedText(rawLabel, language);
  const rawValue = baseOption.value ?? baseOption.id ?? rawLabel;
  const value = typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean'
    ? String(rawValue)
    : resolveLocalizedText(rawValue, language);
  const rawVisibility = baseOption.visibility;
  const visibility = rawVisibility === 'conditional' || rawVisibility === 'disabled' ? rawVisibility : 'always';
  const conditionGroups = normalizeConditionGroups(baseOption);
  const rawSubType = baseOption.subType;
  const subType = rawSubType === 'multi_choice' || rawSubType === 'choice' ? rawSubType : null;
  const rawSubOptions = Array.isArray(baseOption.subOptions) ? baseOption.subOptions : [];

  return applyConditionGroups(
    {
      ...baseOption,
      value,
      label,
      visibility,
      subType,
      subOptions: rawSubOptions
        .map((subOption) => normalizeQuestionOption(subOption, language))
        .filter(optionEntry => optionEntry.label && optionEntry.label.trim() !== '')
    },
    conditionGroups
  );
};

// Variante de normalizeQuestionOption pour le back-office : garde `label` tel quel
// (chaîne simple ou objet {en, fr, de, es}) au lieu de le résoudre dans une langue,
// pour que l'éditeur multilingue puisse lire/écrire chaque langue séparément.
const normalizeQuestionOptionForEditing = (option) => {
  const baseOption =
    option && typeof option === 'object' && !Array.isArray(option) ? { ...option } : { label: option };
  const rawLabel = baseOption.label ?? baseOption.value;
  const label = typeof rawLabel === 'string' || (rawLabel && typeof rawLabel === 'object') ? rawLabel : '';
  const rawValue = baseOption.value ?? baseOption.id ?? rawLabel;
  const value = typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean'
    ? String(rawValue)
    : resolveLocalizedText(rawValue, DEFAULT_LANGUAGE);
  const rawVisibility = baseOption.visibility;
  const visibility = rawVisibility === 'conditional' || rawVisibility === 'disabled' ? rawVisibility : 'always';
  const conditionGroups = normalizeConditionGroups(baseOption);
  const rawSubType = baseOption.subType;
  const subType = rawSubType === 'multi_choice' || rawSubType === 'choice' ? rawSubType : null;
  const rawSubOptions = Array.isArray(baseOption.subOptions) ? baseOption.subOptions : [];

  return applyConditionGroups(
    {
      ...baseOption,
      value,
      label,
      visibility,
      subType,
      subOptions: rawSubOptions
        .map((subOption) => normalizeQuestionOptionForEditing(subOption))
        .filter(optionEntry => !isLocalizedValueEmpty(optionEntry.label))
    },
    conditionGroups
  );
};

export const normalizeQuestionOptionsForEditing = (questionOrOptions) => {
  const options = Array.isArray(questionOrOptions?.options)
    ? questionOrOptions.options
    : Array.isArray(questionOrOptions)
      ? questionOrOptions
      : [];

  return options
    .map((option) => normalizeQuestionOptionForEditing(option))
    .filter(option => !isLocalizedValueEmpty(option.label));
};

export const normalizeOtherOption = (config, language = DEFAULT_LANGUAGE) => {
  if (!config || typeof config !== 'object') {
    return { enabled: false, label: 'Autre', placeholder: '' };
  }

  return {
    enabled: Boolean(config.enabled),
    label: resolveLocalizedText(config.label, language) || 'Autre',
    placeholder: resolveLocalizedText(config.placeholder, language)
  };
};

// Variante de normalizeOtherOption pour le back-office : garde `label`/`placeholder`
// tels quels (chaîne simple ou objet {en, fr, de, es}) pour l'éditeur multilingue.
export const normalizeOtherOptionForEditing = (config) => {
  if (!config || typeof config !== 'object') {
    return { enabled: false, label: '', placeholder: '', value: '' };
  }

  return {
    enabled: Boolean(config.enabled),
    label: typeof config.label === 'string' || (config.label && typeof config.label === 'object') ? config.label : '',
    placeholder: typeof config.placeholder === 'string' || (config.placeholder && typeof config.placeholder === 'object') ? config.placeholder : '',
    value: typeof config.value === 'string' ? config.value : ''
  };
};

export const normalizeQuestionOptions = (questionOrOptions, { includeOther = true, language = DEFAULT_LANGUAGE } = {}) => {
  const options = Array.isArray(questionOrOptions?.options)
    ? questionOrOptions.options
    : Array.isArray(questionOrOptions)
      ? questionOrOptions
      : [];

  const normalizedOptions = options
    .map((option) => normalizeQuestionOption(option, language))
    .filter(option => option.label && option.label.trim() !== '');

  if (!includeOther) {
    return normalizedOptions;
  }

  const otherOption = normalizeOtherOption(questionOrOptions?.otherOption, language);
  const otherLabel = typeof otherOption.label === 'string' ? otherOption.label.trim() : '';

  if (otherOption.enabled && otherLabel.length > 0) {
    normalizedOptions.push({
      ...normalizeQuestionOption({ label: otherLabel, value: questionOrOptions?.otherOption?.value }, language),
      isOther: true
    });
  }

  return normalizedOptions;
};

export const getQuestionOptionLabels = (questionOrOptions, { includeChildren = true, language = DEFAULT_LANGUAGE } = {}) => {
  const normalizedOptions = normalizeQuestionOptions(questionOrOptions, { language });
  const labels = [];

  normalizedOptions.forEach((option) => {
    if (option.label) {
      labels.push(option.label);
    }

    if (!includeChildren || !Array.isArray(option.subOptions)) {
      return;
    }

    option.subOptions.forEach((subOption) => {
      if (subOption && subOption.label) {
        labels.push(subOption.label);
      }
    });
  });

  return labels;
};

export const getQuestionOptionEntries = (questionOrOptions, { includeChildren = true, language = DEFAULT_LANGUAGE } = {}) => {
  const normalizedOptions = normalizeQuestionOptions(questionOrOptions, { language });
  const entries = [];

  normalizedOptions.forEach((option) => {
    if (option?.value) {
      entries.push({
        value: String(option.value),
        label: option?.label ? String(option.label) : String(option.value)
      });
    }

    if (!includeChildren || !Array.isArray(option.subOptions)) {
      return;
    }

    option.subOptions.forEach((subOption) => {
      if (subOption?.value) {
        entries.push({
          value: String(subOption.value),
          label: subOption?.label ? String(subOption.label) : String(subOption.value)
        });
      }
    });
  });

  return entries;
};

const resolveOptionLabelFromQuestion = (question, value, language = DEFAULT_LANGUAGE) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  const entries = getQuestionOptionEntries(question, { language });
  const matchByValue = entries.find((entry) => entry.value === stringValue);
  if (matchByValue) {
    return matchByValue.label;
  }

  const matchByLabel = entries.find((entry) => entry.label === stringValue);
  if (matchByLabel) {
    return matchByLabel.label;
  }

  return stringValue;
};

const getOtherSubOptionLabel = (question, parentValueOrLabel, language = DEFAULT_LANGUAGE) => {
  if (!question || !parentValueOrLabel) {
    return '';
  }

  const options = normalizeQuestionOptions(question, { includeOther: false, language });
  const normalizedParent = String(parentValueOrLabel);
  const parentOption = options.find(option => option.value === normalizedParent || option.label === normalizedParent);

  if (!parentOption || !Array.isArray(parentOption.subOptions)) {
    return '';
  }

  const otherSubOption = parentOption.subOptions.find(subOption => subOption?.isOther);
  return typeof otherSubOption?.label === 'string' ? otherSubOption.label : '';
};

export const shouldShowOption = (option, answers) => {
  const normalized = normalizeQuestionOption(option);

  if (normalized.visibility === 'disabled') {
    return false;
  }

  if (normalized.visibility !== 'conditional') {
    return true;
  }

  const conditionGroups = Array.isArray(normalized.conditionGroups) ? normalized.conditionGroups : [];
  return evaluateConditionGroups(conditionGroups, answers);
};

export const formatAnswer = (question, answer, language = DEFAULT_LANGUAGE) => {
  if (answer === null || answer === undefined) {
    return '';
  }

  const questionType = (question && question.type) || 'choice';
  const localeTag = getLocaleTag(language);

  if (questionType === 'date') {
    const parsed = new Date(answer);
    if (Number.isNaN(parsed.getTime())) {
      return String(answer);
    }

    return new Intl.DateTimeFormat(localeTag, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(parsed);
  }

  if (questionType === 'milestone_list') {
    const entries = Array.isArray(answer) ? answer : [];

    const formattedEntries = entries
      .map(item => {
        const rawDate = typeof item?.date === 'string' ? item.date.trim() : '';
        const rawDescription = typeof item?.description === 'string' ? item.description.trim() : '';

        if (!rawDate && !rawDescription) {
          return null;
        }

        let formattedDate = '';

        if (rawDate) {
          const parsed = new Date(rawDate);
          formattedDate = Number.isNaN(parsed.getTime())
            ? rawDate
            : new Intl.DateTimeFormat(localeTag, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }).format(parsed);
        }

        if (formattedDate && rawDescription) {
          return `${formattedDate} — ${rawDescription}`;
        }

        return formattedDate || rawDescription;
      })
      .filter(Boolean);

    return formattedEntries.join('\n');
  }

  if (questionType === 'multi_choice' && Array.isArray(answer)) {
    return answer.map((value) => resolveOptionLabelFromQuestion(question, value, language)).join(', ');
  }

  if (questionType === 'choice' && answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const value = typeof answer.value !== 'undefined' ? answer.value : answer.name;
    const label = resolveOptionLabelFromQuestion(question, value, language);
    const children = Array.isArray(answer.children) ? answer.children : [];
    const otherText = typeof answer.otherText === 'string' ? answer.otherText.trim() : '';
    const childrenOtherText = typeof answer.childrenOtherText === 'string'
      ? answer.childrenOtherText.trim()
      : '';
    if (children.length === 0) {
      if (otherText) {
        return `${label} (${otherText})`;
      }
      return label;
    }
    const otherChildLabel = childrenOtherText ? getOtherSubOptionLabel(question, value, language) : '';
    const formattedChildren = children
      .map((item) => {
        const childLabel = String(item);
        const resolvedChildLabel = resolveOptionLabelFromQuestion(question, childLabel, language);
        if (childrenOtherText && otherChildLabel && childLabel === otherChildLabel) {
          return `${resolvedChildLabel} (${childrenOtherText})`;
        }
        return resolvedChildLabel;
      })
      .join(', ');
    if (otherText) {
      return `${label} (${formattedChildren} · ${otherText})`;
    }
    return `${label} (${formattedChildren})`;
  }

  if (questionType === 'multi_choice' && answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const values = Array.isArray(answer.values) ? answer.values : [];
    const children = answer.children && typeof answer.children === 'object' ? answer.children : {};
    const otherText = typeof answer.otherText === 'string' ? answer.otherText.trim() : '';
    const childrenOtherText = answer.childrenOtherText && typeof answer.childrenOtherText === 'object'
      ? answer.childrenOtherText
      : {};
    if (values.length === 0) {
      return '';
    }
    const otherOptionValue = normalizeQuestionOptions(question, { language }).find((option) => option.isOther)?.value || '';
    return values
      .map((value) => {
        const label = resolveOptionLabelFromQuestion(question, value, language);
        const optionValue = value == null ? '' : String(value);
        const childValues = Array.isArray(children[optionValue]) ? children[optionValue] : [];
        const childOtherText = typeof childrenOtherText[optionValue] === 'string'
          ? childrenOtherText[optionValue].trim()
          : '';
        const otherChildLabel = childOtherText ? getOtherSubOptionLabel(question, optionValue, language) : '';
        if (childValues.length === 0) {
          if (otherText && otherOptionValue && optionValue === otherOptionValue) {
            return `${label} (${otherText})`;
          }
          return label;
        }
        const formattedChildren = childValues
          .map((item) => {
            const childLabel = String(item);
            const resolvedChildLabel = resolveOptionLabelFromQuestion(question, childLabel, language);
            if (childOtherText && otherChildLabel && childLabel === otherChildLabel) {
              return `${resolvedChildLabel} (${childOtherText})`;
            }
            return resolvedChildLabel;
          })
          .join(', ');
        if (otherText && otherOptionValue && optionValue === otherOptionValue) {
          return `${label} (${formattedChildren} · ${otherText})`;
        }
        return `${label} (${formattedChildren})`;
      })
      .filter(Boolean)
      .join(', ');
  }

  if (questionType === 'ranking') {
    const criteria = Array.isArray(question?.rankingConfig?.criteria)
      ? question.rankingConfig.criteria
      : [];
    return formatRankingAnswer(answer, criteria, language);
  }

  if (questionType === 'file' && answer && typeof answer === 'object') {
    const size = typeof answer.size === 'number' ? ` (${Math.round(answer.size / 1024)} Ko)` : '';
    return `${answer.name || 'Fichier joint'}${size}`;
  }

  return Array.isArray(answer) ? answer.join(', ') : String(answer);
};

export { normalizeAnswerForComparison };
