import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCENT_FAMILY_IDS,
  MAX_ACCENT_FAMILY_COUNT,
  THEME_ACCENT_FAMILY_ID,
  buildAccentFamilies,
  contrastRatio,
  isKnownAccentFamilyId,
  normalizeAccentFamilyId,
  resolveAccentFamily
} from '../src/utils/showcaseAccents.js';
import { initialShowcaseThemes } from '../src/data/showcaseThemes.js';

const HEX = /^#[0-9a-f]{6}$/;

// Socle réellement peint par `.sg-shell` (cf. buildSignatureVariables) : la plus sombre du
// fond de page et de l'encre forte. C'est lui, pas le fond de page, que `onDark` affronte.
const groundOf = (palette) => {
  const candidates = [palette.backgroundStart, palette.inkStrong].filter(Boolean);
  return candidates.reduce((a, b) => (contrastRatio('#ffffff', a) >= contrastRatio('#ffffff', b) ? a : b));
};

const declaredColors = palette =>
  new Set(
    Object.values(palette)
      .filter(value => typeof value === 'string' && HEX.test(value.toLowerCase()))
      .map(value => value.toLowerCase())
  );

const toLinear = (channel) => {
  const ratio = channel / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
};

const lab = (hex) => {
  const numeric = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255].map(toLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = value => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const [fx, fy, fz] = [x, y, z].map(f);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

const deltaE = (first, second) => {
  const a = lab(first);
  const b = lab(second);
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
};

test('toutes les couleurs proposées sont déclarées dans la palette du thème', () => {
  for (const theme of initialShowcaseThemes) {
    const declared = declaredColors(theme.palette);
    for (const family of buildAccentFamilies(theme.palette)) {
      assert.ok(
        declared.has(family.g1),
        `${theme.id}/${family.id} : ${family.g1} n’appartient pas à la palette`
      );
      assert.equal(family.hex, family.g1, `${theme.id}/${family.id}`);
    }
  }
});

test('la famille « thème » ouvre la liste, suivie des rangs dans l’ordre', () => {
  for (const theme of initialShowcaseThemes) {
    const families = buildAccentFamilies(theme.palette);
    assert.equal(families[0].id, THEME_ACCENT_FAMILY_ID, theme.id);
    assert.ok(families.length >= 2, `${theme.id} ne propose aucune alternative`);
    assert.ok(families.length <= MAX_ACCENT_FAMILY_COUNT + 1, theme.id);
    assert.deepEqual(
      families.slice(1).map(family => family.id),
      ACCENT_FAMILY_IDS.slice(0, families.length - 1),
      theme.id
    );

    for (const family of families) {
      for (const key of ['c', 'g1', 'g2', 'p1', 'p2', 'onDark']) {
        assert.match(family[key], HEX, `${theme.id}/${family.id}/${key}`);
      }
    }
  }
});

test('les accents restent lisibles sur les deux fonds du thème', () => {
  for (const theme of initialShowcaseThemes) {
    const ground = groundOf(theme.palette);
    for (const family of buildAccentFamilies(theme.palette)) {
      assert.ok(
        contrastRatio(family.c, family.p2) >= 4.5,
        `${theme.id}/${family.id} : ${family.c} sur ${family.p2}`
      );
      assert.ok(
        contrastRatio(family.onDark, ground) >= 4.5,
        `${theme.id}/${family.id} : ${family.onDark} sur ${ground}`
      );
    }
  }
});

test('deux pastilles d’un même thème restent distinguables à l’œil', () => {
  for (const theme of initialShowcaseThemes) {
    const families = buildAccentFamilies(theme.palette);
    for (let i = 0; i < families.length; i += 1) {
      for (let j = i + 1; j < families.length; j += 1) {
        assert.ok(
          deltaE(families[i].g1, families[j].g1) >= 15,
          `${theme.id} : ${families[i].g1} et ${families[j].g1} trop proches`
        );
      }
    }
  }
});

test('un thème monochrome propose ses propres nuances, pas des teintes inventées', () => {
  // Hémostase ne porte qu’une teinte, déclinée du bordeaux au rose poudré : ces nuances sont
  // des choix légitimes, ce qu’un nommage par couleur interdisait.
  const hemostase = initialShowcaseThemes.find(theme => theme.id === 'hemostase');
  const families = buildAccentFamilies(hemostase.palette);
  const declared = declaredColors(hemostase.palette);
  assert.ok(families.length >= 4, `${families.length} pastilles`);
  for (const family of families) {
    assert.ok(declared.has(family.g1), family.g1);
  }
});

test('un thème riche s’arrête au plafond de pastilles', () => {
  const universel = initialShowcaseThemes.find(theme => theme.id === 'universel');
  assert.equal(buildAccentFamilies(universel.palette).length, MAX_ACCENT_FAMILY_COUNT + 1);
});

test('deux thèmes différents proposent deux palettes différentes', () => {
  const signatures = initialShowcaseThemes.map(theme =>
    buildAccentFamilies(theme.palette).map(family => family.g1).join('|')
  );
  assert.equal(new Set(signatures).size, signatures.length);
});

test('les identifiants nommés hérités retrouvent leur position', () => {
  assert.equal(normalizeAccentFamilyId('rouge'), 'accent-1');
  assert.equal(normalizeAccentFamilyId('rose'), 'accent-8');
  assert.equal(normalizeAccentFamilyId('accent-4'), 'accent-4');
  assert.equal(normalizeAccentFamilyId(THEME_ACCENT_FAMILY_ID), THEME_ACCENT_FAMILY_ID);
  assert.equal(normalizeAccentFamilyId('turquoise-fonce'), null);
  assert.equal(normalizeAccentFamilyId(undefined), null);
});

test('resolveAccentFamily retombe sur la famille du thème', () => {
  const universel = initialShowcaseThemes.find(theme => theme.id === 'universel');
  const families = buildAccentFamilies(universel.palette);
  assert.equal(resolveAccentFamily(undefined, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily(THEME_ACCENT_FAMILY_ID, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('inconnue', families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('accent-3', families).id, 'accent-3');
  // une vitrine colorée avant la bascule garde son rang de pastille
  assert.equal(resolveAccentFamily('vert', families).id, 'accent-4');

  // un rang que le thème courant ne propose pas (sa palette est plus pauvre) revient au thème
  const cevenfacta = initialShowcaseThemes.find(theme => theme.id === 'cevenfacta');
  const narrow = buildAccentFamilies(cevenfacta.palette);
  assert.ok(narrow.length < MAX_ACCENT_FAMILY_COUNT + 1);
  assert.equal(resolveAccentFamily('accent-8', narrow).id, THEME_ACCENT_FAMILY_ID);
});

test('isKnownAccentFamilyId accepte le défaut, les positions et l’ancien nommage', () => {
  assert.ok(isKnownAccentFamilyId(THEME_ACCENT_FAMILY_ID));
  assert.ok(ACCENT_FAMILY_IDS.every(isKnownAccentFamilyId));
  assert.ok(isKnownAccentFamilyId('violet'));
  assert.ok(!isKnownAccentFamilyId('turquoise-fonce'));
  assert.ok(!isKnownAccentFamilyId(undefined));
});

test('une palette vide produit tout de même la famille du thème', () => {
  const families = buildAccentFamilies();
  assert.equal(families.length, 1);
  assert.equal(families[0].id, THEME_ACCENT_FAMILY_ID);
  assert.match(families[0].g1, HEX);
});
