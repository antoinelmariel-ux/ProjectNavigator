import { normalizeEmail } from './normalizeEmail.js';

// Une réponse du fil (expert ↔ porteur) reste modifiable par son auteur tant que personne
// d'autre n'a écrit après elle : une fois qu'on lui a répondu, la changer réécrirait ce à quoi
// l'autre a répondu. Seules les réponses sont concernées, jamais l'avis lui-même (qui a son
// propre éditeur). Une modification n'est pas une nouvelle activité : elle garde son id et sa
// date de création, ne notifie personne, et ne laisse qu'une mention « Modifié » (`editedAt`).

const getReplies = (replies) => (Array.isArray(replies) ? replies : []);

export const canEditThreadReply = (replies, replyId, userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!email || typeof replyId !== 'string' || !replyId) {
    return false;
  }

  const list = getReplies(replies);
  const index = list.findIndex((reply) => reply?.id === replyId);
  if (index === -1 || normalizeEmail(list[index]?.authorEmail) !== email) {
    return false;
  }

  return list.slice(index + 1).every((reply) => normalizeEmail(reply?.authorEmail) === email);
};

export const applyThreadReplyEdit = (replies, replyId, { message, userEmail, now } = {}) => {
  const list = getReplies(replies);
  if (!canEditThreadReply(list, replyId, userEmail) || typeof message !== 'string') {
    return null;
  }

  const trimmed = message.trim();
  const target = list.find((reply) => reply?.id === replyId);
  const hasAttachments = Array.isArray(target?.attachments) && target.attachments.length > 0;
  if (!trimmed && !hasAttachments) {
    return null;
  }
  if (trimmed === (typeof target?.message === 'string' ? target.message.trim() : '')) {
    return null;
  }

  const editedAt = typeof now === 'string' && now ? now : new Date().toISOString();
  return list.map((reply) => (reply?.id === replyId ? { ...reply, message: trimmed, editedAt } : reply));
};
