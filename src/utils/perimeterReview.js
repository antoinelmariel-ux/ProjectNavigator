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

export const withReviewedVersion = (entry, version) => ({
  ...(entry && typeof entry === 'object' ? entry : {}),
  reviewedVersion: toPositiveInteger(version)
});

export const withNeedsReviewSince = (entry, version) => ({
  ...(entry && typeof entry === 'object' ? entry : {}),
  needsReviewSince: toPositiveInteger(version)
});
