const pad = (value) => String(value).padStart(2, '0');

export const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value || '');
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const fromDayKey = (key) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

export const shiftMonth = ({ year, month }, delta) => {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export const getMonthOf = (date) => ({ year: date.getFullYear(), month: date.getMonth() });

// Grille d'un mois, semaines complètes du lundi au dimanche (toujours un nombre entier de
// semaines : 4 à 6 lignes), pour que le calendrier ne saute pas d'un mois à l'autre.
export const buildMonthGrid = ({ year, month }, today = new Date()) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);
  const todayKey = toDayKey(today);
  const weeks = [];
  for (let week = 0; week < weekCount; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(year, month, 1 - offset + week * 7 + day);
      const key = toDayKey(date);
      days.push({ key, date, dayOfMonth: date.getDate(), inMonth: date.getMonth() === month, isToday: key === todayKey });
    }
    weeks.push(days);
  }
  return weeks;
};

export const groupSessionsByDay = (sessions) => {
  const byDay = {};
  (Array.isArray(sessions) ? sessions : []).forEach((session) => {
    const key = toDayKey(session?.startAt);
    if (!key) {
      return;
    }
    (byDay[key] = byDay[key] || []).push(session);
  });
  Object.values(byDay).forEach((list) => list.sort((a, b) => a.startAt.localeCompare(b.startAt)));
  return byDay;
};

// Jour sélectionné à l'ouverture : aujourd'hui s'il y a une séance, sinon la prochaine séance du
// mois affiché, sinon rien (le panneau invite alors à choisir une date).
export const pickInitialDay = (sessionsByDay, month, today = new Date()) => {
  const todayKey = toDayKey(today);
  if (sessionsByDay[todayKey]?.length) {
    return todayKey;
  }
  const prefix = `${month.year}-${pad(month.month + 1)}-`;
  const upcoming = Object.keys(sessionsByDay)
    .filter((key) => key.startsWith(prefix) && key >= todayKey)
    .sort();
  if (upcoming.length > 0) {
    return upcoming[0];
  }
  return '';
};

export const COMMITTEE_COLORS = [
  { solid: '#1d4ed8', soft: '#dbeafe', ink: '#1e3a8a' },
  { solid: '#0f766e', soft: '#ccfbf1', ink: '#134e4a' },
  { solid: '#b45309', soft: '#fef3c7', ink: '#78350f' },
  { solid: '#7e22ce', soft: '#f3e8ff', ink: '#581c87' },
  { solid: '#be123c', soft: '#ffe4e6', ink: '#881337' },
  { solid: '#4d7c0f', soft: '#ecfccb', ink: '#365314' }
];

export const getCommitteeColor = (committees, committeeId) => {
  const index = (Array.isArray(committees) ? committees : []).findIndex((committee) => committee?.id === committeeId);
  return COMMITTEE_COLORS[(index < 0 ? 0 : index) % COMMITTEE_COLORS.length];
};
