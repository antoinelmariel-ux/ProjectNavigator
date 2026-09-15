// Une équipe que le moteur de règles n'a pas identifiée peut être ajoutée à la main par le
// porteur de projet ou un expert Compliance (cf. CLAUDE.md, section synthèse). Ces demandes
// sont persistées séparément de `analysis.teams` (calculé par le moteur de règles et écrasé à
// chaque réévaluation des réponses) pour survivre à un recalcul de l'analyse.
export const MANUAL_TEAM_REQUESTS_KEY = '__compliance_manual_teams__';

export const normalizeManualTeamRequests = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  return value.reduce((acc, entry) => {
    const teamId = typeof entry?.teamId === 'string' ? entry.teamId.trim() : '';
    if (!teamId || seen.has(teamId)) {
      return acc;
    }
    seen.add(teamId);
    acc.push({
      teamId,
      requestedBy: typeof entry?.requestedBy === 'string' ? entry.requestedBy.trim() : '',
      requestedAt: typeof entry?.requestedAt === 'string' ? entry.requestedAt : ''
    });
    return acc;
  }, []);
};

export const addManualTeamRequest = (existingValue, { teamId, requestedBy } = {}) => {
  const normalizedTeamId = typeof teamId === 'string' ? teamId.trim() : '';
  const current = normalizeManualTeamRequests(existingValue);
  if (!normalizedTeamId || current.some((entry) => entry.teamId === normalizedTeamId)) {
    return current;
  }

  return [
    ...current,
    {
      teamId: normalizedTeamId,
      requestedBy: typeof requestedBy === 'string' ? requestedBy.trim() : '',
      requestedAt: new Date().toISOString()
    }
  ];
};
