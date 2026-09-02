import { normalizeAnswerForComparison, normalizeConditionValueForAnswer } from './questions.js';
import { normalizeConditionGroups } from './conditionGroups.js';
import { sanitizeRuleCondition } from './ruleConditions.js';
import { getRiskWeightKey, normalizeRiskWeighting } from './risk.js';
import { DEFAULT_LANGUAGE } from '../i18n/languages.js';
import { resolveLocalizedText } from './localizedContent.js';

const DEFAULT_COMPLEXITY_RULES = [
  { id: 'default_low', label: 'Faible', minRisks: 0, maxRisks: 1, minScore: 0, maxScore: 1 },
  { id: 'default_medium', label: 'Modéré', minRisks: 2, maxRisks: 3, minScore: 2, maxScore: 3 },
  { id: 'default_high', label: 'Élevé', minRisks: 4, maxRisks: null, minScore: 4, maxScore: null }
];

const normalizeRiskLevelRules = (rules) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return DEFAULT_COMPLEXITY_RULES;
  }

  const sanitizeScore = (input, fallback, { allowNull = false } = {}) => {
    if (allowNull && (input === null || input === undefined || input === '')) {
      return null;
    }

    const parsed = Number(input);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return parsed < 0 ? 0 : parsed;
  };

  return rules
    .map((rule, index) => {
      const minScore = sanitizeScore(
        rule?.minScore !== undefined ? rule.minScore : rule?.minRisks,
        0
      );
      const maxScore = sanitizeScore(
        rule?.maxScore !== undefined ? rule.maxScore : rule?.maxRisks,
        null,
        { allowNull: true }
      );

      return {
        id: rule?.id || `risk_level_${index + 1}`,
        label: typeof rule?.label === 'string' && rule.label.trim() !== ''
          ? rule.label.trim()
          : `Niveau ${index + 1}`,
        description: typeof rule?.description === 'string'
          ? rule.description.trim()
          : '',
        minScore,
        maxScore,
        minRisks: minScore,
        maxRisks: maxScore
      };
    })
    .sort((a, b) => {
      if (a.minScore !== b.minScore) {
        return a.minScore - b.minScore;
      }

      const aMax = a.maxScore === null ? Number.POSITIVE_INFINITY : a.maxScore;
      const bMax = b.maxScore === null ? Number.POSITIVE_INFINITY : b.maxScore;

      if (aMax !== bMax) {
        return aMax - bMax;
      }

      return a.id.localeCompare(b.id);
    });
};

const resolveComplexityLevel = (riskScore, riskLevelRules) => {
  const normalizedRules = normalizeRiskLevelRules(riskLevelRules);
  const firstRule = normalizedRules[0];

  for (let index = 0; index < normalizedRules.length; index += 1) {
    const rule = normalizedRules[index];
    const matchesMinimum = riskScore >= rule.minScore;
    const matchesMaximum =
      rule.maxScore === null || rule.maxScore === undefined
        ? true
        : riskScore <= rule.maxScore;

    if (matchesMinimum && matchesMaximum) {
      return { label: rule.label, rule };
    }
  }

  const fallback = riskScore < (firstRule?.minScore ?? 0)
    ? firstRule
    : normalizedRules[normalizedRules.length - 1];
  return { label: fallback?.label || 'Modéré', rule: fallback || null };
};

const toOptionalNonNegativeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed < 0 ? 0 : parsed;
};

const sanitizeTimingConstraint = (constraint = {}) => {
  const enabled = Boolean(constraint?.enabled);
  const startQuestion = typeof constraint?.startQuestion === 'string' ? constraint.startQuestion : '';
  const endQuestion = typeof constraint?.endQuestion === 'string' ? constraint.endQuestion : '';

  return {
    enabled,
    startQuestion,
    endQuestion,
    minimumWeeks: toOptionalNonNegativeNumber(constraint?.minimumWeeks),
    minimumDays: toOptionalNonNegativeNumber(constraint?.minimumDays)
  };
};

const sanitizeRiskTimingConstraint = (constraint = {}) => sanitizeTimingConstraint(constraint);

const sanitizeTeamQuestionEntry = (entry) => {
  if (typeof entry === 'string') {
    return {
      text: entry,
      timingConstraint: sanitizeTimingConstraint()
    };
  }

  if (!entry || typeof entry !== 'object') {
    return {
      text: '',
      timingConstraint: sanitizeTimingConstraint()
    };
  }

  const { text, timingConstraint, ...rest } = entry;

  return {
    ...rest,
    text: typeof text === 'string' || (text && typeof text === 'object') ? text : '',
    timingConstraint: sanitizeTimingConstraint(timingConstraint)
  };
};

const sanitizeTeamQuestionsByTeam = (input) => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input).reduce((accumulator, [teamId, questions]) => {
    if (!teamId) {
      return accumulator;
    }

    const entries = Array.isArray(questions)
      ? questions.map(sanitizeTeamQuestionEntry)
      : [];

    return { ...accumulator, [teamId]: entries };
  }, {});
};

const matchesCondition = (condition, answers) => {
  if (!condition || !condition.question) {
    return true;
  }

  const rawAnswer = answers[condition.question];
  if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
    return false;
  }

  const answer = normalizeAnswerForComparison(rawAnswer);
  const operator = condition.operator || 'equals';
  const expected = normalizeConditionValueForAnswer(
    Array.isArray(answer) ? answer[0] : answer,
    condition.value
  );

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  switch (operator) {
    case 'equals':
      if (Array.isArray(answer)) {
        return answer.includes(expected);
      }
      return answer === expected;
    case 'not_equals':
      if (Array.isArray(answer)) {
        return !answer.includes(expected);
      }
      return answer !== expected;
    case 'contains':
      if (Array.isArray(answer)) {
        return answer.includes(expected);
      }
      if (typeof answer === 'string') {
        return answer.toLowerCase().includes(String(expected).toLowerCase());
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
      const expectedNumber = toNumber(expected);

      if (answerNumber === null || expectedNumber === null) {
        return false;
      }

      switch (operator) {
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

const computeTimingDiff = (condition, answers) => {
  if (!condition.startQuestion || !condition.endQuestion) {
    return null;
  }

  const startAnswer = answers[condition.startQuestion];
  const endAnswer = answers[condition.endQuestion];

  if (!startAnswer || !endAnswer) {
    return null;
  }

  const startDate = new Date(startAnswer);
  const endDate = new Date(endAnswer);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diffInMs = endDate.getTime() - startDate.getTime();
  if (diffInMs < 0) {
    return null;
  }

  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return {
    startDate,
    endDate,
    diffInDays,
    diffInWeeks: diffInDays / 7
  };
};

const normalizeTimingRequirement = (value) => {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  if (typeof value === 'number') {
    return { minimumWeeks: value };
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? {} : { minimumWeeks: parsed };
  }

  if (typeof value === 'object') {
    const result = {};

    if (typeof value.minimumWeeks === 'number') {
      result.minimumWeeks = value.minimumWeeks;
    } else if (typeof value.minimumWeeks === 'string' && value.minimumWeeks.trim() !== '') {
      const parsed = Number(value.minimumWeeks);
      if (!Number.isNaN(parsed)) {
        result.minimumWeeks = parsed;
      }
    }

    if (typeof value.minimumDays === 'number') {
      result.minimumDays = value.minimumDays;
    } else if (typeof value.minimumDays === 'string' && value.minimumDays.trim() !== '') {
      const parsed = Number(value.minimumDays);
      if (!Number.isNaN(parsed)) {
        result.minimumDays = parsed;
      }
    }

    return result;
  }

  return {};
};

const evaluateRoutingRule = (routingRule, answers) => {
  if (!routingRule || typeof routingRule !== 'object') {
    return false;
  }

  const conditionGroups = normalizeConditionGroups(routingRule, sanitizeRuleCondition);
  if (conditionGroups.length === 0) {
    return false;
  }

  return conditionGroups.every((group) => {
    const conditions = Array.isArray(group.conditions) ? group.conditions : [];
    if (conditions.length === 0) {
      return true;
    }

    const logic = group.logic === 'any' ? 'any' : 'all';
    const results = conditions.map((condition) => matchesCondition(condition, answers));
    return logic === 'any' ? results.some(Boolean) : results.every(Boolean);
  });
};

const resolveRuleAssignedTeam = (rule, answers) => {
  const baseTeams = Array.isArray(rule?.teams) ? rule.teams : [];
  const primaryTeamId = baseTeams[0] || '';
  const routingRules = Array.isArray(rule?.teamRoutingRules) ? rule.teamRoutingRules : [];

  for (let index = 0; index < routingRules.length; index += 1) {
    const route = routingRules[index];
    const targetTeamId = typeof route?.targetTeamId === 'string' ? route.targetTeamId : '';

    if (!targetTeamId || targetTeamId === primaryTeamId) {
      continue;
    }

    if (evaluateRoutingRule(route, answers)) {
      return targetTeamId;
    }
  }

  return primaryTeamId;
};
const evaluateRule = (rule, answers) => {
  const timingContexts = [];
  const conditionGroups = normalizeConditionGroups(rule, sanitizeRuleCondition);

  const evaluateTimingCondition = (condition) => {
    const diff = computeTimingDiff(condition, answers);

    if (!diff) {
      timingContexts.push({
        type: 'timing',
        diff: null,
        profiles: [],
        satisfied: false,
        startQuestion: condition.startQuestion,
        endQuestion: condition.endQuestion
      });
      return false;
    }

    const normalizedProfiles = [];

    let satisfied = true;

    normalizedProfiles.forEach(profile => {
      Object.values(profile.requirements).forEach(requirement => {
        if (requirement.minimumDays !== undefined && diff.diffInDays < requirement.minimumDays) {
          satisfied = false;
        }

        if (requirement.minimumWeeks !== undefined && diff.diffInWeeks < requirement.minimumWeeks) {
          satisfied = false;
        }
      });
    });

    if (typeof condition.minimumWeeks === 'number' && diff.diffInWeeks < condition.minimumWeeks) {
      satisfied = false;
    }

    if (typeof condition.maximumWeeks === 'number' && diff.diffInWeeks > condition.maximumWeeks) {
      satisfied = false;
    }

    if (typeof condition.minimumDays === 'number' && diff.diffInDays < condition.minimumDays) {
      satisfied = false;
    }

    if (typeof condition.maximumDays === 'number' && diff.diffInDays > condition.maximumDays) {
      satisfied = false;
    }

    timingContexts.push({
      type: 'timing',
      diff,
      profiles: normalizedProfiles,
      satisfied,
      startQuestion: condition.startQuestion,
      endQuestion: condition.endQuestion
    });

    return satisfied;
  };

  const evaluateSingleCondition = (condition) => {
    const conditionType = condition.type || 'question';

    if (conditionType === 'timing') {
      return evaluateTimingCondition(condition);
    }

    return matchesCondition(condition, answers);
  };

  const groupResults = conditionGroups.map(group => {
    const conditions = Array.isArray(group.conditions) ? group.conditions : [];
    if (conditions.length === 0) {
      return true;
    }

    const logic = group.logic === 'any' ? 'any' : 'all';
    const results = conditions.map(evaluateSingleCondition);

    return logic === 'any' ? results.some(Boolean) : results.every(Boolean);
  });

  const triggered = conditionGroups.length === 0
    ? true
    : groupResults.every(Boolean);

  return { triggered, timingContexts };
};

export const analyzeAnswers = (answers, rules, riskLevelRules, riskWeighting) => {
  const normalizedRiskWeighting = normalizeRiskWeighting(riskWeighting);
  const evaluations = rules.map(rule => ({ rule, evaluation: evaluateRule(rule, answers) }));

  const teamsSet = new Set();
  const notifiedTeamsSet = new Set();
  const allQuestions = {};
  const allRisks = [];
  const timelineByTeam = {};
  const timingDetails = [];
  const vigilanceAlerts = [];
  const sharedTeamBlocks = [];

  evaluations.forEach(({ rule, evaluation }) => {
    if (!evaluation.triggered) {
      return;
    }

    const shouldNotifyTeam = rule?.notifyTeam !== false;
    const addTeam = (teamId) => {
      if (!teamId) {
        return;
      }
      teamsSet.add(teamId);
      if (shouldNotifyTeam) {
        notifiedTeamsSet.add(teamId);
      }
    };

    const ruleTeams = Array.isArray(rule?.teams)
      ? Array.from(new Set(rule.teams.filter(teamId => typeof teamId === 'string' && teamId.trim() !== '')))
      : [];
    const primaryTeamId = ruleTeams[0] || '';
    const assignedTeamId = resolveRuleAssignedTeam(rule, answers);
    const activeTeamIds = Array.from(
      new Set(
        ruleTeams.map((teamId) => (teamId === primaryTeamId ? assignedTeamId : teamId)).filter(Boolean)
      )
    );

    activeTeamIds.forEach(addTeam);

    const primaryQuestions = primaryTeamId && rule.questions && typeof rule.questions === 'object'
      ? rule.questions[primaryTeamId]
      : [];
    const sourceQuestions = activeTeamIds.reduce((accumulator, teamId) => {
      const teamQuestions = rule.questions && typeof rule.questions === 'object'
        ? rule.questions[teamId]
        : null;
      return {
        ...accumulator,
        [teamId]: Array.isArray(teamQuestions) ? teamQuestions : primaryQuestions
      };
    }, {});

    Object.entries(sourceQuestions).forEach(([teamId, questions]) => {
      if (!teamId) {
        return;
      }

      const entries = Array.isArray(questions)
        ? questions.map(sanitizeTeamQuestionEntry)
        : [];

      entries.forEach(entry => {
        if (!entry) {
          return;
        }

        const rawText = entry.text;
        const trimmedText = resolveLocalizedText(rawText, DEFAULT_LANGUAGE).trim();
        const timingConstraint = sanitizeTimingConstraint(entry.timingConstraint);

        if (timingConstraint.enabled) {
          const diff = computeTimingDiff(timingConstraint, answers);

          if (!diff) {
            return;
          }

          if (trimmedText.length === 0) {
            return;
          }

          const requiredWeeks = typeof timingConstraint.minimumWeeks === 'number'
            ? timingConstraint.minimumWeeks
            : undefined;
          const requiredDays = typeof timingConstraint.minimumDays === 'number'
            ? timingConstraint.minimumDays
            : undefined;
          const meetsWeeks = requiredWeeks === undefined || diff.diffInWeeks >= requiredWeeks;
          const meetsDays = requiredDays === undefined || diff.diffInDays >= requiredDays;

          if (meetsWeeks && meetsDays) {
            return;
          }

          if (!allQuestions[teamId]) {
            allQuestions[teamId] = [];
          }

          allQuestions[teamId].push({
            text: rawText,
            timingViolation: {
              startQuestion: timingConstraint.startQuestion,
              endQuestion: timingConstraint.endQuestion,
              requiredWeeks,
              requiredDays,
              actualWeeks: diff.diffInWeeks,
              actualDays: diff.diffInDays,
              meetsWeeks,
              meetsDays
            }
          });

          addTeam(teamId);
          return;
        }

        if (trimmedText.length === 0) {
          return;
        }

        if (!allQuestions[teamId]) {
          allQuestions[teamId] = [];
        }

        allQuestions[teamId].push({ text: rawText, timingViolation: null });
        addTeam(teamId);
      });
    });

    const processedRisks = (Array.isArray(rule.risks) ? rule.risks : [])
      .map((risk, riskIndex) => {
        const preferredTeam = assignedTeamId;
        const timingConstraint = sanitizeRiskTimingConstraint(risk?.timingConstraint);

          const baseRisk = {
            ...risk,
            priority: risk?.priority || 'standard',
            teamId: preferredTeam,
            teams: preferredTeam ? [preferredTeam] : [],
            ruleId: rule.id,
            ruleName: rule.name,
            timingConstraint
          };

          const weightKey = getRiskWeightKey(baseRisk.level);
          const weight = normalizedRiskWeighting[weightKey] ?? normalizedRiskWeighting.low;
          const weightedRisk = { ...baseRisk, weight };

          if (!timingConstraint.enabled) {
            addTeam(preferredTeam);
            return weightedRisk;
          }

          const diff = computeTimingDiff(timingConstraint, answers);
          const requiredWeeks = typeof timingConstraint.minimumWeeks === 'number'
            ? timingConstraint.minimumWeeks
            : undefined;
          const requiredDays = typeof timingConstraint.minimumDays === 'number'
            ? timingConstraint.minimumDays
            : undefined;

          const alertId = risk?.id
            ? `${rule.id}__${risk.id}`
            : `${rule.id}__risk_${riskIndex}`;

          if (!diff) {
            vigilanceAlerts.push({
              id: alertId,
              ruleId: rule.id,
              ruleName: rule.name,
              riskId: risk?.id ?? null,
              riskDescription: (typeof risk?.description === 'string' || (risk?.description && typeof risk.description === 'object')) ? risk.description : '',
              level: weightedRisk.level,
              priority: weightedRisk.priority,
              mitigation: (typeof weightedRisk.mitigation === 'string' || (weightedRisk.mitigation && typeof weightedRisk.mitigation === 'object')) ? weightedRisk.mitigation : '',
              teamId: preferredTeam,
              teams: Array.isArray(weightedRisk.teams) && weightedRisk.teams.length > 0
                ? weightedRisk.teams
                : preferredTeam
                  ? [preferredTeam]
                  : [],
              timingConstraint,
              requiredWeeks,
              requiredDays,
              diff: null,
              status: 'unknown'
            });
            return null;
          }

          const meetsWeeks = requiredWeeks === undefined || diff.diffInWeeks >= requiredWeeks;
          const meetsDays = requiredDays === undefined || diff.diffInDays >= requiredDays;
          const satisfied = meetsWeeks && meetsDays;

          vigilanceAlerts.push({
            id: alertId,
            ruleId: rule.id,
            ruleName: rule.name,
            riskId: risk?.id ?? null,
            riskDescription: (typeof risk?.description === 'string' || (risk?.description && typeof risk.description === 'object')) ? risk.description : '',
            level: weightedRisk.level,
            priority: weightedRisk.priority,
            mitigation: (typeof weightedRisk.mitigation === 'string' || (weightedRisk.mitigation && typeof weightedRisk.mitigation === 'object')) ? weightedRisk.mitigation : '',
            teamId: preferredTeam,
            teams: Array.isArray(weightedRisk.teams) && weightedRisk.teams.length > 0
              ? weightedRisk.teams
              : preferredTeam
                ? [preferredTeam]
                : [],
            timingConstraint,
            requiredWeeks,
            requiredDays,
            diff,
            status: satisfied ? 'satisfied' : 'breach'
          });

          if (satisfied) {
            return null;
          }

          addTeam(preferredTeam);

          const timingViolation = {
            startQuestion: timingConstraint.startQuestion,
            endQuestion: timingConstraint.endQuestion,
            requiredWeeks,
            requiredDays,
            actualWeeks: diff.diffInWeeks,
            actualDays: diff.diffInDays,
            meetsWeeks,
            meetsDays
          };

          timingDetails.push({
            ruleId: rule.id,
            ruleName: rule.name,
            riskId: risk?.id ?? null,
            riskDescription: (typeof risk?.description === 'string' || (risk?.description && typeof risk.description === 'object')) ? risk.description : '',
            satisfied: false,
            diff,
            profiles: [],
            source: 'risk',
            timingViolation
          });

          return {
            ...weightedRisk,
            timingViolation
          };
        })
      .filter(Boolean);

    allRisks.push(...processedRisks);

    if (activeTeamIds.length > 1) {
      const sharedQuestions = Array.isArray(primaryQuestions)
        ? primaryQuestions
            .map(sanitizeTeamQuestionEntry)
            .filter(entry => resolveLocalizedText(entry?.text, DEFAULT_LANGUAGE).trim().length > 0)
        : [];

      sharedTeamBlocks.push({
        ruleId: rule.id,
        ruleName: rule.name,
        teamIds: activeTeamIds,
        questions: sharedQuestions
      });
    }

    evaluation.timingContexts.forEach(context => {
      if (!context || !context.diff) {
        timingDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          satisfied: context?.satisfied ?? false,
          diff: null,
          profiles: []
        });
        return;
      }

      const { diff } = context;
      const contextEntry = {
        ruleId: rule.id,
        ruleName: rule.name,
        satisfied: context.satisfied,
        diff,
        profiles: context.profiles
      };

      timingDetails.push(contextEntry);

      context.profiles.forEach(profile => {
        Object.entries(profile.requirements || {}).forEach(([teamId, requirement]) => {
          if (!teamId) return;

          const normalized = normalizeTimingRequirement(requirement);
          const hasRequirement =
            normalized.minimumWeeks !== undefined || normalized.minimumDays !== undefined;

          if (!hasRequirement) {
            return;
          }

          if (!timelineByTeam[teamId]) {
            timelineByTeam[teamId] = [];
          }

          const meetsWeeks =
            normalized.minimumWeeks === undefined || diff.diffInWeeks >= normalized.minimumWeeks;
          const meetsDays =
            normalized.minimumDays === undefined || diff.diffInDays >= normalized.minimumDays;

          timelineByTeam[teamId].push({
            profileId: profile.id,
            profileLabel: profile.label,
            description: profile.description,
            requiredWeeks: normalized.minimumWeeks,
            requiredDays: normalized.minimumDays,
            actualWeeks: diff.diffInWeeks,
            actualDays: diff.diffInDays,
            satisfied: meetsWeeks && meetsDays
          });
        });
      });
    });
  });

  const riskScore = allRisks.reduce((total, risk) => {
    const contribution = Number.isFinite(risk?.weight) ? risk.weight : 0;
    return total + contribution;
  }, 0);

  const { label: complexity, rule: complexityRule } = resolveComplexityLevel(riskScore, riskLevelRules);

  return {
    triggeredRules: evaluations.filter(({ evaluation }) => evaluation.triggered).map(({ rule }) => rule),
    teams: Array.from(teamsSet),
    notifiedTeams: Array.from(notifiedTeamsSet),
    questions: allQuestions,
    risks: allRisks,
    riskScore,
    timeline: {
      byTeam: timelineByTeam,
      details: timingDetails,
      vigilance: vigilanceAlerts
    },
    complexity,
    complexityRule,
    sharedTeamBlocks
  };
};

export const resolveProjectAnalysis = (project, computeAnalysis) => {
  if (project?.status === 'submitted' && project?.analysis) {
    return project.analysis;
  }
  const answers = project?.answers || {};
  return Object.keys(answers).length > 0 ? computeAnalysis(answers) : null;
};

export {
  matchesCondition,
  normalizeTimingRequirement,
  sanitizeRiskTimingConstraint,
  sanitizeTeamQuestionEntry,
  sanitizeTeamQuestionsByTeam
};
