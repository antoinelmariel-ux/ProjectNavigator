import { applyConditionGroups, normalizeConditionGroups } from './conditionGroups.js';

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const sanitizeRuleCondition = (condition = {}) => {
  const type = condition.type === 'timing' ? 'timing' : 'question';

  if (type === 'timing') {
    return {
      type: 'timing',
      startQuestion: condition.startQuestion || '',
      endQuestion: condition.endQuestion || '',
      minimumWeeks: toNumber(condition.minimumWeeks),
      maximumWeeks: toNumber(condition.maximumWeeks),
      minimumDays: toNumber(condition.minimumDays),
      maximumDays: toNumber(condition.maximumDays)
    };
  }

  return {
    type: 'question',
    question: condition.question || '',
    operator: condition.operator || 'equals',
    value: condition.value ?? ''
  };
};

export const normalizeRuleConditionGroups = (entity = {}) => {
  return normalizeConditionGroups(entity, sanitizeRuleCondition);
};

export const applyRuleConditionGroups = (entity = {}, groups = []) => {
  return applyConditionGroups(entity, groups, sanitizeRuleCondition);
};

export const createEmptyQuestionCondition = () => {
  return sanitizeRuleCondition({
    type: 'question',
    question: '',
    operator: 'equals',
    value: ''
  });
};

export const createEmptyTimingCondition = () => {
  return sanitizeRuleCondition({
    type: 'timing',
    startQuestion: '',
    endQuestion: '',
    minimumWeeks: undefined,
    maximumWeeks: undefined,
    minimumDays: undefined,
    maximumDays: undefined
  });
};
