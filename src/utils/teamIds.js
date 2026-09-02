const LEGACY_TEAM_ID_MAP = {
  procurement: 'achats',
  team2: 'achats',
  com: 'communication_externe',
  team1: 'pi',
  bpp: 'controle_pub',
  Ethics: 'ethique_compliance',
  legal: 'juridique_france',
  privacy: 'juridique_international',
  pv: 'pharmacovigilance',
  it: 'affaires_publiques'
};

const normalizeLegacyTeamId = (teamId) => {
  if (typeof teamId !== 'string') {
    return teamId;
  }

  const trimmed = teamId.trim();
  if (!trimmed) {
    return '';
  }

  return LEGACY_TEAM_ID_MAP[trimmed] || trimmed;
};

const normalizeUniqueTeamIds = (teamIds) => {
  if (!Array.isArray(teamIds)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  teamIds.forEach((teamId) => {
    const canonicalTeamId = normalizeLegacyTeamId(teamId);
    if (typeof canonicalTeamId !== 'string' || canonicalTeamId === '' || seen.has(canonicalTeamId)) {
      return;
    }
    seen.add(canonicalTeamId);
    normalized.push(canonicalTeamId);
  });

  return normalized;
};

const normalizeRuleTeamReferences = (rule) => {
  if (!rule || typeof rule !== 'object') {
    return rule;
  }

  const nextRule = { ...rule };
  nextRule.teams = normalizeUniqueTeamIds(rule.teams);

  if (rule.questions && typeof rule.questions === 'object') {
    const normalizedQuestions = {};

    Object.entries(rule.questions).forEach(([teamId, teamQuestions]) => {
      const canonicalTeamId = normalizeLegacyTeamId(teamId);
      if (!canonicalTeamId) {
        return;
      }

      const existingEntries = Array.isArray(normalizedQuestions[canonicalTeamId])
        ? normalizedQuestions[canonicalTeamId]
        : [];
      const nextEntries = Array.isArray(teamQuestions) ? teamQuestions : [];
      normalizedQuestions[canonicalTeamId] = [...existingEntries, ...nextEntries];
    });

    nextRule.questions = normalizedQuestions;
  }

  if (Array.isArray(rule.risks)) {
    nextRule.risks = rule.risks.map((risk) => {
      if (!risk || typeof risk !== 'object') {
        return risk;
      }

      const canonicalTeamId = normalizeLegacyTeamId(risk.teamId);
      return canonicalTeamId === risk.teamId
        ? risk
        : { ...risk, teamId: canonicalTeamId };
    });
  }

  if (Array.isArray(rule.teamRoutingRules)) {
    nextRule.teamRoutingRules = rule.teamRoutingRules.map((routingRule) => {
      if (!routingRule || typeof routingRule !== 'object') {
        return routingRule;
      }

      const canonicalTargetTeamId = normalizeLegacyTeamId(routingRule.targetTeamId);
      return canonicalTargetTeamId === routingRule.targetTeamId
        ? routingRule
        : { ...routingRule, targetTeamId: canonicalTargetTeamId };
    });
  }

  return nextRule;
};

export const normalizeRulesTeamReferences = (rules) => {
  if (!Array.isArray(rules)) {
    return [];
  }

  return rules.map((rule) => normalizeRuleTeamReferences(rule));
};
