// Un avis porte une version du projet. Sans cela, « Validé » finit par désigner un état du
// projet qui n'existe plus : l'expert a validé le budget de 200 k€, le porteur l'a passé à 850 k€,
// et la carte continue d'afficher un tampon vert.
const toPositiveInteger = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

export const getReviewedVersion = (entry) => toPositiveInteger(entry?.reviewedVersion);

export const getNeedsReviewSince = (entry) => toPositiveInteger(entry?.needsReviewSince);

const hasOpinion = (entry) => typeof entry?.status === 'string' && entry.status.length > 0;

// Un avis rendu avant cette fonctionnalité n'a pas de version : il compte comme rendu sur la v1,
// la seule version qu'un projet soumis d'alors puisse avoir eue.
export const isPerimeterReviewPending = (entry) => {
  if (!hasOpinion(entry)) {
    return false;
  }

  return getNeedsReviewSince(entry) > (getReviewedVersion(entry) || 1);
};

// `reviewedAt` en plus de la version : le round de confirmation finale raisonne en dates (il
// demande « votre avis tient-il toujours ? » à un instant donné), alors que la version ne bouge
// qu'aux mises à jour du projet. Reprendre son avis après la demande vaut confirmation.
export const withReviewedVersion = (entry, version, at) => ({
  ...(entry && typeof entry === 'object' ? entry : {}),
  reviewedVersion: toPositiveInteger(version),
  reviewedAt: typeof at === 'string' && at.length > 0 ? at : new Date().toISOString()
});

export const withNeedsReviewSince = (entry, version) => ({
  ...(entry && typeof entry === 'object' ? entry : {}),
  needsReviewSince: toPositiveInteger(version)
});

const readOpinionFingerprint = (entry) => JSON.stringify({
  status: typeof entry?.status === 'string' ? entry.status : '',
  comment: typeof entry?.comment === 'string' ? entry.comment.trim() : '',
  attachments: Array.isArray(entry?.attachments) ? entry.attachments : []
});

// Date un avis dès qu'il est posé ou repris. Une simple réponse dans le fil n'en est pas un :
// répondre à une question n'est pas re-valider, et compter les réponses ferait disparaître le
// signal « à ré-examiner » au premier échange.
export const stampReviewedVersions = (nextComments, previousComments, version, at) => {
  if (!nextComments || typeof nextComments !== 'object' || Array.isArray(nextComments)) {
    return nextComments;
  }

  const stampSection = (section, previousSection) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      return section;
    }

    return Object.entries(section).reduce((acc, [targetId, entry]) => {
      const previousEntry = previousSection && typeof previousSection === 'object'
        ? previousSection[targetId]
        : null;

      acc[targetId] = readOpinionFingerprint(entry) === readOpinionFingerprint(previousEntry)
        ? entry
        : withReviewedVersion(entry, version, at);

      return acc;
    }, {});
  };

  return {
    ...nextComments,
    teams: stampSection(nextComments.teams, previousComments?.teams),
    committees: stampSection(nextComments.committees, previousComments?.committees)
  };
};
