export const sanitizeFileName = (value, fallback = 'projet-compliance') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  let normalized = value.trim();
  if (normalized.length === 0) {
    return fallback;
  }

  try {
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    normalized = normalized.replace(/[^\w\s-]/g, '');
  }

  const sanitized = normalized
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return sanitized.length > 0 ? sanitized : fallback;
};

export const getTeamPriority = (analysis, teamId) => {
  if (!analysis) {
    return 'standard';
  }

  const priorityWeights = {
    standard: 1,
    elevated: 2,
    critical: 3
  };

  const getWeight = (priority) => priorityWeights[priority] || 0;

  const risks = Array.isArray(analysis.risks) ? analysis.risks : [];
  let bestPriority = 'standard';

  risks.forEach(risk => {
    const associatedTeams = new Set();

    if (risk?.teamId) {
      associatedTeams.add(risk.teamId);
    }

    if (Array.isArray(risk?.teams)) {
      risk.teams.forEach(team => associatedTeams.add(team));
    }

    if (!associatedTeams.has(teamId)) {
      return;
    }

    const riskPriority = risk?.priority || 'standard';
    if (getWeight(riskPriority) > getWeight(bestPriority)) {
      bestPriority = riskPriority;
    }
  });

  return bestPriority;
};
