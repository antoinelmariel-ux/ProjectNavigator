// Dernier tour avant lancement. Sans jalon opposable dans l'organisation, ce round ne peut rien
// bloquer : sa force est d'être demandé explicitement par le porteur, de ne coûter que deux
// minutes à l'expert, et de rendre visible le projet qui part sans lui.
//
// Ce qu'on demande à l'expert n'est pas de tout relire : c'est de confirmer son avis au vu du
// delta. Le cas nominal doit être un clic — sinon le round devient le goulot qui redonne aux
// porteurs l'envie de ne plus rien modifier, c'est-à-dire le problème de départ à l'autre bout
// de la chaîne.
import { PROJECT_VALIDATION_VALIDATED } from './projectValidationStatus.js';
import { getReviewedVersion, getNeedsReviewSince } from './perimeterReview.js';
import {
  buildSubmissionSnapshot,
  getLastSentSnapshot,
  getNarrativeChangesSince,
  getSubmissionVersion
} from './submissionHistory.js';

export const FINAL_ROUND_KEY = '__final_validation_round__';

export const CONFIRMATION_CONFIRMED = 'confirmed';
export const CONFIRMATION_REEXAMINING = 'reexamining';

const toPositiveInteger = (value) => (Number.isInteger(value) && value > 0 ? value : 0);
const toText = (value) => (typeof value === 'string' ? value : '');

export const normalizeFinalValidationRound = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { round: 0, requestedAt: '', requestedBy: '', version: 0, history: [], remindersSent: {} };
  }

  return {
    round: toPositiveInteger(value.round),
    requestedAt: toText(value.requestedAt),
    requestedBy: toText(value.requestedBy),
    version: toPositiveInteger(value.version),
    history: Array.isArray(value.history)
      ? value.history
        .filter((entry) => toPositiveInteger(entry?.round) > 0)
        .map((entry) => ({
          round: entry.round,
          requestedAt: toText(entry.requestedAt),
          requestedBy: toText(entry.requestedBy),
          version: toPositiveInteger(entry.version)
        }))
      : [],
    // Les rappels avant lancement sont datés ici plutôt que dans un objet à part : ils portent
    // sur le même événement (le projet va partir) et doivent rester idempotents sans qu'une
    // session puisse les rejouer.
    remindersSent: value.remindersSent && typeof value.remindersSent === 'object' && !Array.isArray(value.remindersSent)
      ? value.remindersSent
      : {}
  };
};

export const getFinalValidationRound = (answers) =>
  normalizeFinalValidationRound(answers && typeof answers === 'object' ? answers[FINAL_ROUND_KEY] : null);

// Rejouable : un lancement repoussé de six mois ne doit pas partir avec une confirmation
// périmée. Chaque demande ouvre un nouveau round et archive le précédent.
export const startFinalValidationRound = (answers, { by = '', version = 0, at } = {}) => {
  const previous = getFinalValidationRound(answers);
  const requestedAt = typeof at === 'string' && at.length > 0 ? at : new Date().toISOString();

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [FINAL_ROUND_KEY]: {
      round: previous.round + 1,
      requestedAt,
      requestedBy: by,
      version: toPositiveInteger(version),
      history: previous.round > 0
        ? [...previous.history, {
          round: previous.round,
          requestedAt: previous.requestedAt,
          requestedBy: previous.requestedBy,
          version: previous.version
        }]
        : previous.history,
      remindersSent: previous.remindersSent
    }
  };
};

export const withPerimeterConfirmation = (entry, { round, state, by = '', at } = {}) => ({
  ...(entry && typeof entry === 'object' ? entry : {}),
  confirmation: {
    round: toPositiveInteger(round),
    state: state === CONFIRMATION_REEXAMINING ? CONFIRMATION_REEXAMINING : CONFIRMATION_CONFIRMED,
    by,
    at: typeof at === 'string' && at.length > 0 ? at : new Date().toISOString()
  }
});

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const pickAnswerKeys = (answers) => Object.keys(answers || {})
  .filter((key) => !key.startsWith('__'))
  .reduce((acc, key) => {
    const value = answers[key];
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

// Un avis tient encore tel quel quand le projet n'a pas bougé depuis qu'il a été rendu : même
// version, aucun champ libre modifié dans une version envoyée depuis, et rien de modifié depuis
// le dernier envoi (champs libres compris — un texte réécrit sans être renvoyé n'est dans aucun
// journal). Sans instantané du dernier envoi (projet antérieur à l'historique) on ne peut pas
// l'affirmer : on demande la confirmation plutôt que d'en dispenser sur une supposition.
export const isPerimeterOpinionCurrent = (project, entry) => {
  const answers = project?.answers;
  if (!answers || typeof answers !== 'object' || !entry?.status) {
    return false;
  }

  const reviewedVersion = getReviewedVersion(entry) || 1;
  if (getNeedsReviewSince(entry) > reviewedVersion || reviewedVersion !== getSubmissionVersion(project)) {
    return false;
  }

  if (getNarrativeChangesSince(answers, reviewedVersion).length > 0) {
    return false;
  }

  const snapshot = getLastSentSnapshot(answers);
  if (!snapshot) {
    return false;
  }

  return stableStringify(pickAnswerKeys(snapshot)) === stableStringify(pickAnswerKeys(buildSubmissionSnapshot(answers)));
};

// Reprendre son avis après la demande vaut confirmation : c'est un acte plus fort que le clic, et
// exiger les deux ferait réclamer à l'expert une formalité juste après son vrai travail. Un avis
// que le projet n'a pas contredit depuis (`isOpinionCurrent`) n'a pas non plus à être reconfirmé ;
// un « je dois réexaminer » explicite de ce tour l'emporte toujours.
export const getPerimeterConfirmationState = (entry, round, requestedAt, { isOpinionCurrent = false } = {}) => {
  const currentRound = toPositiveInteger(round);
  if (currentRound === 0) {
    return '';
  }

  const reviewedAt = toText(entry?.reviewedAt);
  if (reviewedAt && requestedAt && reviewedAt > requestedAt) {
    return CONFIRMATION_CONFIRMED;
  }

  const confirmation = entry?.confirmation;
  if (toPositiveInteger(confirmation?.round) !== currentRound) {
    return isOpinionCurrent ? CONFIRMATION_CONFIRMED : '';
  }

  return confirmation.state === CONFIRMATION_REEXAMINING ? CONFIRMATION_REEXAMINING : CONFIRMATION_CONFIRMED;
};

// Un projet entièrement validé (validé, validé sous conditions et non concerné se valent, c'est
// `computeProjectValidationStatus`) dont aucun avis n'a été contredit depuis n'a rien à faire
// confirmer : demander le tour ne ferait que le refermer aussitôt. Il compte donc comme réglé,
// sans que le porteur ait à l'ouvrir — pas de rappel de lancement, pas de reproche à l'envol.
export const isLaunchSettled = (validation, perimeters = []) =>
  validation?.status === PROJECT_VALIDATION_VALIDATED
  && (Array.isArray(perimeters) ? perimeters : [])
    .filter((perimeter) => perimeter?.hasOpinion)
    .every((perimeter) => perimeter.isOpinionCurrent === true);

// `perimeters` : [{ id, hasOpinion, entry, isOpinionCurrent? }]. Seuls les périmètres qui se sont déjà prononcés
// entrent en confirmation ; ceux qui n'ont jamais répondu relèvent de la sollicitation ordinaire,
// pas d'un tour de confirmation d'un avis qui n'existe pas.
export const getFinalValidationRoundStatus = (answers, perimeters = []) => {
  const round = getFinalValidationRound(answers);
  const concerned = (Array.isArray(perimeters) ? perimeters : []).filter((perimeter) => perimeter?.hasOpinion);

  const pending = [];
  const confirmed = [];
  const reexamining = [];
  const unchanged = [];

  concerned.forEach((perimeter) => {
    const isOpinionCurrent = perimeter.isOpinionCurrent === true;
    const state = getPerimeterConfirmationState(perimeter.entry, round.round, round.requestedAt, { isOpinionCurrent });
    if (state === CONFIRMATION_CONFIRMED) {
      confirmed.push(perimeter.id);
      if (isOpinionCurrent && getPerimeterConfirmationState(perimeter.entry, round.round, round.requestedAt) === '') {
        unchanged.push(perimeter.id);
      }
    } else if (state === CONFIRMATION_REEXAMINING) {
      reexamining.push(perimeter.id);
    } else {
      pending.push(perimeter.id);
    }
  });

  const isRequested = round.round > 0;

  return {
    round: round.round,
    requestedAt: round.requestedAt,
    requestedBy: round.requestedBy,
    isRequested,
    pending,
    confirmed,
    reexamining,
    unchanged,
    // Un round est complet quand chaque avis déjà rendu a été confirmé — et un « je dois
    // réexaminer » non suivi d'un nouvel avis laisse volontairement le round ouvert.
    isComplete: isRequested && concerned.length > 0 && pending.length === 0 && reexamining.length === 0
  };
};

export const markLaunchReminderSent = (answers, thresholdDays, at) => {
  const round = getFinalValidationRound(answers);

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [FINAL_ROUND_KEY]: {
      ...round,
      remindersSent: {
        ...round.remindersSent,
        [String(thresholdDays)]: typeof at === 'string' && at.length > 0 ? at : new Date().toISOString()
      }
    }
  };
};

export const hasLaunchReminderBeenSent = (answers, thresholdDays) =>
  Boolean(getFinalValidationRound(answers).remindersSent[String(thresholdDays)]);
