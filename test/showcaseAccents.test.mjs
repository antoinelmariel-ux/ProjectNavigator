import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCENT_FAMILY_COUNT,
  ACCENT_FAMILY_IDS,
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

const hueDistance = (a, b) => {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
};

const MONOCHROME_PALETTE = {
  accentPrimary: '#902830',
  accentSecondary: '#cf5a5f',
  highlight: '#e5928e',
  glowPrimary: '#b83038',
  surfaceLight: '#ffffff',
  surfaceLightAlt: '#e2e8f0',
  backgroundStart: '#2a0d10',
  inkStrong: '#3d1519'
};

test('chaque thème expose la famille « thème » puis les familles positionnelles', () => {
  for (const theme of initialShowcaseThemes) {
    const families = buildAccentFamilies(theme.palette);
    assert.equal(families[0].id, THEME_ACCENT_FAMILY_ID, theme.id);
    assert.deepEqual(families.slice(1).map(family => family.id), ACCENT_FAMILY_IDS, theme.id);

    for (const family of families) {
      for (const key of ['c', 'g1', 'g2', 'p1', 'p2', 'onDark']) {
        assert.match(family[key], HEX, `${theme.id}/${family.id}/${key}`);
      }
      assert.equal(typeof family.name, 'string', `${theme.id}/${family.id}`);
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

test('deux familles d’un même thème ne se confondent pas', () => {
  for (const theme of initialShowcaseThemes) {
    const families = buildAccentFamilies(theme.palette);
    for (let i = 0; i < families.length; i += 1) {
      for (let j = i + 1; j < families.length; j += 1) {
        assert.notEqual(
          families[i].g1,
          families[j].g1,
          `${theme.id} : ${families[i].id} et ${families[j].id}`
        );
        assert.ok(
          hueDistance(families[i].hue, families[j].hue) >= 20,
          `${theme.id} : ${families[i].id} et ${families[j].id} trop proches`
        );
        assert.notEqual(
          families[i].name,
          families[j].name,
          `${theme.id} : deux pastilles nommées ${families[i].name}`
        );
      }
    }
  }
});

test('les teintes du thème passent avant toute couleur composée', () => {
  // #d946ef est un magenta franc, absent des ancrages : il doit devenir une pastille tel
  // quel, teinte et saturation comprises, plutôt que d’être reconstruit.
  const palette = {
    accentPrimary: '#1d4ed8',
    accentSecondary: '#d946ef',
    surfaceLight: '#ffffff',
    surfaceLightAlt: '#e2e8f0',
    backgroundStart: '#05070f',
    inkStrong: '#0f172a'
  };
  const families = buildAccentFamilies(palette);
  assert.ok(
    families.slice(1).some(family => hueDistance(family.hue, 292) <= 1),
    families.map(family => family.hue.toFixed(0)).join(', ')
  );
  // et la première position revient à la couleur la plus caractéristique du thème
  assert.ok(hueDistance(families[1].hue, 292) <= 1);
});

test('un thème monochrome est complété par harmonie autour de sa teinte', () => {
  const families = buildAccentFamilies(MONOCHROME_PALETTE);
  const themeHue = families[0].hue;
  assert.equal(families.length, ACCENT_FAMILY_COUNT + 1);
  // la palette ne porte qu’une teinte : la première pastille proposée est sa complémentaire
  assert.ok(hueDistance(families[1].hue, (themeHue + 180) % 360) <= 1, `${families[1].hue}`);
  // et aucune pastille ne double la couleur du thème
  for (const family of families.slice(1)) {
    assert.ok(hueDistance(family.hue, themeHue) >= 20, `${family.id} : ${family.hue}`);
  }
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
  const families = buildAccentFamilies(initialShowcaseThemes[0].palette);
  assert.equal(resolveAccentFamily(undefined, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily(THEME_ACCENT_FAMILY_ID, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('inconnue', families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('accent-3', families).id, 'accent-3');
  // une vitrine colorée avant la bascule garde son rang de pastille
  assert.equal(resolveAccentFamily('vert', families).id, 'accent-4');
});

test('isKnownAccentFamilyId accepte le défaut, les positions et l’ancien nommage', () => {
  assert.ok(isKnownAccentFamilyId(THEME_ACCENT_FAMILY_ID));
  assert.ok(ACCENT_FAMILY_IDS.every(isKnownAccentFamilyId));
  assert.ok(isKnownAccentFamilyId('violet'));
  assert.ok(!isKnownAccentFamilyId('turquoise-fonce'));
  assert.ok(!isKnownAccentFamilyId(undefined));
});

test('une palette vide produit tout de même une palette complète', () => {
  const families = buildAccentFamilies();
  assert.equal(families.length, ACCENT_FAMILY_COUNT + 1);
  for (const family of families) {
    assert.match(family.g1, HEX);
  }
});
