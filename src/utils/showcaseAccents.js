// Palette d'accents de la vitrine.
//
// Les teintes proposées appartiennent au thème actif : elles sont relevées dans sa propre
// palette, et seulement complétées — par harmonie autour de sa teinte signature — quand
// celle-ci n'en contient pas assez de distinctes pour offrir un vrai choix. Aucune grille
// universelle n'est plus posée par-dessus : une liste d'ancrages figés proposait les mêmes
// huit teintes partout, si bien qu'un thème sans un pixel de vert offrait quand même un
// « vert », et que deux thèmes très différents donnaient deux sélecteurs presque identiques.
//
// Les identifiants sont positionnels et stables (`accent-1` … `accent-8`) et persistés dans
// les réponses du projet (`showcaseSectionAccents`, `customShowcaseSections[].accentFamily`) :
// un projet qui a choisi la 3e pastille garde la 3e pastille quand le thème change, transcrite
// dans la nouvelle palette. Les anciens identifiants nommés (`rouge`, `orange`, …) sont relus
// et convertis à la position qu'ils occupaient dans l'ancien sélecteur.

export const THEME_ACCENT_FAMILY_ID = 'theme';

export const ACCENT_FAMILY_COUNT = 8;

export const ACCENT_FAMILY_IDS = Array.from(
  { length: ACCENT_FAMILY_COUNT },
  (unused, index) => `accent-${index + 1}`
);

// Ordre exact de l'ancien sélecteur : c'est lui qui donne la position de reprise.
const LEGACY_FAMILY_IDS = ['rouge', 'orange', 'or', 'vert', 'turquoise', 'bleu', 'violet', 'rose'];

// Noms affichés sous la pastille. Ils ne pilotent plus rien : ils décrivent la teinte
// effectivement produite, pour que le libellé colle à ce que l'utilisateur voit.
const HUE_NAMES = [
  { id: 'rouge', hue: 358 },
  { id: 'orange', hue: 24 },
  { id: 'or', hue: 45 },
  { id: 'citron', hue: 70 },
  { id: 'anis', hue: 95 },
  { id: 'vert', hue: 125 },
  { id: 'emeraude', hue: 155 },
  { id: 'turquoise', hue: 178 },
  { id: 'cyan', hue: 196 },
  { id: 'bleu', hue: 215 },
  { id: 'indigo', hue: 242 },
  { id: 'violet', hue: 270 },
  { id: 'magenta', hue: 300 },
  { id: 'rose', hue: 328 }
];

// Champs de palette où relever les couleurs du thème, du plus caractéristique au plus
// accessoire : l'ordre fixe aussi l'ordre des pastilles, donc les couleurs signature du
// thème occupent les premières positions.
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
  'heroBackgroundEnd',
  'surface',
  'backgroundMid',
  'border'
];

// Écart minimal entre deux pastilles, et entre une pastille et la famille « thème ». En deçà
// les deux teintes se confondent dans le sélecteur et le choix perd son sens.
const MIN_ACCENT_HUE_GAP = 24;

// Harmonies classiques autour de la teinte du thème, de la plus franche à la plus discrète :
// complémentaire, complémentaires divisées, triade, puis décalages intermédiaires. C'est ce
// qui comble le sélecteur d'un thème monochrome sans le faire sortir de son univers.
const HARMONY_OFFSETS = [180, 150, 210, 120, 240, 60, 300, 90, 270, 30, 330];

// Un jaune pur, à la saturation et à la clarté des autres familles, vire au néon et avale le
// texte blanc que la vitrine pose sur les dégradés : on le ramène vers l'or/moutarde.
const YELLOW_BAND_START = 38;
const YELLOW_BAND_END = 78;

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

const median = (values, fallback) => {
  if (values.length === 0) {
    return fallback;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

// Saturation et clarté de référence du thème : ce sont elles qui donnent son caractère au
// sélecteur (un thème profond sort des accents profonds), et elles seules qui s'appliquent
// aux teintes composées. La clarté reste bornée assez bas pour que le texte blanc que la
// vitrine pose sur les dégradés `g1`/`g2` reste lisible.
const themeSaturation = entries => clamp(median(entries.map(entry => entry.s), 0.58), 0.36, 0.82);
const themeLightness = entries => clamp(median(entries.map(entry => entry.l), 0.48), 0.36, 0.56);

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

const buildFamily = (id, { hue, saturation }, palette, lightness) => {
  const surfaceLight = toHex(readColor(palette, 'surfaceLight') || { r: 248, g: 250, b: 252 });
  const surfaceLightAlt = toHex(readColor(palette, 'surfaceLightAlt') || { r: 226, g: 232, b: 240 });
  const ground = resolveGround(palette);
  // Un socle déjà clair (thème sans encre sombre) demanderait au contraire une teinte
  // foncée : on suit la luminance plutôt que de supposer une nuit.
  const groundIsDark = relativeLuminance(ground) < 0.28;

  const isYellow = hue >= YELLOW_BAND_START && hue <= YELLOW_BAND_END;
  const s = isYellow ? clamp(saturation * 0.72, 0.28, 0.62) : saturation;

  const p1 = mix(surfaceLight, hsl(hue, s, 0.5), 0.07);
  const p2 = mix(surfaceLightAlt, hsl(hue, s, 0.5), 0.22);

  return {
    id,
    hue,
    // `c` s'écrit aussi bien sur la bande blanche que sur le panneau teinté : c'est p2, le
    // plus foncé des deux, qui fixe la contrainte.
    c: enforceContrast(hue, clamp(s * 0.95, 0.2, 0.9), 0.4, p2),
    g1: hsl(hue, s, lightness),
    g2: hsl(hue, clamp(s + 0.08, 0, 1), clamp(lightness - 0.23, 0.14, 0.5)),
    p1,
    p2,
    onDark: enforceContrast(
      hue,
      clamp(s * 0.82, 0.2, 0.9),
      groundIsDark ? 0.64 : 0.4,
      ground,
      { lighten: groundIsDark }
    )
  };
};

// Teintes du thème utilisables comme pastilles : on descend la liste des champs par ordre
// de caractère, et on ne retient qu'une teinte par famille visuelle. Celles qui doublonnent
// avec l'accent du thème sont écartées — la pastille « Thème » les propose déjà.
const collectAccentHues = (entries, themeHue) => {
  const selected = [];
  for (const entry of entries) {
    if (selected.length >= ACCENT_FAMILY_COUNT) {
      break;
    }
    if (hueDistance(entry.h, themeHue) < MIN_ACCENT_HUE_GAP) {
      continue;
    }
    if (selected.some(picked => hueDistance(picked.hue, entry.h) < MIN_ACCENT_HUE_GAP)) {
      continue;
    }
    selected.push({ hue: entry.h, saturation: clamp(entry.s, 0.3, 0.9), fromTheme: true });
  }
  return selected;
};

// Complète le sélecteur quand le thème n'offre pas assez de teintes distinctes : d'abord les
// harmonies de sa teinte signature, puis — cas extrême d'un thème très chargé — la teinte
// libre la plus éloignée de toutes les précédentes.
const completeWithHarmonies = (selected, themeHue, saturation) => {
  const families = [...selected];
  const isFree = hue =>
    hueDistance(hue, themeHue) >= MIN_ACCENT_HUE_GAP
    && families.every(family => hueDistance(family.hue, hue) >= MIN_ACCENT_HUE_GAP);

  for (const offset of HARMONY_OFFSETS) {
    if (families.length >= ACCENT_FAMILY_COUNT) {
      return families;
    }
    const hue = (themeHue + offset) % 360;
    if (isFree(hue)) {
      families.push({ hue, saturation, fromTheme: false });
    }
  }

  while (families.length < ACCENT_FAMILY_COUNT) {
    let bestHue = 0;
    let bestGap = -1;
    for (let hue = 0; hue < 360; hue += 2) {
      const gap = families.reduce(
        (smallest, family) => Math.min(smallest, hueDistance(family.hue, hue)),
        hueDistance(hue, themeHue)
      );
      if (gap > bestGap) {
        bestGap = gap;
        bestHue = hue;
      }
    }
    families.push({ hue: bestHue, saturation, fromTheme: false });
  }

  return families;
};

// Nomme chaque pastille d'après la teinte réellement obtenue, sans jamais répéter un nom :
// deux libellés identiques dans le même sélecteur ne distinguent plus rien.
const assignNames = (families) => {
  const pairs = [];
  families.forEach((family, index) => {
    HUE_NAMES.forEach((name) => {
      pairs.push({ index, name: name.id, distance: hueDistance(family.hue, name.hue) });
    });
  });
  pairs.sort((a, b) => a.distance - b.distance);

  const names = new Array(families.length).fill(null);
  const taken = new Set();
  for (const pair of pairs) {
    if (names[pair.index] || taken.has(pair.name)) {
      continue;
    }
    names[pair.index] = pair.name;
    taken.add(pair.name);
  }

  return families.map((family, index) => ({ ...family, name: names[index] || family.id }));
};

/**
 * Familles de couleur d'un thème : « thème » (son accent principal, valeur par défaut de
 * toute section) suivie de huit familles tirées de sa propre palette, complétées par
 * harmonie quand elle ne contient pas assez de teintes distinctes.
 */
export const buildAccentFamilies = (palette = {}) => {
  const entries = collectThemeHues(palette);
  const saturation = themeSaturation(entries);
  const lightness = themeLightness(entries);

  const accentPrimary = readColor(palette, 'accentPrimary');
  const themeSeed = accentPrimary
    ? rgbToHsl(accentPrimary)
    : { h: entries.length > 0 ? entries[0].h : 217, s: saturation };
  const themeHue = themeSeed.h;

  const themeFamily = buildFamily(
    THEME_ACCENT_FAMILY_ID,
    { hue: themeHue, saturation: clamp(themeSeed.s || saturation, 0.3, 0.9) },
    palette,
    lightness
  );

  const sources = completeWithHarmonies(
    collectAccentHues(entries, themeHue),
    themeHue,
    saturation
  );

  const families = assignNames(
    sources.map((source, index) => buildFamily(ACCENT_FAMILY_IDS[index], source, palette, lightness))
  );

  return [{ ...themeFamily, name: THEME_ACCENT_FAMILY_ID }, ...families];
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
 * Famille effective d'une section. Une valeur absente ou `theme` renvoie la famille du
 * thème : c'est le défaut, et ne pas la stocker garde la vitrine alignée si la marque
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
