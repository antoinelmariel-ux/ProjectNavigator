// Palette d'accents de la vitrine.
//
// Les couleurs proposées sont *celles du thème*, telles qu'elles sont déclarées dans sa
// palette : aucune teinte n'est composée, aucune harmonie n'est fabriquée. Un thème riche
// propose beaucoup de pastilles, un thème resserré en propose peu — c'est l'inventaire réel
// de sa palette, pas une grille à remplir. Les versions précédentes imposaient huit teintes
// d'ancrage identiques partout, si bien qu'un thème sans un pixel de vert offrait quand même
// un « vert », puis complétaient par harmonie, ce qui revenait à inventer des couleurs que
// la marque n'avait jamais choisies.
//
// Les pastilles ne portent donc pas de nom de couleur : elles sont désignées par leur rang,
// ce qui les libère de toute contrainte de vocabulaire. Deux couleurs du thème qui ne
// diffèrent que par la clarté (un bordeaux et son rose poudré) sont deux choix légitimes, ce
// qu'un nommage interdisait.
//
// Les identifiants sont positionnels et stables (`accent-1` … `accent-8`) et persistés dans
// les réponses du projet (`showcaseSectionAccents`, `customShowcaseSections[].accentFamily`) :
// un projet qui a choisi la 3e pastille garde la 3e pastille quand le thème change, transcrite
// dans la nouvelle palette. Les anciens identifiants nommés (`rouge`, `orange`, …) sont relus
// et convertis à la position qu'ils occupaient dans l'ancien sélecteur.

export const THEME_ACCENT_FAMILY_ID = 'theme';

export const MAX_ACCENT_FAMILY_COUNT = 8;

export const ACCENT_FAMILY_IDS = Array.from(
  { length: MAX_ACCENT_FAMILY_COUNT },
  (unused, index) => `accent-${index + 1}`
);

// Ordre exact de l'ancien sélecteur nommé : c'est lui qui donne la position de reprise.
const LEGACY_FAMILY_IDS = ['rouge', 'orange', 'or', 'vert', 'turquoise', 'bleu', 'violet', 'rose'];

// Champs de palette passés en revue, du plus caractéristique au plus accessoire. L'ordre est
// aussi celui des pastilles : les couleurs signature du thème occupent les premiers rangs.
const PALETTE_COLOR_KEYS = [
  'accentSecondary',
  'highlight',
  'glowPrimary',
  'glowSecondary',
  'titleGradientStart',
  'titleGradientMid',
  'titleGradientEnd',
  'ctaStart',
  'ctaEnd',
  'panelStrongStart',
  'panelStrongEnd',
  'panelSoftStart',
  'panelSoftEnd',
  'heroBackgroundMid',
  'heroBackgroundEnd',
  'surface',
  'backgroundMid',
  'backgroundEnd',
  'inkSoft',
  'border',
  'textSecondary'
];

// Une couleur ne peut tenir le rôle d'accent que si elle porte une teinte lisible et n'est
// ni un fond quasi noir ni un blanc cassé : sinon la pastille est indistincte et tous les
// rôles qu'on en dérive (texte, panneau, bande sombre) s'éloignent trop de la couleur montrée.
// `inkMuted` est exclu de la revue pour la même raison : c'est un gris de texte, jamais une
// couleur de marque.
const MIN_ACCENT_SATURATION = 0.22;
const MIN_ACCENT_LIGHTNESS = 0.2;
const MAX_ACCENT_LIGHTNESS = 0.85;

// Écart perceptuel minimal (ΔE76) entre deux pastilles, et entre une pastille et l'accent du
// thème. En deçà, les deux points de couleur du sélecteur ne se distinguent plus à l'œil.
const MIN_ACCENT_DELTA_E = 15;

const MIN_TEXT_CONTRAST = 4.5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseHex = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return null;
  }
  let hex = trimmed.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const numeric = parseInt(hex, 16);
  return { r: (numeric >> 16) & 255, g: (numeric >> 8) & 255, b: numeric & 255 };
};

const toHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) {
    h = 60 * (((gn - bn) / delta) % 6);
  } else if (max === gn) {
    h = 60 * ((bn - rn) / delta + 2);
  } else {
    h = 60 * ((rn - gn) / delta + 4);
  }
  return { h: (h + 360) % 360, s, l };
};

const hslToRgb = ({ h, s, l }) => {
  const safeS = clamp(s, 0, 1);
  const safeL = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * safeL - 1)) * safeS;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1
    ? [c, x, 0]
    : hp < 2
      ? [x, c, 0]
      : hp < 3
        ? [0, c, x]
        : hp < 4
          ? [0, x, c]
          : hp < 5
            ? [x, 0, c]
            : [c, 0, x];
  const m = safeL - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
};

const hsl = (h, s, l) => toHex(hslToRgb({ h, s, l }));

const mix = (from, to, ratio) => {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) {
    return a ? toHex(a) : toHex(b || { r: 0, g: 0, b: 0 });
  }
  const amount = clamp(ratio, 0, 1);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount
  });
};

const toLinear = (channel) => {
  const ratio = channel / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (value) => {
  const rgb = parseHex(value);
  if (!rgb) {
    return 0;
  }
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground, background) => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
};

// L*a*b* (D65) : la distinction entre deux pastilles se juge à l'œil, pas en RVB où deux
// couleurs très proches numériquement peuvent sauter aux yeux, et l'inverse.
const rgbToLab = (rgb) => {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(toLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = value => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const [fx, fy, fz] = [x, y, z].map(f);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

const deltaE = (first, second) =>
  Math.hypot(first.l - second.l, first.a - second.a, first.b - second.b);

// Rapproche la couleur du noir (sur fond clair) ou du blanc (sur fond sombre) jusqu'à tenir
// le ratio demandé. La teinte et la saturation de la couleur du thème ne bougent pas : seule
// sa clarté descend ou monte, le strict minimum pour que le texte reste lisible.
const enforceContrast = (h, s, startL, background, { lighten = false } = {}) => {
  const step = lighten ? 0.03 : -0.03;
  let l = clamp(startL, 0.04, 0.96);
  let candidate = hsl(h, s, l);

  for (let i = 0; i < 32; i += 1) {
    if (contrastRatio(candidate, background) >= MIN_TEXT_CONTRAST) {
      return candidate;
    }
    l = clamp(l + step, 0.04, 0.96);
    candidate = hsl(h, s, l);
  }
  return candidate;
};

const readColor = (palette, key) => parseHex(palette && palette[key]);

// Socle sombre réel de la vitrine : `.sg-shell` peint `--sg-ink`, qui vaut la plus sombre
// du fond de page et de l'encre forte (cf. buildSignatureVariables). Sur les thèmes à fond
// clair, c'est l'encre qui fait office de nuit — les bandes « sombres » le restent.
const resolveGround = (palette) => {
  const background = readColor(palette, 'backgroundStart');
  const ink = readColor(palette, 'inkStrong');
  if (!background) {
    return ink ? toHex(ink) : '#1b1b1b';
  }
  if (!ink) {
    return toHex(background);
  }
  const backgroundHex = toHex(background);
  const inkHex = toHex(ink);
  return relativeLuminance(backgroundHex) <= relativeLuminance(inkHex) ? backgroundHex : inkHex;
};

// Couleurs de la palette utilisables comme accent, dans l'ordre des champs.
const collectPaletteColors = palette =>
  PALETTE_COLOR_KEYS
    .map((key) => {
      const rgb = readColor(palette, key);
      if (!rgb) {
        return null;
      }
      const { h, s, l } = rgbToHsl(rgb);
      if (s < MIN_ACCENT_SATURATION || l < MIN_ACCENT_LIGHTNESS || l > MAX_ACCENT_LIGHTNESS) {
        return null;
      }
      return { key, hex: toHex(rgb), h, s, l, lab: rgbToLab(rgb) };
    })
    .filter(Boolean);

// Ne garde qu'une couleur par « point de couleur » perçu : la première rencontrée, donc la
// plus caractéristique du thème. Une couleur trop proche de l'accent du thème est écartée,
// la pastille « Thème » la propose déjà.
const pickDistinctColors = (candidates, themeLab) => {
  const picked = [];
  for (const candidate of candidates) {
    if (picked.length >= MAX_ACCENT_FAMILY_COUNT) {
      break;
    }
    if (themeLab && deltaE(candidate.lab, themeLab) < MIN_ACCENT_DELTA_E) {
      continue;
    }
    if (picked.some(entry => deltaE(entry.lab, candidate.lab) < MIN_ACCENT_DELTA_E)) {
      continue;
    }
    picked.push(candidate);
  }
  return picked;
};

// Les rôles dérivés (texte sur bande claire, bande sombre, panneau teinté, ombre du dégradé)
// partent tous de la couleur du thème elle-même ; seule la clarté bouge, et seulement autant
// qu'il faut pour rester lisible. `g1` reste la couleur de la palette, sans retouche : c'est
// elle que montre la pastille.
const buildFamily = (id, color, palette) => {
  const surfaceLight = toHex(readColor(palette, 'surfaceLight') || { r: 248, g: 250, b: 252 });
  const surfaceLightAlt = toHex(readColor(palette, 'surfaceLightAlt') || { r: 226, g: 232, b: 240 });
  const ground = resolveGround(palette);
  // Un socle déjà clair (thème sans encre sombre) demanderait au contraire une teinte
  // foncée : on suit la luminance plutôt que de supposer une nuit.
  const groundIsDark = relativeLuminance(ground) < 0.28;

  const { hex, h, s, l } = color;

  return {
    id,
    hex,
    c: enforceContrast(h, s, l, mix(surfaceLightAlt, hex, 0.22)),
    g1: hex,
    g2: hsl(h, clamp(s + 0.06, 0, 1), clamp(l - 0.18, 0.1, 0.92)),
    p1: mix(surfaceLight, hex, 0.07),
    p2: mix(surfaceLightAlt, hex, 0.22),
    onDark: enforceContrast(h, s, l, ground, { lighten: groundIsDark })
  };
};

const describeColor = (hex) => {
  const rgb = parseHex(hex);
  if (!rgb) {
    return null;
  }
  const { h, s, l } = rgbToHsl(rgb);
  return { hex: toHex(rgb), h, s, l, lab: rgbToLab(rgb) };
};

/**
 * Couleurs d'accent d'un thème : « thème » (son accent principal, valeur par défaut de toute
 * section) suivie des autres couleurs réellement déclarées dans sa palette, dédoublonnées à
 * l'œil. Le nombre de pastilles dépend donc de la richesse du thème.
 */
export const buildAccentFamilies = (palette = {}) => {
  const candidates = collectPaletteColors(palette);
  const themeColor =
    describeColor(palette.accentPrimary)
    || (candidates.length > 0 ? candidates[0] : describeColor('#2563eb'));

  const themeFamily = buildFamily(THEME_ACCENT_FAMILY_ID, themeColor, palette);
  const accents = pickDistinctColors(
    candidates.filter(candidate => candidate.hex !== themeColor.hex),
    themeColor.lab
  );

  return [
    themeFamily,
    ...accents.map((color, index) => buildFamily(ACCENT_FAMILY_IDS[index], color, palette))
  ];
};

/**
 * Identifiant de famille canonique, ou `null` s'il n'en désigne aucune. Les anciens
 * identifiants nommés sont convertis à la position qu'ils occupaient dans l'ancien
 * sélecteur, pour qu'une vitrine déjà colorée garde le même rang de pastille.
 */
export const normalizeAccentFamilyId = (familyId) => {
  if (familyId === THEME_ACCENT_FAMILY_ID) {
    return THEME_ACCENT_FAMILY_ID;
  }
  if (ACCENT_FAMILY_IDS.includes(familyId)) {
    return familyId;
  }
  const legacyIndex = LEGACY_FAMILY_IDS.indexOf(familyId);
  return legacyIndex >= 0 ? ACCENT_FAMILY_IDS[legacyIndex] : null;
};

/**
 * Famille effective d'une section. Une valeur absente, `theme`, ou un rang que le thème
 * courant ne propose pas (sa palette est plus pauvre que la précédente) renvoie la famille
 * du thème : c'est le défaut, et ne pas la stocker garde la vitrine alignée si la marque
 * change de palette.
 */
export const resolveAccentFamily = (familyId, families) => {
  const list = Array.isArray(families) && families.length > 0 ? families : buildAccentFamilies();
  const normalized = normalizeAccentFamilyId(familyId);
  if (!normalized || normalized === THEME_ACCENT_FAMILY_ID) {
    return list[0];
  }
  return list.find(family => family.id === normalized) || list[0];
};

export const isKnownAccentFamilyId = familyId => normalizeAccentFamilyId(familyId) !== null;
