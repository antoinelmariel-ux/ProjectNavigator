import { buildExtraCheckboxQuestionId } from './questions.js';

const PROJECT_TYPE_QUESTION_ID = 'ProjectType';

const BLOCKED_PROJECT_TYPES = new Set([
  'projet_d_un_tiers_soutenu_par_le_lfb',
  'don_bourse_appel_a_projets',
  'advisory_board_non_relie_a_un_projet'
]);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const extractAnswerValues = (answer) => {
  if (Array.isArray(answer)) {
    return answer.map(normalizeString).filter(Boolean);
  }

  if (answer && typeof answer === 'object') {
    if (Array.isArray(answer.values)) {
      return answer.values.map(normalizeString).filter(Boolean);
    }

    if (typeof answer.value === 'string') {
      return [normalizeString(answer.value)].filter(Boolean);
    }
  }

  if (typeof answer === 'string') {
    return [normalizeString(answer)].filter(Boolean);
  }

  return [];
};

export const isShowcaseAccessBlockedByProjectType = (answers = {}) => {
  const projectTypeAnswer = answers?.[PROJECT_TYPE_QUESTION_ID];
  const selectedValues = extractAnswerValues(projectTypeAnswer);

  if (selectedValues.some((value) => BLOCKED_PROJECT_TYPES.has(value))) {
    return true;
  }

  return Boolean(answers?.[buildExtraCheckboxQuestionId(PROJECT_TYPE_QUESTION_ID)]);
};

export const normalizeThemeActivation = (theme) => {
  const activation = theme?.activation && typeof theme.activation === 'object' ? theme.activation : {};
  return {
    questionId: normalizeString(activation.questionId),
    optionLabel: normalizeString(activation.optionLabel)
  };
};

export const getShowcaseThemeActivationConflicts = (themes = []) => {
  const conflictsMap = new Map();

  themes.forEach((theme, index) => {
    const activation = normalizeThemeActivation(theme);
    if (!activation.questionId || !activation.optionLabel) {
      return;
    }

    const key = `${activation.questionId}::${activation.optionLabel}`;
    const current = conflictsMap.get(key) || [];
    current.push({
      id: theme?.id || `theme-${index + 1}`,
      label: normalizeString(theme?.label) || `Thème ${index + 1}`,
      questionId: activation.questionId,
      optionLabel: activation.optionLabel
    });
    conflictsMap.set(key, current);
  });

  return Array.from(conflictsMap.values()).filter((entries) => entries.length > 1);
};

export const resolveThemeFromActivation = (themes = [], answers = {}) => {
  const matched = themes.filter((theme) => {
    const activation = normalizeThemeActivation(theme);
    if (!activation.questionId || !activation.optionLabel) {
      return false;
    }

    const selectedValues = extractAnswerValues(answers?.[activation.questionId]);
    return selectedValues.includes(activation.optionLabel);
  });

  return matched[0] || null;
};
