// Regroupement des mails de message (avis, réponses de fil, post-its) écrits coup sur coup.
// Chaque message est déposé tout de suite dans CN_NotificationsQueue — rien ne se perd si l'onglet
// se ferme —, mais un message qui arrive alors qu'une ligne de même clé attend encore son envoi y
// est ajouté au lieu d'en créer une autre. Le flux Power Automate attend
// NOTIFICATION_FLOW_DELAY_MINUTES avant de relire la ligne et d'envoyer ce qu'elle contient alors.

export const NOTIFICATION_FLOW_DELAY_MINUTES = 5;
// Une minute de marge sur le délai du flux : passé ce temps, la ligne est peut-être en cours
// d'envoi, et un message ajouté risquerait de ne partir avec rien.
export const NOTIFICATION_GROUP_WINDOW_MS = (NOTIFICATION_FLOW_DELAY_MINUTES - 1) * 60 * 1000;
export const MAX_GROUPED_MESSAGES = 20;
export const MAX_GROUPED_TEXT_LENGTH = 20000;

const toText = (value) => (typeof value === 'string' ? value : '');

const normalizeEmails = (list) => (Array.isArray(list) ? list : [])
  .map((email) => toText(email).trim().toLowerCase())
  .filter(Boolean)
  .sort();

// FNV-1a 32 bits, deux graines : une clé courte (la colonne est une ligne de texte, indexée) mais
// assez longue pour qu'une collision entre deux fils ne soit pas une hypothèse sérieuse.
const fnv1a = (text, seed) => {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

// Même type de mail, même projet, même endroit (le fil d'un périmètre, la vitrine) et mêmes
// destinataires : sans les destinataires dans la clé, un message pourrait partir à quelqu'un à qui
// il n'était pas adressé.
export const buildNotificationGroupKey = ({ type, projectId, target, to = [], cc = [] } = {}) => {
  const source = JSON.stringify([
    toText(type),
    toText(projectId),
    toText(target),
    normalizeEmails(to),
    normalizeEmails(cc)
  ]);
  return `grp-${fnv1a(source, 0x811c9dc5)}${fnv1a(source, 0x01000193)}`;
};

export const normalizeGroupedMessages = (value) => (Array.isArray(value) ? value : [])
  .filter((message) => message && typeof message === 'object')
  .map((message) => ({
    id: toText(message.id),
    actorName: toText(message.actorName),
    actorEmail: toText(message.actorEmail),
    text: toText(message.text),
    at: toText(message.at),
    appUrl: toText(message.appUrl)
  }))
  .filter((message) => message.text.trim() || message.id);

// Peut-on encore ajouter ce message à la ligne en attente ? Assez récente (le flux ne l'a pas
// encore relue), pas encore trop chargée — au-delà, le message ouvre une nouvelle ligne.
export const canJoinNotificationGroup = ({ createdAt, messages, message, now = Date.now() }) => {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created) || now - created > NOTIFICATION_GROUP_WINDOW_MS || now < created - 60 * 1000) {
    return false;
  }
  const current = normalizeGroupedMessages(messages);
  if (current.length >= MAX_GROUPED_MESSAGES) {
    return false;
  }
  const totalLength = current.reduce((sum, entry) => sum + entry.text.length, 0) + toText(message?.text).length;
  return totalLength <= MAX_GROUPED_TEXT_LENGTH;
};

// Ajoute le message à la suite ; un message déjà présent (même identifiant) n'est pas recopié.
export const appendGroupedMessage = (messages, message) => {
  const current = normalizeGroupedMessages(messages);
  const [next] = normalizeGroupedMessages([message]);
  if (!next) {
    return current;
  }
  if (next.id && current.some((entry) => entry.id === next.id)) {
    return current;
  }
  return [...current, next];
};
