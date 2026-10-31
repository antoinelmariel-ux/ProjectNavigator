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

// Ce qui date un avis et le rattache à une version. Les éditeurs (synthèse, fil d'échange)
// reconstruisent l'entrée à partir de ce qu'ils affichent et ne connaissent pas ces champs :
// sans les reporter, un simple « Enregistrer » sans changement ou une réponse dans le fil
// effaçait la date de l'avis, sa version, le signal « à ré-examiner » et la confirmation finale.
const REVIEW_META_KEYS = ['reviewedAt', 'reviewedVersion', 'needsReviewSince', 'confirmation'];

const hasMetaValue = (value) => value !== undefined && value !== null && value !== '' && value !== 0;

const carryReviewMeta = (entry, previousEntry) => {
  if (!previousEntry || typeof previousEntry !== 'object') {
    return entry;
  }
  const carried = { ...entry };
  REVIEW_META_KEYS.forEach((key) => {
    if (!hasMetaValue(carried[key]) && hasMetaValue(previousEntry[key])) {
      carried[key] = previousEntry[key];
    }
  });
  return carried;
};

// Date un avis dès qu'il est posé ou repris. Une simple réponse dans le fil n'en est pas un :
// répondre à une question n'est pas re-valider, et compter les réponses ferait disparaître le
// signal « à ré-examiner » au premier échange. Un avis inchangé garde la date où il a été rendu,
// même si l'éditeur l'a ré-enregistré.
export const stampReviewedVersions = (nextComments, previousComments, version, at) => {
  if (!nextComments || typeof nextComments !== 'object' || Array.isArray(nextComments)) {
    return nextComments;
  }

  const stampedAt = typeof at === 'string' && at.length > 0 ? at : new Date().toISOString();

  const stampSection = (section, previousSection) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      return section;
    }

    return Object.entries(section).reduce((acc, [targetId, entry]) => {
      const previousEntry = previousSection && typeof previousSection === 'object'
        ? previousSection[targetId]
        : null;

      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        acc[targetId] = entry;
        return acc;
      }

      const withMeta = carryReviewMeta(entry, previousEntry);

      if (readOpinionFingerprint(entry) === readOpinionFingerprint(previousEntry)) {
        const previousRenderedAt = typeof previousEntry?.statusUpdatedAt === 'string'
          ? previousEntry.statusUpdatedAt
          : '';
        acc[targetId] = previousRenderedAt ? { ...withMeta, statusUpdatedAt: previousRenderedAt } : withMeta;
      } else {
        acc[targetId] = { ...withReviewedVersion(withMeta, version, stampedAt), statusUpdatedAt: stampedAt };
      }

      return acc;
    }, {});
  };

  return {
    ...nextComments,
    teams: stampSection(nextComments.teams, previousComments?.teams),
    committees: stampSection(nextComments.committees, previousComments?.committees)
  };
};
