// Liens des mails qui relaient un message (avis d'expert, réponse dans un fil, post-it) : ils
// ouvrent l'application sur ce message précis, pas seulement sur le projet. Trois paramètres
// séparés plutôt qu'une valeur composée, parce que rien ne garantit qu'un identifiant d'équipe,
// de comité ou de post-it ne contienne pas le séparateur qu'on aurait choisi.

export const FOCUS_KIND_PARAM = 'focusKind';
export const FOCUS_ID_PARAM = 'focusId';
export const FOCUS_MESSAGE_PARAM = 'focusMessage';
export const FOCUS_PARAM_NAMES = [FOCUS_KIND_PARAM, FOCUS_ID_PARAM, FOCUS_MESSAGE_PARAM];

export const FOCUS_KIND_TEAM = 'team';
export const FOCUS_KIND_COMMITTEE = 'committee';
export const FOCUS_KIND_NOTE = 'note';
const FOCUS_KINDS = [FOCUS_KIND_TEAM, FOCUS_KIND_COMMITTEE, FOCUS_KIND_NOTE];

// Le message visé dans un périmètre de la synthèse : l'avis (statut + commentaire) ou une
// réponse du fil, désignée par son identifiant. Dans un post-it : le post-it lui-même (absent)
// ou l'une de ses réponses.
export const FOCUS_MESSAGE_OPINION = 'opinion';

const MAX_PARAM_LENGTH = 200;

const toParam = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= MAX_PARAM_LENGTH ? text : '';
};

export const normalizeNotificationFocus = (focus) => {
  if (!focus || typeof focus !== 'object') {
    return null;
  }
  const kind = toParam(focus.kind);
  const id = toParam(focus.id);
  if (!FOCUS_KINDS.includes(kind) || !id) {
    return null;
  }
  const message = toParam(focus.message);
  return message ? { kind, id, message } : { kind, id };
};

// Ajoute la cible à une URL de projet déjà construite (buildProjectUrl). Une cible invalide
// laisse l'URL telle quelle : le lien ouvre alors le projet, comme avant.
export const appendNotificationFocus = (url, focus) => {
  const normalized = normalizeNotificationFocus(focus);
  if (!url || !normalized) {
    return url || '';
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(FOCUS_KIND_PARAM, normalized.kind);
    parsed.searchParams.set(FOCUS_ID_PARAM, normalized.id);
    if (normalized.message) {
      parsed.searchParams.set(FOCUS_MESSAGE_PARAM, normalized.message);
    } else {
      parsed.searchParams.delete(FOCUS_MESSAGE_PARAM);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

export const readNotificationFocus = (search) => {
  let params;
  try {
    params = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  } catch {
    return null;
  }
  return normalizeNotificationFocus({
    kind: params.get(FOCUS_KIND_PARAM),
    id: params.get(FOCUS_ID_PARAM),
    message: params.get(FOCUS_MESSAGE_PARAM)
  });
};

// Écran à ouvrir pour une cible : la synthèse (« Enjeux du projet ») pour un périmètre, la
// vitrine pour un post-it.
export const getNotificationFocusView = (focus) => {
  const normalized = normalizeNotificationFocus(focus);
  if (!normalized) {
    return null;
  }
  return normalized.kind === FOCUS_KIND_NOTE ? 'showcase' : 'synthesis';
};

const toEntry = (entry) => (entry && typeof entry === 'object' ? entry : {});

const getReplies = (entry) => (Array.isArray(toEntry(entry).replies) ? toEntry(entry).replies : []);

const trimText = (value) => (typeof value === 'string' ? value.trim() : '');

// Ce qu'une écriture sur un périmètre de la synthèse a réellement apporté : les réponses
// ajoutées au fil, et si l'avis (statut ou commentaire) a changé. C'est ce qui décide du texte
// repris en tête du mail et de l'endroit où son lien mène.
export const describeComplianceEntryChange = (previousEntry, nextEntry) => {
  const previousIds = new Set(getReplies(previousEntry).map((reply) => reply?.id).filter(Boolean));
  const newReplies = getReplies(nextEntry).filter(
    (reply) => reply && (!reply.id || !previousIds.has(reply.id))
  );
  const previous = toEntry(previousEntry);
  const next = toEntry(nextEntry);
  const opinionChanged =
    trimText(previous.comment) !== trimText(next.comment)
    || trimText(previous.status) !== trimText(next.status);
  return { newReplies, opinionChanged };
};

// Une réponse faite d'une pièce jointe seule a quand même un texte à reprendre : son nom.
const formatReplyText = (reply) => {
  const message = trimText(reply?.message);
  const attachmentLines = (Array.isArray(reply?.attachments) ? reply.attachments : [])
    .map((attachment) => trimText(attachment?.name))
    .filter(Boolean)
    .map((name) => `Attachment: ${name}`);
  return [message, ...attachmentLines].filter(Boolean).join('\n');
};

const formatOpinionText = (entry, statusLabels) => {
  const next = toEntry(entry);
  const statusLabel = statusLabels?.[next.status] || '';
  return [statusLabel ? `Status: ${statusLabel}` : '', trimText(next.comment)].filter(Boolean).join('\n');
};

// Texte et cible du mail pour un périmètre modifié. Une nouvelle réponse dans le fil l'emporte :
// c'est ce que la personne vient d'écrire (l'avis, lui, n'a pas bougé). Sinon c'est l'avis.
// `isMeaningful` est faux quand rien de ce qu'un lecteur attend n'a changé — confirmation de la
// revue finale, pièce jointe seule de l'avis, horodatage, prise en charge, suiveurs : aucun mail
// ne doit alors partir, sinon il recopie un avis déjà reçu comme s'il était nouveau.
export const buildComplianceChangeMessage = ({ kind, id, previousEntry, nextEntry, statusLabels = {} }) => {
  const { newReplies, opinionChanged } = describeComplianceEntryChange(previousEntry, nextEntry);
  const lastReply = newReplies[newReplies.length - 1] || null;
  const isMeaningful = newReplies.length > 0 || opinionChanged;
  const replyText = newReplies.map(formatReplyText).filter(Boolean).join('\n\n');

  if (newReplies.length > 0 && !opinionChanged) {
    return {
      text: replyText,
      focus: normalizeNotificationFocus({ kind, id, message: lastReply?.id || '' }),
      isMeaningful
    };
  }

  const opinionText = formatOpinionText(nextEntry, statusLabels);
  return {
    text: [opinionText, replyText].filter(Boolean).join('\n\n'),
    focus: normalizeNotificationFocus({ kind, id, message: FOCUS_MESSAGE_OPINION }),
    isMeaningful
  };
};

// Plusieurs périmètres modifiés d'un coup (un administrateur qui enregistre deux avis) : un
// paragraphe par périmètre, précédé de son nom quand il y en a plusieurs ; le lien mène au
// premier.
export const combineComplianceChangeMessages = (messages) => {
  const meaningful = (Array.isArray(messages) ? messages : []).filter((entry) => entry && entry.text);
  if (meaningful.length === 0) {
    return { text: '', focus: null };
  }
  const text = meaningful.length === 1
    ? meaningful[0].text
    : meaningful.map((entry) => (entry.label ? `${entry.label}\n${entry.text}` : entry.text)).join('\n\n');
  return { text, focus: meaningful[0].focus || null };
};

// Qui attend une réponse à un post-it : l'auteur de la dernière réponse, ou, s'il n'y en a pas
// encore, l'auteur du post-it lui-même (il n'était jamais prévenu de la première réponse).
export const getShowcaseNoteReplyTarget = (note) => {
  const replies = Array.isArray(note?.replies) ? note.replies : [];
  const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
  return trimText(lastReply?.authorEmail || note?.sourceEmail || '').toLowerCase();
};
