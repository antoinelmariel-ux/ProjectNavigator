import { normalizeConditionGroups } from './conditionGroups.js';
import { sanitizeRuleCondition } from './ruleConditions.js';
import { isUnknownAnswer } from './unknownAnswer.js';

// Contrepartie indispensable de « je ne sais pas encore » : une réponse incertaine qui
// conditionne une règle veut dire que l'analyse affichée peut changer. On ne peut ni
// déclencher la règle (on ne sait pas), ni se taire (le porteur croirait son périmètre
// stabilisé) — donc on le dit, des deux côtés.
export const getUncertainRuleCoverage = (answers = {}, rules = [], questions = []) => {
  if (!answers || typeof answers !== 'object') {
    return [];
  }

  const uncertainIds = Object.keys(answers).filter((questionId) => isUnknownAnswer(answers[questionId]));
  if (uncertainIds.length === 0) {
    return [];
  }

  const questionById = new Map(
    (Array.isArray(questions) ? questions : [])
      .filter((question) => question && question.id)
      .map((question) => [question.id, question])
  );

  const impacted = new Map(uncertainIds.map((questionId) => [questionId, new Set()]));

  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    if (!rule || rule.isDraft) {
      return;
    }

    normalizeConditionGroups(rule, sanitizeRuleCondition).forEach((group) => {
      (Array.isArray(group?.conditions) ? group.conditions : []).forEach((condition) => {
        const bucket = impacted.get(condition?.question);
        if (bucket) {
          bucket.add(rule.id);
        }
      });
    });
  });

  return uncertainIds
    .filter((questionId) => impacted.get(questionId).size > 0)
    .map((questionId) => ({
      questionId,
      question: questionById.get(questionId) || null,
      ruleIds: Array.from(impacted.get(questionId))
    }));
};
