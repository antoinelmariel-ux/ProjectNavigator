import test from 'node:test';
import assert from 'node:assert/strict';

import { initialShowcaseThemes } from '../src/data/showcaseThemes.js';
import {
  getShowcaseThemeActivationConflicts,
  isShowcaseAccessBlockedByProjectType,
  resolveThemeFromActivation
} from '../src/utils/showcase.js';

const PALETTE_KEYS = Object.keys(initialShowcaseThemes[0].palette);

test('le thème de repli reste en tête de liste', () => {
  assert.equal(initialShowcaseThemes[0].id, 'universel');
});

test('chaque thème expose la palette complète en hexadécimal', () => {
  initialShowcaseThemes.forEach((theme) => {
    const keys = Object.keys(theme.palette);
    assert.deepEqual(keys.sort(), [...PALETTE_KEYS].sort(), `palette incomplète : ${theme.id}`);
    Object.entries(theme.palette).forEach(([key, value]) => {
      assert.match(value, /^#[0-9a-f]{6}$/, `couleur invalide : ${theme.id}.${key}`);
    });
  });
});

test('aucun thème ne partage le même déclencheur', () => {
  assert.deepEqual(getShowcaseThemeActivationConflicts(initialShowcaseThemes), []);
});

test('une sous-option produit active le thème de la marque', () => {
  const answers = { showcaseTheme: { value: 'produit', children: ['tegeline'] } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, 'tegeline');
});

test('une sous-option environnement active le thème correspondant', () => {
  const answers = { showcaseTheme: { value: 'environnement', children: ['immunologie'] } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, 'immunologie');
});

test('chaque produit documenté résout vers sa propre palette', () => {
  const expected = {
    alfalastin: 'alfalastin',
    iqymune_clairyg100_clairyg_5: 'iqymune',
    cevenfacta: 'cevenfacta',
    clottafact_fibclot: 'fibclot',
    vialebex: 'vialebex',
    wilfactin_willfact: 'willfact',
    cross_produits: 'universel'
  };

  Object.entries(expected).forEach(([optionValue, themeId]) => {
    const answers = { showcaseTheme: { value: 'produit', children: [optionValue] } };
    assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, themeId, optionValue);
  });
});

test('une réponse multi-select expose aussi ses sous-options', () => {
  const answers = { showcaseTheme: { values: ['produit'], children: { produit: ['vialebex'] } } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, 'vialebex');
});

test('une option sans thème dédié ne déclenche aucune activation', () => {
  const answers = { showcaseTheme: { value: 'environnement', children: ['pneumologie'] } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers), null);
});

test('les sous-options ne débloquent pas un type de projet exclu de la vitrine', () => {
  assert.equal(isShowcaseAccessBlockedByProjectType({ ProjectType: 'projet_du_lfb' }), false);
  assert.equal(
    isShowcaseAccessBlockedByProjectType({ ProjectType: { value: 'don_bourse_appel_a_projets' } }),
    true
  );
});
