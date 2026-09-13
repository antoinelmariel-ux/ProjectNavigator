// Les délais de prise en charge sont exprimés en jours ouvrés (décision produit) : un projet
// déclenché un vendredi ne doit pas être « en retard » dès le lundi matin. Aucun calendrier de
// jours fériés n'est pris en compte — l'app ne connaît ni le pays ni les usages locaux des
// équipes, et une approximation lundi-vendredi vaut mieux qu'un référentiel qui dérive.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_SPAN_DAYS = 4000;

const toUtcDayIndex = (value) => {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  const time = parsed.getTime();
  if (!Number.isFinite(time)) {
    return null;
  }
  return Math.floor(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()) / MS_PER_DAY);
};

// 1970-01-01 est un jeudi : l'index de jour modulo 7 vaut 3 ce jour-là.
export const isBusinessDay = (value) => {
  const dayIndex = toUtcDayIndex(value);
  if (dayIndex === null) {
    return false;
  }
  const weekday = (((dayIndex + 4) % 7) + 7) % 7;
  return weekday !== 0 && weekday !== 6;
};

// Nombre de jours ouvrés écoulés sur l'intervalle ouvert-fermé (from, to] : une action faite
// aujourd'hui donne 0, la même action hier (un jour ouvré) donne 1.
export const countBusinessDaysBetween = (fromValue, toValue) => {
  const from = toUtcDayIndex(fromValue);
  const to = toUtcDayIndex(toValue);

  if (from === null || to === null || to <= from) {
    return 0;
  }

  const span = Math.min(to - from, MAX_SPAN_DAYS);
  let count = 0;
  for (let offset = 1; offset <= span; offset += 1) {
    const weekday = (((from + offset + 4) % 7) + 7) % 7;
    if (weekday !== 0 && weekday !== 6) {
      count += 1;
    }
  }
  return count;
};
