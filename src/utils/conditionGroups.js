export const sanitizeCondition = (condition = {}) => {
  return {
    question: condition.question || '',
    operator: condition.operator || 'equals',
    value: condition.value ?? ''
  };
};

export const sanitizeConditionGroup = (group = {}, conditionSanitizer = sanitizeCondition) => {
  const logic = group.logic === 'any' ? 'any' : 'all';
  const conditions = Array.isArray(group.conditions)
    ? group.conditions.map(conditionSanitizer)
    : [];

  return {
    logic,
    conditions
  };
};

export const normalizeConditionGroups = (entity = {}, conditionSanitizer = sanitizeCondition) => {
  const rawGroups = Array.isArray(entity.conditionGroups) ? entity.conditionGroups : null;

  if (rawGroups && rawGroups.length > 0) {
    return rawGroups.map(group => sanitizeConditionGroup(group, conditionSanitizer));
  }

  const fallbackConditions = Array.isArray(entity.conditions) ? entity.conditions : [];
  if (fallbackConditions.length === 0) {
    return [];
  }

  return [
    sanitizeConditionGroup({
      logic: entity.conditionLogic === 'any' ? 'any' : 'all',
      conditions: fallbackConditions
    }, conditionSanitizer)
  ];
};

export const applyConditionGroups = (entity = {}, groups = [], conditionSanitizer = sanitizeCondition) => {
  const sanitizedGroups = Array.isArray(groups)
    ? groups.map(group => sanitizeConditionGroup(group, conditionSanitizer))
    : [];

  const hasSingleGroup = sanitizedGroups.length === 1;
  const legacyConditions = hasSingleGroup ? sanitizedGroups[0].conditions : [];
  const legacyLogic = hasSingleGroup ? sanitizedGroups[0].logic : 'all';

  return {
    ...entity,
    conditionGroups: sanitizedGroups,
    conditions: legacyConditions,
    conditionLogic: legacyLogic
  };
};
