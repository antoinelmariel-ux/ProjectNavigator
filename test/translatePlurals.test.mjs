import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolate, translate } from '../src/i18n/translate.js';
import { DICTIONARIES } from '../src/i18n/dictionaries/index.js';

test('pluriels : le mot suit la quantité selon la langue', () => {
  const template = '{{count}} [[count|point|points]]';
  assert.equal(interpolate(template, { count: 0 }, 'fr'), '0 point');
  assert.equal(interpolate(template, { count: 1 }, 'fr'), '1 point');
  assert.equal(interpolate(template, { count: 2 }, 'fr'), '2 points');
  assert.equal(interpolate(template, { count: 0 }, 'en'), '0 points');
  assert.equal(interpolate(template, { count: 1 }, 'en'), '1 point');
});

test('pluriels : plusieurs quantités dans un même libellé', () => {
  assert.equal(
    translate(DICTIONARIES, 'fr', 'synthesisReport.teamCollapsedSummaryTemplate', { prepCount: 1, exchangeCount: 3 }),
    '1 point à préparer · 3 échanges'
  );
});

test('pluriels : sans paramètre, la forme plurielle est utilisée', () => {
  assert.equal(interpolate('[[count|projet|projets]]', {}, 'fr'), 'projets');
});

const collectStrings = (value, path = '') => {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => collectStrings(child, path ? `${path}.${key}` : key));
};

test('pluriels : plus aucun « (s) » approximatif dans les libellés comptés', () => {
  Object.entries(DICTIONARIES).forEach(([language, dictionary]) => {
    collectStrings(dictionary)
      .filter(([, value]) => value.includes('{{'))
      .forEach(([path, value]) => {
        assert.doesNotMatch(value, /\p{L}\((s|x|es|en|e|n)\)/u, `${language}:${path}`);
      });
  });
});
