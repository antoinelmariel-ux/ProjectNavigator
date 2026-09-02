// Fusionne les commentaires de conformité d’un projet : SharePoint (CN_ComplianceComments)
// fait autorité équipe par équipe / comité par comité quand il a une ligne, le JSON local de
// la fiche projet comble le reste (commentaires anciens, jamais encore republiés vers
// SharePoint). `forcedCommitteeIds`/`legacy` ne sont jamais servis par SharePoint : la valeur
// locale est toujours conservée telle quelle.
const mergeGroup = (localGroup, serverGroup) => {
  const local = localGroup && typeof localGroup === 'object' && !Array.isArray(localGroup) ? localGroup : {};
  const server = serverGroup && typeof serverGroup === 'object' && !Array.isArray(serverGroup) ? serverGroup : {};
  return { ...local, ...server };
};

export const mergeComplianceComments = (localValue, serverValue) => {
  const local = localValue && typeof localValue === 'object' && !Array.isArray(localValue) ? localValue : {};

  if (!serverValue || typeof serverValue !== 'object' || Array.isArray(serverValue)) {
    return local;
  }

  return {
    ...local,
    teams: mergeGroup(local.teams, serverValue.teams),
    committees: mergeGroup(local.committees, serverValue.committees)
  };
};
