// Un projet soumis continue de vivre. Pour que ses évolutions soient traitables sans noyer les
// experts, il faut un point de comparaison stable : l'état des réponses **au dernier envoi**.
// C'est tout ce que cet historique conserve — un seul instantané, pas toute la suite des
// versions : la seule question à laquelle l'application ait besoin de répondre est « qu'est-ce
// qui a changé depuis ce que les experts ont reçu ? », et garder N instantanés de réponses dans
// un `localStorage` déjà chargé se paierait en quota bien avant de servir.
export const SUBMISSION_HISTORY_KEY = '__submission_history__';

// Clés méta qui vivent dans `answers` sans être des réponses : elles n'ont rien à faire dans
// l'instantané (les commentaires compliance changent en permanence côté expert et pèsent lourd,
// le type de soumission et les demandes manuelles d'équipe ne sont pas des réponses).
// Volontairement écrites en dur plutôt qu'importées : `projectValidationStatus.js` consomme ce
// module pour dater un avis, l'import inverse créerait un cycle.
const KEYS_EXCLUDED_FROM_SNAPSHOT = new Set([
  SUBMISSION_HISTORY_KEY,
  '__compliance_team_comments__',
  '__compliance_manual_teams__',
  '__submission_kind__'
]);

const toPositiveInteger = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

export const normalizeSubmissionHistory = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { version: 0, lastSentAt: '', lastKind: '', snapshot: null, entries: [], narrativeChanges: [] };
  }

  return {
    version: toPositiveInteger(value.version),
    lastSentAt: typeof value.lastSentAt === 'string' ? value.lastSentAt : '',
    lastKind: typeof value.lastKind === 'string' ? value.lastKind : '',
    snapshot: value.snapshot && typeof value.snapshot === 'object' && !Array.isArray(value.snapshot)
      ? value.snapshot
      : null,
    entries: Array.isArray(value.entries)
      ? value.entries
        .filter((entry) => toPositiveInteger(entry?.version) > 0)
        .map((entry) => ({
          version: entry.version,
          sentAt: typeof entry.sentAt === 'string' ? entry.sentAt : '',
          kind: typeof entry.kind === 'string' ? entry.kind : ''
        }))
      : [],
    narrativeChanges: Array.isArray(value.narrativeChanges)
      ? value.narrativeChanges
        .filter((entry) => typeof entry?.questionId === 'string' && entry.questionId.length > 0)
        .map((entry) => ({
          version: toPositiveInteger(entry.version),
          questionId: entry.questionId,
          at: typeof entry.at === 'string' ? entry.at : ''
        }))
      : []
  };
};

export const getSubmissionHistory = (answers) =>
  normalizeSubmissionHistory(answers && typeof answers === 'object' ? answers[SUBMISSION_HISTORY_KEY] : null);

// Version 0 = jamais envoyé. Un projet soumis avant cette fonctionnalité n'a pas d'historique :
// il compte comme envoyé une fois (v1), sans instantané — on ne peut pas inventer l'état des
// réponses à sa soumission, et prétendre le contraire produirait un diff mensonger.
export const getSubmissionVersion = (project) => {
  const history = getSubmissionHistory(project?.answers);
  if (history.version > 0) {
    return history.version;
  }

  return project?.status === 'submitted' ? 1 : 0;
};

export const getLastSentSnapshot = (answers) => getSubmissionHistory(answers).snapshot;

export const buildSubmissionSnapshot = (answers) => {
  if (!answers || typeof answers !== 'object') {
    return {};
  }

  return Object.entries(answers).reduce((acc, [key, value]) => {
    if (!KEYS_EXCLUDED_FROM_SNAPSHOT.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Les modifications de champs narratifs ne déclenchent aucune règle, donc aucune notification —
// mais elles ne sont pas rien : elles sont journalisées pour que l'expert voie, à son prochain
// passage, combien de fois la description a bougé depuis son avis.
export const recordSubmission = (answers, { kind = '', narrativeQuestionIds = [], at } = {}) => {
  const previous = getSubmissionHistory(answers);
  const version = previous.version + 1;
  const sentAt = typeof at === 'string' && at.length > 0 ? at : new Date().toISOString();

  const narrativeChanges = [
    ...previous.narrativeChanges,
    ...narrativeQuestionIds
      .filter((questionId) => typeof questionId === 'string' && questionId.length > 0)
      .map((questionId) => ({ version, questionId, at: sentAt }))
  ];

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [SUBMISSION_HISTORY_KEY]: {
      version,
      lastSentAt: sentAt,
      lastKind: kind,
      snapshot: buildSubmissionSnapshot(answers),
      entries: [...previous.entries, { version, sentAt, kind }],
      narrativeChanges
    }
  };
};

export const getNarrativeChangesSince = (answers, version) => {
  const since = toPositiveInteger(version);
  return getSubmissionHistory(answers).narrativeChanges.filter((entry) => entry.version > since);
};
