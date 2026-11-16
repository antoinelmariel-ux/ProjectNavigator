// Un porteur peut solliciter lui-même un comité que ses réponses ne déclenchent pas, quand le
// comité s'est ouvert à la demande (validationCommittee.js, `onDemand`). La demande est stockée
// dans les réponses du projet sous une clé méta, à part des commentaires de conformité : ceux-ci
// sont réécrits par chaque avis d'expert et ne conservent que les clés qu'ils connaissent.
// Distincte de `forcedCommitteeIds` (réintégration par un membre du comité) : elle garde son
// auteur et sa date, et le porteur peut la retirer.
export const COMMITTEE_REQUESTS_KEY = '__committee_requests__';

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeCommitteeRequests = (value) => {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [committeeId, entry]) => {
    if (typeof committeeId !== 'string' || committeeId.trim().length === 0) {
      return acc;
    }
    acc[committeeId] = {
      requestedAt: typeof entry?.requestedAt === 'string' ? entry.requestedAt : '',
      requestedBy: typeof entry?.requestedBy === 'string' ? entry.requestedBy : ''
    };
    return acc;
  }, {});
};

export const getCommitteeRequests = (answers) =>
  normalizeCommitteeRequests(isPlainObject(answers) ? answers[COMMITTEE_REQUESTS_KEY] : null);

export const getRequestedCommitteeIds = (answers) => Object.keys(getCommitteeRequests(answers));

export const isCommitteeRequested = (answers, committeeId) =>
  Object.prototype.hasOwnProperty.call(getCommitteeRequests(answers), committeeId);

// Comités déclenchés sans que les critères automatiques le disent : réintégrés par un expert ou
// sollicités par le porteur. C'est la liste que `getTriggeredValidationCommittees` attend.
export const getForcedCommitteeIds = (answers) => {
  const comments = isPlainObject(answers) ? answers[COMPLIANCE_COMMENTS_KEY] : null;
  const forced = isPlainObject(comments) && Array.isArray(comments.forcedCommitteeIds)
    ? comments.forcedCommitteeIds
    : [];

  return Array.from(new Set([...forced, ...getRequestedCommitteeIds(answers)]));
};

export const withCommitteeRequested = (answers, committeeId, { by = '', at } = {}) => {
  const base = isPlainObject(answers) ? answers : {};
  if (!committeeId || isCommitteeRequested(base, committeeId)) {
    return base;
  }

  return {
    ...base,
    [COMMITTEE_REQUESTS_KEY]: {
      ...getCommitteeRequests(base),
      [committeeId]: { requestedAt: at || new Date().toISOString(), requestedBy: by }
    }
  };
};

export const withCommitteeRequestWithdrawn = (answers, committeeId) => {
  const base = isPlainObject(answers) ? answers : {};
  if (!committeeId || !isCommitteeRequested(base, committeeId)) {
    return base;
  }

  const { [committeeId]: _removed, ...remaining } = getCommitteeRequests(base);
  return { ...base, [COMMITTEE_REQUESTS_KEY]: remaining };
};
