// Palette d'accents de la vitrine.
//
// Une seule liste de familles par thème, partagée par les sections intégrées (« Couleur de
// section ») et par les blocs personnalisés : les deux sélecteurs proposent exactement les
// mêmes teintes, et ces teintes sont celles du thème actif. Rien n'est posé en surcouche
// fixe par-dessus la palette — chaque famille est une vraie couleur, reprise du thème quand
// il en contient une dans la bonne tonalité, sinon composée sur la signature du thème
// (saturation médiane de ses couleurs) pour rester dans la même famille visuelle.
//
// Les identifiants sont stables et persistés dans les réponses du projet
// (`showcaseSectionAccents`, `customShowcaseSections[].accentFamily`) : seules leurs valeurs
// changent d'un thème à l'autre, jamais leur nom.

export const THEME_ACCENT_FAMILY_ID = 'theme';

// Les teintes d'ancrage sont espacées d'au moins 25° sur la roue, sauf « or » que sa
// clarté et sa faible saturation distinguent nettement de « orange ».
const ACCENT_ANCHORS = [
  { id: 'rouge', hue: 2 },
  { id: 'orange', hue: 30 },
  { id: 'or', hue: 47, metallic: true },
  { id: 'vert', hue: 142 },
  { id: 'turquoise', hue: 182 },
  { id: 'bleu', hue: 212 },
  { id: 'violet', hue: 272 },
  { id: 'rose', hue: 322 }
];

export const ACCENT_FAMILY_IDS = ACCENT_ANCHORS.map(anchor => anchor.id);

// Champs de palette où chercher une couleur déjà présente dans le thème, du plus
// caractéristique au plus accessoire : à teinte égale, la première gagne.
const PALETTE_COLOR_KEYS = [
  'accentPrimary',
  'accentSecondary',
  'highlight',
  'glowPrimary',
  'glowSecondary',
  'titleGradientStart',
  'titleGradientMid',
  'titleGradientEnd',
  'ctaStart',
  'ctaEnd',
  'border'
];

// Au-delà, la couleur du thème n'est plus perçue comme appartenant à la famille visée :
// mieux vaut en composer une à la teinte d'ancrage que de trahir le nom du swatch.
const HUE_MATCH_TOLERANCE = 24;

const MIN_TEXT_CONTRAST = 4.5;

// Écart minimal entre une famille nommée et la famille « thème » : en deçà, les deux
// pastilles du sélecteur sont indiscernables et le choix perd son sens.
const MIN_THEME_HUE_GAP = 18;

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

const relativeLuminance = (value) => {
  const rgb = parseHex(value);
  if (!rgb) {
    return 0;
  }
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground, background) => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
};

// Rapproche la couleur du noir (sur fond clair) ou du blanc (sur fond sombre) jusqu'à tenir
// le ratio demandé. La teinte ne bouge pas : seule la clarté descend ou monte, ce qui garde
// le swatch reconnaissable même quand le fond du thème est exigeant.
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

const hueDistance = (a, b) => {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
};

// Couleurs du thème réellement exploitables comme accent : les quasi-neutres (gris, blancs
// cassés) n'ont pas de teinte lisible et donneraient un swatch indifférenciable des autres.
const collectThemeHues = (palette) =>
  PALETTE_COLOR_KEYS
    .map((key) => {
      const rgb = readColor(palette, key);
      if (!rgb) {
        return null;
      }
      const { h, s, l } = rgbToHsl(rgb);
      return s >= 0.18 && l >= 0.12 && l <= 0.88 ? { key, h, s, l } : null;
    })
    .filter(Boolean);

// Écarte une teinte de celle du thème, dans la direction qui l'éloigne le moins de son
// ancrage : la famille reste reconnaissable (un bleu reste bleu) tout en se détachant de la
// pastille « thème » sur un thème de la même tonalité.
const separateFromTheme = (hue, themeHue, anchorHue) => {
  if (hueDistance(hue, themeHue) >= MIN_THEME_HUE_GAP) {
    return hue;
  }
  const signed = ((anchorHue - themeHue + 540) % 360) - 180;
  const direction = signed >= 0 ? 1 : -1;
  return (themeHue + direction * MIN_THEME_HUE_GAP + 360) % 360;
};

const medianSaturation = (entries) => {
  if (entries.length === 0) {
    return 0.58;
  }
  const sorted = entries.map(entry => entry.s).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return clamp(value, 0.36, 0.82);
};

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

const buildFamily = (id, hue, saturation, palette, { metallic = false } = {}) => {
  const surfaceLight = toHex(readColor(palette, 'surfaceLight') || { r: 248, g: 250, b: 252 });
  const surfaceLightAlt = toHex(readColor(palette, 'surfaceLightAlt') || { r: 226, g: 232, b: 240 });
  const ground = resolveGround(palette);
  // Un socle déjà clair (thème sans encre sombre) demanderait au contraire une teinte
  // foncée : on suit la luminance plutôt que de supposer une nuit.
  const groundIsDark = relativeLuminance(ground) < 0.28;

  // L'or est une couleur claire et peu saturée : lui appliquer la saturation du thème le
  // transformerait en second orange, et les deux swatches deviendraient interchangeables.
  const s = metallic ? clamp(saturation * 0.62, 0.3, 0.52) : saturation;
  const gradientStartL = metallic ? 0.66 : 0.52;
  const gradientEndL = metallic ? 0.4 : 0.29;

  const p1 = mix(surfaceLight, hsl(hue, s, 0.5), 0.07);
  const p2 = mix(surfaceLightAlt, hsl(hue, s, 0.5), 0.22);

  return {
    id,
    // `c` s'écrit aussi bien sur la bande blanche que sur le panneau teinté : c'est p2, le
    // plus foncé des deux, qui fixe la contrainte.
    c: enforceContrast(hue, clamp(s * 0.95, 0.2, 0.9), metallic ? 0.36 : 0.4, p2),
    g1: hsl(hue, s, gradientStartL),
    g2: hsl(hue, clamp(s + 0.08, 0, 1), gradientEndL),
    p1,
    p2,
    onDark: enforceContrast(
      hue,
      clamp(s * 0.82, 0.2, 0.9),
      groundIsDark ? (metallic ? 0.7 : 0.64) : 0.4,
      ground,
      { lighten: groundIsDark }
    )
  };
};

/**
 * Familles de couleur d'un thème : « thème » (la couleur d'accent du thème lui-même, valeur
 * par défaut de toute section) suivie des familles nommées. Chaque famille reprend la
 * couleur du thème dont la teinte est la plus proche de son ancrage ; à défaut, elle est
 * composée sur la teinte d'ancrage avec la saturation médiane du thème.
 */
export const buildAccentFamilies = (palette = {}) => {
  const themeHues = collectThemeHues(palette);
  const saturation = medianSaturation(themeHues);

  const accentPrimary = readColor(palette, 'accentPrimary');
  const themeSeed = accentPrimary ? rgbToHsl(accentPrimary) : { h: 217, s: saturation, l: 0.5 };
  const themeFamily = buildFamily(
    THEME_ACCENT_FAMILY_ID,
    themeSeed.h,
    clamp(themeSeed.s || saturation, 0.3, 0.9),
    palette
  );

  // `accentPrimary` a déjà servi à la famille « thème » : la reprendre pour une famille
  // nommée produirait deux swatches identiques dans le même sélecteur.
  const claimed = new Set(['accentPrimary']);
  const families = ACCENT_ANCHORS.map((anchor) => {
    const match = themeHues
      .filter(entry => !claimed.has(entry.key) && hueDistance(entry.h, anchor.hue) <= HUE_MATCH_TOLERANCE)
      .sort((a, b) => hueDistance(a.h, anchor.hue) - hueDistance(b.h, anchor.hue))[0];

    if (match) {
      claimed.add(match.key);
      return buildFamily(anchor.id, separateFromTheme(match.h, themeSeed.h, anchor.hue), clamp(match.s, 0.3, 0.9), palette, anchor);
    }
    return buildFamily(anchor.id, separateFromTheme(anchor.hue, themeSeed.h, anchor.hue), saturation, palette, anchor);
  });

  return [themeFamily, ...families];
};

/**
 * Famille effective d'une section. Une valeur absente ou `theme` renvoie la famille du
 * thème : c'est le défaut, et ne pas la stocker garde la vitrine alignée si la marque
 * change de palette.
 */
export const resolveAccentFamily = (familyId, families) => {
  const list = Array.isArray(families) && families.length > 0 ? families : buildAccentFamilies();
  if (!familyId || familyId === THEME_ACCENT_FAMILY_ID) {
    return list[0];
  }
  return list.find(family => family.id === familyId) || list[0];
};

export const isKnownAccentFamilyId = (familyId) =>
  familyId === THEME_ACCENT_FAMILY_ID || ACCENT_FAMILY_IDS.includes(familyId);
