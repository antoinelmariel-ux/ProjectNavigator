import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguageFromCandidates, detectBrowserLanguage, languageFromCulture } from '../src/i18n/detectLanguage.js';

test('detects a supported language from browser candidates', () => {
  assert.equal(detectLanguageFromCandidates(['fr-FR', 'en-US']), 'fr');
});

test('falls back to English when no candidate is supported', () => {
  assert.equal(detectLanguageFromCandidates(['it-IT', 'pt-BR']), 'en');
});

test('falls back to English when the candidate list is empty', () => {
  assert.equal(detectLanguageFromCandidates([]), 'en');
});

test('detectBrowserLanguage reads navigator.languages when provided', () => {
  assert.equal(detectBrowserLanguage({ languages: ['de-DE'] }), 'de');
});

test('detectBrowserLanguage falls back to navigator.language when languages is empty', () => {
  assert.equal(detectBrowserLanguage({ languages: [], language: 'es-ES' }), 'es');
});

test('detectBrowserLanguage falls back to English without a navigator-like object', () => {
  assert.equal(detectBrowserLanguage(null), 'en');
});

test('languageFromCulture maps a SharePoint culture to a supported language', () => {
  assert.equal(languageFromCulture('fr-FR'), 'fr');
  assert.equal(languageFromCulture('de-CH'), 'de');
});

test('languageFromCulture returns an empty string when the culture is not offered', () => {
  assert.equal(languageFromCulture('it-IT'), '');
  assert.equal(languageFromCulture(undefined), '');
});
