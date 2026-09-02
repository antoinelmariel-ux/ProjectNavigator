import { normalizeRuleConditionGroups, applyRuleConditionGroups } from './ruleConditions.js';
import { evaluateRule } from './rules.js';

export const DEFAULT_COMMITTEE_ID = 'committee-default';

const sanitizeTextValue = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeEmails = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeTextValue(entry))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const normalizeRuleTriggers = (value) => {
  const ruleIds = Array.isArray(value?.ruleIds)
    ? value.ruleIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];
  const matchMode = value?.matchMode === 'all' ? 'all' : 'any';

  return {
    matchMode,
    ruleIds
  };
};

const normalizeRiskTriggers = (value) => {
  const rawMinRiskScore = value?.minRiskScore;
  const minRiskScore = rawMinRiskScore === null || rawMinRiskScore === undefined || rawMinRiskScore === ''
    ? null
    : Number.isFinite(Number(rawMinRiskScore))
      ? Math.max(0, Number(rawMinRiskScore))
      : null;

  return {
    minRiskScore
  };
};

const normalizeTeamTriggers = (value) => {
  const rawMinTeamsCount = value?.minTeamsCount;
  const minTeamsCount = rawMinTeamsCount === null || rawMinTeamsCount === undefined || rawMinTeamsCount === ''
    ? null
    : Number.isFinite(Number(rawMinTeamsCount))
      ? Math.max(1, Number(rawMinTeamsCount))
      : null;

  return {
    minTeamsCount
  };
};

const normalizeCommentRequirement = (value) => value !== false;

const normalizeCommittee = (value = {}, index = 0) => {
  const id = sanitizeTextValue(value?.id) || `committee-${index + 1}`;
  const name = sanitizeTextValue(value?.name) || `Comité ${index + 1}`;
  const emails = normalizeEmails(value?.emails ?? value?.contacts);
  const conditionGroups = normalizeRuleConditionGroups(value);

  return applyRuleConditionGroups(
    {
      id,
      name,
      emails,
      commentRequired: normalizeCommentRequirement(value?.commentRequired),
      ruleTriggers: normalizeRuleTriggers(value?.ruleTriggers),
      riskTriggers: normalizeRiskTriggers(value?.riskTriggers),
      teamTriggers: normalizeTeamTriggers(value?.teamTriggers)
    },
    conditionGroups
  );
};

const buildDefaultCommittee = (value = {}) =>
  normalizeCommittee(
    {
      id: DEFAULT_COMMITTEE_ID,
      name: 'Comité de validation',
      ...value
    },
    0
  );

export const normalizeValidationCommitteeConfig = (value = {}) => {
  const hasCommittees = Array.isArray(value?.committees);
  const committees = hasCommittees
    ? value.committees.map((committee, index) => normalizeCommittee(committee, index))
    : [buildDefaultCommittee(value)];

  return {
    enabled: value?.enabled !== false,
    committees
  };
};

const getMinimumRiskScore = (risks) => {
  if (!Array.isArray(risks) || risks.length === 0) {
    return 0;
  }

  const weights = risks
    .map((risk) => (Number.isFinite(risk?.weight) ? risk.weight : null))
    .filter((weight) => weight !== null);

  if (weights.length === 0) {
    return 0;
  }

  return Math.min(...weights);
};

const shouldTriggerCommittee = (committee, context = {}) => {
  const analysis = context?.analysis || {};
  const answers = context?.answers || {};
  const relevantTeams = Array.isArray(context?.relevantTeams) ? context.relevantTeams : [];
  const risks = Array.isArray(analysis?.risks) ? analysis.risks : [];
  const triggeredRuleIds = Array.isArray(analysis?.triggeredRules)
    ? analysis.triggeredRules
        .map((rule) => rule?.id)
        .filter((id) => typeof id === 'string')
    : [];
  const conditionGroups = normalizeRuleConditionGroups(committee);
  const hasConditionTriggers = conditionGroups.some((group) => group.conditions.length > 0);

  const triggers = [];

  if (committee.ruleTriggers.ruleIds.length > 0) {
    const ruleMatches = committee.ruleTriggers.ruleIds.map((ruleId) => triggeredRuleIds.includes(ruleId));
    triggers.push(
      ruleMatches.some(Boolean)
    );
  }

  if (committee.riskTriggers.minRiskScore !== null && committee.riskTriggers.minRiskScore !== undefined) {
    const minimumRiskScore = getMinimumRiskScore(risks);
    triggers.push(minimumRiskScore >= committee.riskTriggers.minRiskScore);
  }

  if (committee.teamTriggers.minTeamsCount) {
    triggers.push(relevantTeams.length >= committee.teamTriggers.minTeamsCount);
  }

  if (hasConditionTriggers) {
    const evaluation = evaluateRule({ ...committee, conditionGroups }, answers);
    triggers.push(evaluation.triggered);
  }

  return triggers.some(Boolean);
};

export const getTriggeredValidationCommittees = (config, context = {}) => {
  const normalized = normalizeValidationCommitteeConfig(config);
  if (!normalized.enabled) {
    return [];
  }

  const forcedCommitteeIds = Array.isArray(context?.forcedCommitteeIds)
    ? context.forcedCommitteeIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

  return normalized.committees.filter(
    (committee) => forcedCommitteeIds.includes(committee.id) || shouldTriggerCommittee(committee, context)
  );
};
