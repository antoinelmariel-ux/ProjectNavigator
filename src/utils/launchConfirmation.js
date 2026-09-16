// Sans jalon formel dans l'organisation, rien ne peut bloquer un lancement : la seule force de ce
// dernier tour est la visibilité. D'où un état franc, porté par la carte d'accueil, la synthèse et
// la vitrine partagée — celle-là même que le porteur montre à ses parties prenantes.
export const LAUNCH_DATE_QUESTION_ID = 'launchDate';

export const LAUNCH_CONFIRMATION_NONE = 'none';
export const LAUNCH_CONFIRMATION_DUE = 'due';
export const LAUNCH_CONFIRMATION_AWAITING = 'awaiting';
export const LAUNCH_CONFIRMATION_CONFIRMED = 'confirmed';
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
  if (roundStatus?.isComplete) {
    return LAUNCH_CONFIRMATION_CONFIRMED;
  }

  const days = getDaysUntilLaunch(answers, now);
  const thresholds = normalizeLaunchReminderDays(reminderDays);

  if (days !== null && days < 0) {
    // La date annoncée est passée sans confirmation complète : c'est le cas que le tableau de
    // bord administrateur doit voir, précisément parce que rien n'a pu l'empêcher.
    return LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT;
  }

  if (roundStatus?.isRequested) {
    return LAUNCH_CONFIRMATION_AWAITING;
  }

  if (days !== null && thresholds.first > 0 && days <= thresholds.first) {
    return LAUNCH_CONFIRMATION_DUE;
  }

  return LAUNCH_CONFIRMATION_NONE;
};

// Le seuil dont le rappel est dû maintenant, ou `null`. Le seuil le plus proche du lancement
// l'emporte : à J-5, c'est le rappel « agir » qui part, pas celui « prévoir ».
export const getDueLaunchReminder = ({ answers, roundStatus, now = new Date(), reminderDays } = {}) => {
  if (roundStatus?.isComplete) {
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
