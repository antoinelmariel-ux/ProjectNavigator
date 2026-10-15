import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFaqPageHtml,
  getFaqTranslationGaps,
  groupFaqItemsByCategory,
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

test('catégories : regroupées par libellé dans l’ordre de première apparition, sans catégorie = sans titre', () => {
  const html = buildFaqPageHtml(
    [
      { id: '1', category: { fr: 'Questionnaire' }, question: { fr: 'Q1' }, answer: { fr: 'R' } },
      { id: '2', question: { fr: 'Q2' }, answer: { fr: 'R' } },
      { id: '3', category: { fr: ' questionnaire ' }, question: { fr: 'Q3' }, answer: { fr: 'R' } }
    ],
    'fr',
    labels,
    identity
  );
  assert.equal((html.match(/<h2>/g) || []).length, 1);
  assert.ok(html.indexOf('Q3') < html.indexOf('Q2'));
  const groups = groupFaqItemsByCategory([{ category: 'A', id: 1 }, { category: '', id: 2 }, { category: 'a', id: 3 }]);
  assert.deepEqual(groups.map((g) => g.items.length), [2, 1]);
});

test('getFaqTranslationGaps : la catégorie n’est exigée que si elle est renseignée quelque part', () => {
  const base = { question: { fr: 'Q', en: 'Q', de: 'Q', es: 'Q' }, answer: { fr: 'R', en: 'R', de: 'R', es: 'R' } };
  assert.deepEqual(getFaqTranslationGaps({ ...base, category: {} }), []);
  assert.deepEqual(getFaqTranslationGaps({ ...base, category: { fr: 'C' } }), ['en', 'de', 'es']);
});
