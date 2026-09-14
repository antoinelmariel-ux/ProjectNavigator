import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMissingLanguages,
  collectTranslationItems,
  normalizeAcceptedLanguages,
  isLanguageAcceptedBy
} from '../src/utils/translationAudit.js';

test('getMissingLanguages détecte les langues absentes sur un objet localisé', () => {
  assert.deepEqual(getMissingLanguages({ en: 'Hello', fr: 'Bonjour' }), ['de', 'es']);
  assert.deepEqual(getMissingLanguages({ en: 'Hello', fr: 'Bonjour', de: 'Hallo', es: 'Hola' }), []);
});

test('getMissingLanguages traite une chaîne héritée comme traduite en français seulement', () => {
  assert.deepEqual(getMissingLanguages('Texte en français'), ['en', 'de', 'es']);
});

test('collectTranslationItems ignore les champs déjà complets dans les 4 langues', () => {
  const complete = { en: 'a', fr: 'b', de: 'c', es: 'd' };
  const items = collectTranslationItems({
    questions: [{ id: 'q1', question: complete }],
    rules: [],
    teams: []
  });
  assert.equal(items.length, 0);
});

test('collectTranslationItems ignore un champ absent dans les 4 langues (jamais renseigné)', () => {
  const items = collectTranslationItems({
    questions: [{
      id: 'q1',
      question: { en: 'a', fr: 'b', de: 'c', es: 'd' },
      extraCheckbox: { enabled: false, label: {} }
    }],
    rules: [],
    teams: []
  });
  assert.equal(items.length, 0);
});

test('collectTranslationItems remonte une question incomplète comme contenu global (sans équipe)', () => {
  const items = collectTranslationItems({
    questions: [{ id: 'q1', question: { fr: 'Quel est votre nom ?' } }],
    rules: [],
    teams: []
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'question');
  assert.deepEqual(items[0].teamIds, []);
  assert.deepEqual(items[0].missingLanguages, ['en', 'de', 'es']);
});

test('collectTranslationItems rattache une question de règle et un risque à leur équipe', () => {
  const items = collectTranslationItems({
    questions: [],
    rules: [
      {
        id: 'rule1',
        name: { fr: 'Règle 1' },
        teams: ['dpo'],
        questions: {
          dpo: [{ text: { fr: 'Question DPO ?' } }]
        },
        risks: [
          { description: { fr: 'Risque' }, mitigation: { fr: 'Mitigation' }, teamId: 'dpo' }
        ]
      }
    ],
    teams: []
  });

  const byKind = Object.fromEntries(items.map((item) => [item.kind + (item.refs.field || ''), item]));
  assert.deepEqual(byKind.ruleName.teamIds, ['dpo']);
  assert.deepEqual(byKind.ruleQuestion.teamIds, ['dpo']);
  assert.deepEqual(byKind.riskdescription.teamIds, ['dpo']);
  assert.deepEqual(byKind.riskmitigation.teamIds, ['dpo']);
});

test('collectTranslationItems retombe sur les équipes de la règle si le risque ne précise pas de teamId', () => {
  const items = collectTranslationItems({
    rules: [
      {
        id: 'rule1',
        name: { en: 'a', fr: 'b', de: 'c', es: 'd' },
        teams: ['dpo', 'juridique'],
        risks: [{ description: { fr: 'Risque sans teamId' }, mitigation: {} }]
      }
    ]
  });
  const risk = items.find((item) => item.kind === 'risk' && item.refs.field === 'description');
  assert.deepEqual(risk.teamIds, ['dpo', 'juridique']);
});

test('collectTranslationItems remonte le nom et l\'expertise d\'une équipe', () => {
  const items = collectTranslationItems({
    teams: [{ id: 'dpo', name: { fr: 'DPO' }, expertise: { fr: 'Protection des données' } }]
  });
  assert.equal(items.length, 2);
  items.forEach((item) => assert.deepEqual(item.teamIds, ['dpo']));
});

test('normalizeAcceptedLanguages considère une liste vide ou absente comme "toutes les langues"', () => {
  assert.deepEqual(normalizeAcceptedLanguages(undefined), ['en', 'fr', 'de', 'es']);
  assert.deepEqual(normalizeAcceptedLanguages([]), ['en', 'fr', 'de', 'es']);
  assert.deepEqual(normalizeAcceptedLanguages(['fr', 'en']), ['fr', 'en']);
  assert.deepEqual(normalizeAcceptedLanguages(['fr', 'not-a-language']), ['fr']);
});

test('isLanguageAcceptedBy applique la même règle de repli', () => {
  assert.equal(isLanguageAcceptedBy([], 'de'), true);
  assert.equal(isLanguageAcceptedBy(['fr', 'en'], 'de'), false);
  assert.equal(isLanguageAcceptedBy(['fr', 'en'], 'fr'), true);
});
