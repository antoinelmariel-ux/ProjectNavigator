import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnvironmentBannerText,
  normalizeEnvironmentBanner
} from '../src/utils/environmentBanner.js';
import { REFERENTIAL_FILES, flattenReferentials } from '../src/utils/referentialStore.js';

test('absent or malformed values give no banner', () => {
  [undefined, null, 'x', 42, [], {}].forEach((value) => {
    assert.equal(normalizeEnvironmentBanner(value).enabled, false);
  });
});

test('only an explicit true enables the banner', () => {
  assert.equal(normalizeEnvironmentBanner({ enabled: 'true' }).enabled, false);
  assert.equal(normalizeEnvironmentBanner({ enabled: true }).enabled, true);
});

test('label is bounded and tone falls back to amber', () => {
  const result = normalizeEnvironmentBanner({ enabled: true, label: 'x'.repeat(500), tone: 'neon' });
  assert.equal(result.label.length, 80);
  assert.equal(result.tone, 'amber');
  assert.equal(normalizeEnvironmentBanner({ tone: 'violet' }).tone, 'violet');
});

test('empty label falls back to the dictionary text', () => {
  assert.equal(getEnvironmentBannerText({ enabled: true, label: '  ' }, 'Démo'), 'Démo');
  assert.equal(getEnvironmentBannerText({ enabled: true, label: 'Recette' }, 'Démo'), 'Recette');
});

test('environmentBanner travels in settings.json', () => {
  assert.ok(REFERENTIAL_FILES.settings.keys.includes('environmentBanner'));
  const slices = flattenReferentials({ settings: { environmentBanner: { enabled: true } } });
  assert.deepEqual(slices.environmentBanner, { enabled: true });
});
