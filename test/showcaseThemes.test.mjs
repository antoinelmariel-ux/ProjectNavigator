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
  const answers = { showcaseTheme: { value: 'produit', children: ['gemuline'] } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, 'gemuline');
});

test('une sous-option environnement active le thème correspondant', () => {
  const expected = {
    immunologie: 'immunologie',
    hemostase: 'hemostase',
    soins_intensifs: 'soins-intensifs'
  };

  Object.entries(expected).forEach(([optionValue, themeId]) => {
    const answers = { showcaseTheme: { value: 'environnement', children: [optionValue] } };
    assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, themeId, optionValue);
  });
});

test('seuls des thèmes Entreprise Demo sont livrés par défaut', () => {
  assert.deepEqual(
    initialShowcaseThemes.map((theme) => theme.id),
    [
      'universel',
      'immunologie',
      'hemostase',
      'soins-intensifs',
      'qelbris',
      'clotalys',
      'factarin',
      'gemuline',
      'albuvia',
      'protexin',
      'factenova'
    ]
  );
});

test('chaque produit documenté résout vers sa propre palette', () => {
  const expected = {
    protexin: 'protexin',
    qelbris_clarim100_clarim_5: 'qelbris',
    factenova: 'factenova',
    clotalys_fibrinex: 'clotalys',
    albuvia: 'albuvia',
    wilfarin_factarin: 'factarin',
    cross_produits: 'universel'
  };

  Object.entries(expected).forEach(([optionValue, themeId]) => {
    const answers = { showcaseTheme: { value: 'produit', children: [optionValue] } };
    assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, themeId, optionValue);
  });
});

test('une réponse multi-select expose aussi ses sous-options', () => {
  const answers = { showcaseTheme: { values: ['produit'], children: { produit: ['albuvia'] } } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers)?.id, 'albuvia');
});

test('une option sans thème dédié ne déclenche aucune activation', () => {
  const answers = { showcaseTheme: { value: 'environnement', children: ['pneumologie'] } };
  assert.equal(resolveThemeFromActivation(initialShowcaseThemes, answers), null);
});

test('les sous-options ne débloquent pas un type de projet exclu de la vitrine', () => {
  assert.equal(isShowcaseAccessBlockedByProjectType({ ProjectType: 'projet_du_entreprise_demo' }), false);
  assert.equal(
    isShowcaseAccessBlockedByProjectType({ ProjectType: { value: 'don_bourse_appel_a_projets' } }),
    true
  );
});
