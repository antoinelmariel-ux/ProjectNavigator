// Options d'un lien de vitrine partagée, réunies dans un jeton opaque.
//
// Elles voyageaient auparavant en clair dans l'URL (`showcaseShared=1&showcaseMode=light`) :
// n'importe quel destinataire d'un lien « allégé » n'avait qu'à retirer `showcaseMode=light`
// pour ouvrir la vitrine complète. Le jeton regroupe projet, mode d'affichage, commentaires et
// visibilité des post-its, brouillés et scellés par une somme de contrôle : une URL retouchée à
// la main ne se décode plus et n'ouvre aucune vitrine. Ce n'est pas du chiffrement — sans
// serveur, l'app ne peut garder aucun secret — mais la modification triviale n'est plus possible.

export const SHOWCASE_SHARE_PARAM = 'sv';

// Paramètres des liens émis avant le jeton : toujours lus à l'ouverture (les liens déjà
// partagés doivent continuer à fonctionner), jamais réécrits.
export const LEGACY_SHOWCASE_SHARE_PARAMS = [
  'showcaseShared',
  'showcaseMode',
  'showcaseComments',
  'showcaseAnnotationVisibility'
];

const TOKEN_VERSION = '1';
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const OBFUSCATION_KEY = [0x5b, 0xc2, 0x37, 0x9e, 0x14, 0xa6, 0x7d, 0xe3];

const asciiToBytes = (value) => {
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    bytes.push(value.charCodeAt(index) & 0xff);
  }
  return bytes;
};

const bytesToAscii = (bytes) => bytes.map((byte) => String.fromCharCode(byte)).join('');

const fnv1a32 = (bytes) => {
  let hash = 0x811c9dc5;
  bytes.forEach((byte) => {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  });
  return hash >>> 0;
};

const applyObfuscation = (bytes) => bytes.map(
  (byte, index) => byte ^ OBFUSCATION_KEY[index % OBFUSCATION_KEY.length]
);

const bytesToToken = (bytes) => {
  let token = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    token += TOKEN_ALPHABET[first >> 2];
    token += TOKEN_ALPHABET[((first & 0x03) << 4) | ((second === undefined ? 0 : second) >> 4)];

    if (second === undefined) {
      break;
    }

    token += TOKEN_ALPHABET[((second & 0x0f) << 2) | ((third === undefined ? 0 : third) >> 6)];

    if (third === undefined) {
      break;
    }

    token += TOKEN_ALPHABET[third & 0x3f];
  }

  return token;
};

const tokenToBytes = (token) => {
  const bytes = [];
  let buffer = 0;
  let bits = 0;

  for (let index = 0; index < token.length; index += 1) {
    const value = TOKEN_ALPHABET.indexOf(token[index]);
    if (value < 0) {
      return null;
    }

    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
};

export const encodeShowcaseShareToken = (settings) => {
  const projectId = typeof settings?.projectId === 'string' ? settings.projectId.trim() : '';

  if (!projectId) {
    return '';
  }

  const payload = [
    TOKEN_VERSION,
    encodeURIComponent(projectId),
    settings?.displayMode === 'light' ? 'l' : 'f',
    settings?.commentsEnabled ? '1' : '0',
    settings?.annotationVisibility === 'mine' ? 'm' : 'a'
  ].join('|');

  const payloadBytes = asciiToBytes(payload);
  const checksum = fnv1a32(payloadBytes);
  const sealed = [
    (checksum >>> 24) & 0xff,
    (checksum >>> 16) & 0xff,
    (checksum >>> 8) & 0xff,
    checksum & 0xff,
    ...payloadBytes
  ];

  return bytesToToken(applyObfuscation(sealed));
};

export const decodeShowcaseShareToken = (token) => {
  if (typeof token !== 'string' || token.length < 8) {
    return null;
  }

  const sealed = tokenToBytes(token);

  if (!sealed || sealed.length < 5) {
    return null;
  }

  const bytes = applyObfuscation(sealed);
  const expectedChecksum = (
    (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
  ) >>> 0;
  const payloadBytes = bytes.slice(4);

  if (fnv1a32(payloadBytes) !== expectedChecksum) {
    return null;
  }

  const [version, rawProjectId, mode, comments, visibility] = bytesToAscii(payloadBytes).split('|');

  if (version !== TOKEN_VERSION || !rawProjectId) {
    return null;
  }

  let projectId = '';
  try {
    projectId = decodeURIComponent(rawProjectId);
  } catch (error) {
    return null;
  }

  if (!projectId) {
    return null;
  }

  return {
    projectId,
    displayMode: mode === 'l' ? 'light' : 'full',
    commentsEnabled: comments === '1',
    annotationVisibility: visibility === 'm' ? 'mine' : 'all'
  };
};

export const readShowcaseShareToken = (search) => {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const token = params.get(SHOWCASE_SHARE_PARAM);

  if (!token) {
    return null;
  }

  return decodeShowcaseShareToken(token);
};

export const isSharedShowcaseSearch = (search) => {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');

  if (params.get(SHOWCASE_SHARE_PARAM)) {
    return Boolean(readShowcaseShareToken(search));
  }

  const rawShared = params.get('showcaseShared');

  return rawShared === '1' || rawShared === 'true';
};
