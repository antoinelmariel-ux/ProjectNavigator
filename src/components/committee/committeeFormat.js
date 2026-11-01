import { getLocaleTag } from '../../i18n/languages.js';
import { getSessionEndAt } from '../../utils/committeeSessions.js';

const toDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatSessionDay = (iso, language) => {
  const date = toDate(iso);
  return date
    ? new Intl.DateTimeFormat(getLocaleTag(language), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
    : '';
};

export const formatShortDate = (iso, language) => {
  const date = toDate(iso);
  return date
    ? new Intl.DateTimeFormat(getLocaleTag(language), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    : '';
};

export const formatTime = (iso, language) => {
  const date = toDate(iso);
  return date ? new Intl.DateTimeFormat(getLocaleTag(language), { hour: '2-digit', minute: '2-digit' }).format(date) : '';
};

export const formatSessionWindow = (session, language) =>
  `${formatTime(session?.startAt, language)} – ${formatTime(getSessionEndAt(session), language)}`;

// Valeur d'un <input type="datetime-local"> : heure locale, sans fuseau.
export const toDateTimeLocalValue = (iso) => {
  const date = toDate(iso);
  if (!date) {
    return '';
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromDateTimeLocalValue = (value) => {
  const date = toDate(value);
  return date ? date.toISOString() : '';
};

export const getInitials = (email) => {
  const local = String(email || '').split('@')[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2)).toUpperCase();
};

export const getDisplayNameFromEmail = (email) => String(email || '')
  .split('@')[0]
  .split(/[._-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');
