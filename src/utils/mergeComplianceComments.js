// Fusionne les commentaires de conformité d’un projet : SharePoint (CN_ComplianceComments)
// fait autorité équipe par équipe / comité par comité quand il a une ligne, le JSON local de
// la fiche projet comble le reste (commentaires anciens, jamais encore republiés vers
// SharePoint). `forcedCommitteeIds`/`legacy` ne sont jamais servis par SharePoint : la valeur
// locale est toujours conservée telle quelle.
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readOpinion = (entry) => JSON.stringify({
  status: typeof entry?.status === 'string' ? entry.status : '',
  comment: typeof entry?.comment === 'string' ? entry.comment.trim() : ''
});

const hasValue = (value) => value !== undefined && value !== null && value !== '' && value !== 0;

const toPositiveInteger = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

// La ligne SharePoint fait autorité, mais une ligne écrite avant que la date et la version de
// l'avis voyagent dans ClaimJson ne les porte pas, et une mise à jour du projet ne pose
// `needsReviewSince` que dans la fiche projet : sans ce report, recharger depuis SharePoint
// effaçait la date de l'avis, sa version et le signal « à ré-examiner ».
const mergeEntry = (localEntry, serverEntry) => {
  if (!isPlainObject(localEntry) || !isPlainObject(serverEntry)) {
    return serverEntry;
  }

  const merged = { ...serverEntry };
  const isSameOpinion = readOpinion(localEntry) === readOpinion(serverEntry);
  // La date et la version locales ne décrivent l'avis serveur que si c'est le même avis.
  const carriedKeys = isSameOpinion
    ? ['reviewedAt', 'reviewedVersion', 'confirmation', 'sessionId', 'sessionOutcomes']
    : ['confirmation', 'sessionOutcomes'];
  carriedKeys.forEach((key) => {
    if (!hasValue(merged[key]) && hasValue(localEntry[key])) {
      merged[key] = localEntry[key];
    }
  });

  const needsReviewSince = Math.max(
    toPositiveInteger(serverEntry.needsReviewSince),
    toPositiveInteger(localEntry.needsReviewSince)
  );
  if (needsReviewSince > 0) {
    merged.needsReviewSince = needsReviewSince;
  }

  // Pour un même avis, la date la plus ancienne est celle où il a été rendu : l'ancienne
  // date de repli (UpdatedAt de la ligne) ne fait qu'avancer à chaque réponse ou relance.
  const localRenderedAt = typeof localEntry.statusUpdatedAt === 'string' ? localEntry.statusUpdatedAt : '';
  const serverRenderedAt = typeof serverEntry.statusUpdatedAt === 'string' ? serverEntry.statusUpdatedAt : '';
  if (localRenderedAt && isSameOpinion
    && (!serverRenderedAt || localRenderedAt < serverRenderedAt)) {
    merged.statusUpdatedAt = localRenderedAt;
  }

  return merged;
};

const mergeGroup = (localGroup, serverGroup) => {
  const local = isPlainObject(localGroup) ? localGroup : {};
  const server = isPlainObject(serverGroup) ? serverGroup : {};
  const merged = { ...local };
  Object.entries(server).forEach(([targetId, serverEntry]) => {
    merged[targetId] = mergeEntry(local[targetId], serverEntry);
  });
  return merged;
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
