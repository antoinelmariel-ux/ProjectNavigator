import { normalizeConditionGroups } from './conditionGroups.js';
import { sanitizeRuleCondition } from './ruleConditions.js';
import { getThreadsForQuestion } from './questionThreads.js';
import { isUnknownAnswer } from './unknownAnswer.js';

// Contrepartie indispensable de « je ne sais pas encore » : une réponse incertaine qui
// conditionne une règle veut dire que l'analyse affichée peut changer. On ne peut ni
// déclencher la règle (on ne sait pas), ni se taire (le porteur croirait son périmètre
// stabilisé) — donc on le dit, des deux côtés.
//
// Le dire ne suffisait pas : un doute signalé mais adressé à personne reste un doute. Chaque
// entrée porte donc les équipes qui pourraient le lever (celles des règles que la réponse tient
// en suspens) et celles à qui il a effectivement été transmis, via un fil de questions ancrées
// (`questionThreads.js`) — qui est le seul mécanisme qui notifie réellement une équipe. Aucune
// nouvelle donnée n'est stockée : le lien doute → équipe, c'est le fil posé sur cette question.
const collectRuleTeamIds = (rule, target) => {
  (Array.isArray(rule?.teams) ? rule.teams : []).forEach((teamId) => {
    if (typeof teamId === 'string' && teamId.trim()) {
      target.add(teamId);
    }
  });

  (Array.isArray(rule?.teamRoutingRules) ? rule.teamRoutingRules : []).forEach((route) => {
    const targetTeamId = typeof route?.targetTeamId === 'string' ? route.targetTeamId : '';
    if (targetTeamId.trim()) {
      target.add(targetTeamId);
    }
  });
};

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
  const impactedTeams = new Map(uncertainIds.map((questionId) => [questionId, new Set()]));

  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    if (!rule || rule.isDraft) {
      return;
    }

    normalizeConditionGroups(rule, sanitizeRuleCondition).forEach((group) => {
      (Array.isArray(group?.conditions) ? group.conditions : []).forEach((condition) => {
        const bucket = impacted.get(condition?.question);
        if (bucket) {
          bucket.add(rule.id);
          collectRuleTeamIds(rule, impactedTeams.get(condition.question));
        }
      });
    });
  });

  return uncertainIds
    .filter((questionId) => impacted.get(questionId).size > 0)
    .map((questionId) => {
      const threads = getThreadsForQuestion(answers, questionId);

      return {
        questionId,
        question: questionById.get(questionId) || null,
        ruleIds: Array.from(impacted.get(questionId)),
        teamIds: Array.from(impactedTeams.get(questionId)),
        askedTeamIds: Array.from(new Set(threads.map((thread) => thread.teamId))),
        pendingTeamIds: Array.from(
          new Set(threads.filter((thread) => !thread.resolvedAt).map((thread) => thread.teamId))
        )
      };
    });
};

// Un doute qui ne s'adresse à personne : c'est lui qu'il faut montrer en premier, au porteur
// comme à l'expert, puisque c'est le seul qui n'a aucune chance d'être levé.
export const getUnroutedUncertainties = (coverage = []) =>
  (Array.isArray(coverage) ? coverage : []).filter((entry) => (entry?.askedTeamIds?.length || 0) === 0);
