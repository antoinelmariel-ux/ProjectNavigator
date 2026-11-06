// Pièces jointes et liens d'un sujet de l'ordre du jour d'un comité. Ils vivent sur le passage
// (CN_CommitteeSessions.AgendaJson) : seul un lien est stocké, jamais le contenu d'un fichier
// déposé sur SharePoint (bibliothèque CN-Documents). Hors SharePoint, un fichier est une data: URL,
// comme partout ailleurs dans l'application en mode local.

export const AGENDA_ATTACHMENT_FILE = 'file';
export const AGENDA_ATTACHMENT_LINK = 'link';
export const MAX_AGENDA_ATTACHMENTS = 20;

const toText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => toText(value).toLowerCase();
const toIso = (value) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const randomSuffix = () => Math.random().toString(36).slice(2, 8);
export const createAgendaAttachmentId = () => `attachment-${Date.now().toString(36)}-${randomSuffix()}`;

// Un lien saisi à la main : http(s) uniquement (pas de javascript:, pas de file://). Un lien sans
// protocole (« intranet.lfb.fr/… ») est lu en https.
export const normalizeAgendaLinkUrl = (value) => {
  const raw = toText(value);
  if (!raw) {
    return '';
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return '';
    }
    return url.href;
  } catch {
    return '';
  }
};

const isSafeFileUrl = (url) => /^https?:\/\//i.test(url) || /^data:[^,]*,/i.test(url);

const getNameFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return lastSegment || parsed.hostname;
  } catch {
    return url;
  }
};

export const normalizeAgendaAttachment = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const type = value.type === AGENDA_ATTACHMENT_LINK ? AGENDA_ATTACHMENT_LINK : AGENDA_ATTACHMENT_FILE;
  const url = type === AGENDA_ATTACHMENT_LINK ? normalizeAgendaLinkUrl(value.url) : toText(value.url);
  if (!url || (type === AGENDA_ATTACHMENT_FILE && !isSafeFileUrl(url))) {
    return null;
  }
  const base = {
    id: toText(value.id) || createAgendaAttachmentId(),
    type,
    name: toText(value.name) || (type === AGENDA_ATTACHMENT_LINK ? getNameFromUrl(url) : 'document'),
    url,
    addedBy: normalizeEmail(value.addedBy),
    addedAt: toIso(value.addedAt)
  };
  if (type === AGENDA_ATTACHMENT_LINK) {
    return base;
  }
  return {
    ...base,
    path: toText(value.path),
    size: Math.max(0, Math.round(Number(value.size) || 0)),
    mimeType: toText(value.mimeType),
    storage: value.storage === 'sharepoint' ? 'sharepoint' : 'inline'
  };
};

export const normalizeAgendaAttachments = (value) => {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map(normalizeAgendaAttachment)
    .filter((attachment) => attachment && !seen.has(attachment.id) && seen.add(attachment.id))
    .slice(0, MAX_AGENDA_ATTACHMENTS);
};

// Ce qu'il reste à ranger dans la bibliothèque quand une pièce jointe (ou le sujet entier) disparaît.
export const getStoredAgendaFilePaths = (attachments) => normalizeAgendaAttachments(attachments)
  .filter((attachment) => attachment.type === AGENDA_ATTACHMENT_FILE && attachment.storage === 'sharepoint' && attachment.path)
  .map((attachment) => attachment.path);
