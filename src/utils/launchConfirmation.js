import { isProjectLaunched } from './projectLaunch.js';

// Sans jalon formel dans l'organisation, rien ne peut bloquer un lancement : la seule force de ce
// dernier tour est la visibilité. D'où un état franc, porté par la carte d'accueil, la synthèse et
// la vitrine partagée — celle-là même que le porteur montre à ses parties prenantes.
//
// Ce que ces états ne font *pas* : déduire un lancement d'une date. Une date de lancement est une
// prévision, souvent repoussée, et le porteur attend en général sa confirmation pour partir — la
// dépasser ne dit donc rien sur le projet, seulement sur le calendrier. Un lancement se déclare
// (cf. projectLaunch.js) ; une date dépassée, elle, désigne l'attente, pas une faute.
export const LAUNCH_DATE_QUESTION_ID = 'launchDate';

export const LAUNCH_CONFIRMATION_NONE = 'none';
export const LAUNCH_CONFIRMATION_DUE = 'due';
export const LAUNCH_CONFIRMATION_AWAITING = 'awaiting';
// Le tour est ouvert et la date annoncée est passée : ce n'est pas le porteur qui est en faute,
// c'est le lancement qui attend la compliance. Même donnée qu'avant, sujet inverse.
export const LAUNCH_CONFIRMATION_LATE = 'late';
export const LAUNCH_CONFIRMATION_CONFIRMED = 'confirmed';
// Déclaré lancé alors que le tour n'était pas complet. Vrai par construction : quelqu'un l'a
// constaté, personne ne l'a supposé.
export const LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT = 'launched_without';

// Deux rappels : un pour prévoir, un pour agir. `0` désactive l'un ou l'autre, comme les délais
// de relance des prises en charge.
export const DEFAULT_LAUNCH_REMINDER_DAYS = { first: 30, second: 10 };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

// Jours calendaires et non ouvrés : une date de lancement est un événement du calendrier, pas
// une charge de travail.
export const getDaysUntilLaunch = (answers, now = new Date()) => {
  const launch = startOfDay(answers?.[LAUNCH_DATE_QUESTION_ID]);
  const today = startOfDay(now);

  if (launch === null || today === null) {
    return null;
  }

  return Math.round((launch - today) / MS_PER_DAY);
};

export const normalizeLaunchReminderDays = (value) => {
  const read = (candidate, fallback) => (Number.isInteger(candidate) && candidate >= 0 ? candidate : fallback);

  return {
    first: read(value?.first, DEFAULT_LAUNCH_REMINDER_DAYS.first),
    second: read(value?.second, DEFAULT_LAUNCH_REMINDER_DAYS.second)
  };
};

export const getLaunchConfirmationSignal = ({
  answers,
  roundStatus,
  now = new Date(),
  reminderDays
} = {}) => {
  const isLaunched = isProjectLaunched(answers);

  // Le seul cas qui accuse vraiment quelqu'un, et le seul que l'application ait le droit
  // d'affirmer : le projet a été déclaré lancé, et le tour n'était pas bouclé.
  if (isLaunched && !roundStatus?.isComplete) {
    return LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT;
  }

  if (roundStatus?.isComplete) {
    return LAUNCH_CONFIRMATION_CONFIRMED;
  }

  const days = getDaysUntilLaunch(answers, now);
  const thresholds = normalizeLaunchReminderDays(reminderDays);
  const isOverdue = days !== null && days < 0;

  if (roundStatus?.isRequested) {
    return isOverdue ? LAUNCH_CONFIRMATION_LATE : LAUNCH_CONFIRMATION_AWAITING;
  }

  if (isOverdue || (days !== null && thresholds.first > 0 && days <= thresholds.first)) {
    return LAUNCH_CONFIRMATION_DUE;
  }

  return LAUNCH_CONFIRMATION_NONE;
};

// Le seuil dont le rappel est dû maintenant, ou `null`. Le seuil le plus proche du lancement
// l'emporte : à J-5, c'est le rappel « agir » qui part, pas celui « prévoir ».
export const getDueLaunchReminder = ({ answers, roundStatus, now = new Date(), reminderDays } = {}) => {
  // Rappeler une date de lancement à un projet déjà parti n'a plus d'objet.
  if (roundStatus?.isComplete || isProjectLaunched(answers)) {
    return null;
  }

  const days = getDaysUntilLaunch(answers, now);
  if (days === null || days < 0) {
    return null;
  }

  const thresholds = normalizeLaunchReminderDays(reminderDays);
  const candidates = [thresholds.second, thresholds.first].filter((threshold) => threshold > 0 && days <= threshold);

  return candidates.length > 0 ? candidates[0] : null;
};
