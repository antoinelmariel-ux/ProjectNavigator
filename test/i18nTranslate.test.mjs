import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../src/i18n/translate.js';

test('translate returns the string in the active language', () => {
  const dictionaries = {
    en: { greeting: { hello: 'Hello {{name}}' } },
    fr: { greeting: { hello: 'Bonjour {{name}}' } }
  };
  assert.equal(translate(dictionaries, 'fr', 'greeting.hello', { name: 'Alice' }), 'Bonjour Alice');
});

test('translate falls back to English when the active language is missing the key', () => {
  const dictionaries = { en: { greeting: { hello: 'Hello {{name}}' } }, fr: {} };
  assert.equal(translate(dictionaries, 'fr', 'greeting.hello', { name: 'Bob' }), 'Hello Bob');
});

test('translate returns the key itself when no dictionary has it', () => {
  const dictionaries = { en: {}, fr: {} };
  assert.equal(translate(dictionaries, 'fr', 'missing.key'), 'missing.key');
});

test('translate leaves unknown placeholders untouched', () => {
  const dictionaries = { en: { greeting: 'Hello {{name}}' } };
  assert.equal(translate(dictionaries, 'en', 'greeting', {}), 'Hello {{name}}');
});
