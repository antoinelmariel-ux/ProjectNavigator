import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFaqPageHtml,
  getFaqTranslationGaps,
  getPublishedFaqItems,
  normalizeFaqEntries,
  resolveFaqText
} from '../src/utils/faqEntries.js';

const identity = (value) => value;
const labels = { heading: 'Questions fréquentes', intro: 'Intro' };

test('resolveFaqText : langue demandée, puis français, puis toute langue renseignée', () => {
  assert.equal(resolveFaqText({ fr: 'Bonjour', en: 'Hello' }, 'en'), 'Hello');
  assert.equal(resolveFaqText({ fr: 'Bonjour' }, 'de'), 'Bonjour');
  assert.equal(resolveFaqText({ es: 'Hola' }, 'de'), 'Hola');
  assert.equal(resolveFaqText({}, 'de'), '');
});

test('normalizeFaqEntries : écarte les entrées sans identifiant, publiée par défaut', () => {
  const result = normalizeFaqEntries([{ id: 'a', question: { fr: 'Q' } }, { question: {} }, null]);
  assert.equal(result.length, 1);
  assert.equal(result[0].isPublished, true);
});

test('getPublishedFaqItems : masque les non publiées et les entrées incomplètes', () => {
  const items = getPublishedFaqItems(
    [
      { id: '1', question: { fr: 'Q1' }, answer: { fr: 'R1' } },
      { id: '2', question: { fr: 'Q2' }, answer: { fr: 'R2' }, isPublished: false },
      { id: '3', question: { fr: 'Q3' }, answer: {} },
      { id: '4', question: {}, answer: { fr: 'R4' } }
    ],
    'fr',
    identity
  );
  assert.deepEqual(items.map((item) => item.id), ['1']);
});

test('buildFaqPageHtml : null sans entrée publiée, échappe la question', () => {
  assert.equal(buildFaqPageHtml([], 'fr', labels, identity), null);
  const html = buildFaqPageHtml(
    [{ id: '1', question: { fr: 'a <b> & c' }, answer: { fr: 'R' } }],
    'fr',
    labels,
    identity
  );
  assert.ok(html.includes('a &lt;b&gt; &amp; c'));
  assert.ok(html.includes('<details>'));
});

test('getFaqTranslationGaps : liste les langues incomplètes', () => {
  const gaps = getFaqTranslationGaps({
    question: { fr: 'Q', en: 'Q' },
    answer: { fr: 'R', en: '' }
  });
  assert.deepEqual(gaps, ['en', 'de', 'es']);
});
