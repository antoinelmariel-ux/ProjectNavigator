// Bloc « Galerie média » de la vitrine : un titre, un ou plusieurs médias (image, vidéo, son,
// vidéo Microsoft Stream) — un carrousel dès qu'il y en a deux — et une légende facultative,
// commune au bloc ou propre à chaque média, placée à gauche, à droite ou sous le média.
// Logique pure, sans React ni DOM : `npm test` la couvre.

export const MEDIA_GALLERY_TYPE = 'media-gallery';

export const MEDIA_KIND_IMAGE = 'image';
export const MEDIA_KIND_VIDEO = 'video';
export const MEDIA_KIND_AUDIO = 'audio';
export const MEDIA_KIND_STREAM = 'stream';

const MEDIA_KINDS = [MEDIA_KIND_IMAGE, MEDIA_KIND_VIDEO, MEDIA_KIND_AUDIO, MEDIA_KIND_STREAM];

export const MEDIA_EXTENSIONS_BY_KIND = {
  [MEDIA_KIND_IMAGE]: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'],
  [MEDIA_KIND_VIDEO]: ['mp4', 'webm', 'mov', 'm4v'],
  [MEDIA_KIND_AUDIO]: ['mp3', 'wav', 'm4a']
};

export const CAPTION_MODE_NONE = 'none';
export const CAPTION_MODE_SHARED = 'shared';
export const CAPTION_MODE_PER_MEDIA = 'per-media';
export const CAPTION_MODES = [CAPTION_MODE_NONE, CAPTION_MODE_SHARED, CAPTION_MODE_PER_MEDIA];

export const CAPTION_POSITIONS = ['left', 'right', 'below'];

export const MIN_MEDIA_WIDTH = 25;
export const MAX_MEDIA_WIDTH = 100;
export const DEFAULT_MEDIA_WIDTH = 60;

const getExtension = (value) => {
  const match = String(value || '').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
};

export const resolveMediaKindFromFile = ({ name, mimeType } = {}) => {
  const extension = getExtension(name);
  const kind = Object.keys(MEDIA_EXTENSIONS_BY_KIND)
    .find((candidate) => MEDIA_EXTENSIONS_BY_KIND[candidate].includes(extension));
  if (kind) {
    return kind;
  }
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return MEDIA_KIND_IMAGE;
  }
  if (mime.startsWith('video/')) {
    return MEDIA_KIND_VIDEO;
  }
  if (mime.startsWith('audio/')) {
    return MEDIA_KIND_AUDIO;
  }
  return null;
};

// Une URL de média finit dans un `src` : seuls http(s) et les data: URL de média (mode local)
// passent, jamais `javascript:` ni un data: d'un autre type.
const isSafeMediaUrl = (url) => {
  if (typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  const trimmed = url.trim();
  if (/^data:/i.test(trimmed)) {
    return /^data:(image|video|audio)\//i.test(trimmed);
  }
  return /^https?:\/\//i.test(trimmed);
};

// L'utilisateur colle soit un lien, soit le code d'intégration complet que Stream propose
// (« Partager › Incorporer ») : on en garde l'URL du `src`.
const extractUrlFromInput = (input) => {
  const raw = String(input || '').trim();
  const iframeSrc = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  const candidate = iframeSrc ? iframeSrc[1] : raw;
  return candidate.replace(/&amp;/g, '&').trim();
};

const isStreamHost = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  return host.endsWith('.sharepoint.com') || host === 'microsoftstream.com' || host.endsWith('.microsoftstream.com');
};

/**
 * Lit ce que l'utilisateur a collé dans le champ « lien Microsoft Stream ». Renvoie l'URL à
 * conserver, ou `null` si ce n'est pas un lien Stream (https, sur SharePoint Online ou
 * microsoftstream.com).
 */
export const parseStreamLink = (input) => {
  const candidate = extractUrlFromInput(input);
  if (!candidate) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || !isStreamHost(parsed.hostname)) {
    return null;
  }
  return parsed.toString();
};

/**
 * Adresse à charger dans l'`<iframe>` du lecteur Stream, ou '' quand le lien ne peut pas
 * être lu dans la page. Seules deux formes sont des lecteurs intégrables : la page
 * `_layouts/15/embed.aspx` de Stream sur SharePoint (celle du code d'intégration) et l'ancien
 * Stream classique (`/video/<id>` → `/embed/video/<id>`). Un lien de partage (`/:v:/…`) ou une
 * page `stream.aspx` ouvre l'application Stream entière : il reste proposé en lien d'ouverture.
 */
export const resolveStreamEmbedUrl = (url) => {
  const link = parseStreamLink(url);
  if (!link) {
    return '';
  }
  const parsed = new URL(link);
  if (/\/_layouts\/15\/embed\.aspx$/i.test(parsed.pathname)) {
    return link;
  }
  if (parsed.hostname.toLowerCase().endsWith('microsoftstream.com')) {
    const classic = parsed.pathname.match(/^\/(?:embed\/)?video\/([A-Za-z0-9-]+)/);
    if (classic) {
      return `${parsed.origin}/embed/video/${classic[1]}`;
    }
  }
  return '';
};

export const createMediaId = () =>
  `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

export const normalizeMediaItem = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const kind = MEDIA_KINDS.includes(raw.kind) ? raw.kind : null;
  if (!kind) {
    return null;
  }
  const url = kind === MEDIA_KIND_STREAM ? parseStreamLink(raw.url) : normalizeString(raw.url);
  if (!url || !isSafeMediaUrl(url)) {
    return null;
  }
  return {
    id: normalizeString(raw.id) || `media-${index + 1}`,
    kind,
    url,
    name: normalizeString(raw.name),
    caption: normalizeString(raw.caption)
  };
};

export const normalizeMediaList = (rawList) => {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const seen = new Set();
  return rawList
    .map(normalizeMediaItem)
    .filter(Boolean)
    .map((item, index) => {
      const id = seen.has(item.id) ? `${item.id}-${index + 1}` : item.id;
      seen.add(id);
      return id === item.id ? item : { ...item, id };
    });
};

export const normalizeCaptionMode = (value) => (CAPTION_MODES.includes(value) ? value : CAPTION_MODE_SHARED);

export const normalizeCaptionPosition = (value) => (CAPTION_POSITIONS.includes(value) ? value : 'right');

export const clampMediaWidth = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MEDIA_WIDTH;
  }
  return Math.round(Math.min(MAX_MEDIA_WIDTH, Math.max(MIN_MEDIA_WIDTH, parsed)));
};

/**
 * Largeur (en % du bloc) obtenue en tirant la poignée jusqu'à `pointerX`. La poignée est sur
 * le bord du média opposé à la légende : à droite quand la légende est à droite ou en
 * dessous, à gauche quand la légende est à gauche. Un média centré (légende dessous) grandit
 * des deux côtés, d'où le double de l'écart au centre.
 */
export const computeMediaWidthFromPointer = ({ pointerX, containerLeft, containerWidth, mediaLeft, mediaRight, captionPosition }) => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return DEFAULT_MEDIA_WIDTH;
  }
  let widthPx;
  if (captionPosition === 'below') {
    const center = containerLeft + containerWidth / 2;
    widthPx = Math.abs(pointerX - center) * 2;
  } else if (captionPosition === 'left') {
    widthPx = mediaRight - pointerX;
  } else {
    widthPx = pointerX - mediaLeft;
  }
  return clampMediaWidth((widthPx / containerWidth) * 100);
};

// Légende réellement affichée pour le média d'indice `index` : '' quand il n'y en a pas, ce
// qui laisse alors toute la place au média.
export const resolveMediaCaption = (section, index) => {
  const mode = normalizeCaptionMode(section?.captionMode);
  if (mode === CAPTION_MODE_NONE) {
    return '';
  }
  if (mode === CAPTION_MODE_SHARED) {
    return normalizeString(section?.description);
  }
  const media = Array.isArray(section?.media) ? section.media : [];
  return normalizeString(media[index]?.caption);
};

export const moveMediaItem = (list, index, delta) => {
  const items = Array.isArray(list) ? list.slice() : [];
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items;
  }
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
  return items;
};

export const clampCarouselIndex = (index, count) => {
  if (!count) {
    return 0;
  }
  const parsed = Number.isFinite(index) ? index : 0;
  return ((parsed % count) + count) % count;
};
