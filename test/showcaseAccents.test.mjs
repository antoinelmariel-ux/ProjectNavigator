import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCENT_FAMILY_IDS,
  THEME_ACCENT_FAMILY_ID,
  buildAccentFamilies,
  contrastRatio,
  isKnownAccentFamilyId,
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

test('chaque thème expose la famille « thème » puis toutes les familles nommées', () => {
  for (const theme of initialShowcaseThemes) {
    const families = buildAccentFamilies(theme.palette);
    assert.equal(families[0].id, THEME_ACCENT_FAMILY_ID, theme.id);
    assert.deepEqual(families.slice(1).map(family => family.id), ACCENT_FAMILY_IDS, theme.id);

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
      }
    }
  }
});

test('une famille reprend la couleur du thème quand sa tonalité correspond', () => {
  // #d946ef est un magenta franc : la famille « rose » doit s’en saisir plutôt que de
  // composer une teinte sur son ancrage.
  const families = buildAccentFamilies({
    accentPrimary: '#1d4ed8',
    accentSecondary: '#d946ef',
    surfaceLight: '#ffffff',
    surfaceLightAlt: '#e2e8f0',
    backgroundStart: '#05070f',
    inkStrong: '#0f172a'
  });
  const rose = families.find(family => family.id === 'rose');
  const neutral = buildAccentFamilies({
    accentPrimary: '#1d4ed8',
    surfaceLight: '#ffffff',
    surfaceLightAlt: '#e2e8f0',
    backgroundStart: '#05070f',
    inkStrong: '#0f172a'
  }).find(family => family.id === 'rose');
  assert.notEqual(rose.g1, neutral.g1);
});

test('resolveAccentFamily retombe sur la famille du thème', () => {
  const families = buildAccentFamilies(initialShowcaseThemes[0].palette);
  assert.equal(resolveAccentFamily(undefined, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily(THEME_ACCENT_FAMILY_ID, families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('inconnue', families).id, THEME_ACCENT_FAMILY_ID);
  assert.equal(resolveAccentFamily('vert', families).id, 'vert');
});

test('isKnownAccentFamilyId accepte le défaut et les familles nommées', () => {
  assert.ok(isKnownAccentFamilyId(THEME_ACCENT_FAMILY_ID));
  assert.ok(ACCENT_FAMILY_IDS.every(isKnownAccentFamilyId));
  assert.ok(!isKnownAccentFamilyId('turquoise-fonce'));
  assert.ok(!isKnownAccentFamilyId(undefined));
});

test('une palette vide produit tout de même une palette complète', () => {
  const families = buildAccentFamilies();
  assert.equal(families.length, ACCENT_FAMILY_IDS.length + 1);
  for (const family of families) {
    assert.match(family.g1, HEX);
  }
});
