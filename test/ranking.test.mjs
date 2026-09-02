import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRankingConfig,
  formatRankingAnswer,
  computeRankingRecommendations
} from '../src/utils/ranking.js';

test('normalizeRankingConfig : titre par défaut et structure', () => {
  const config = normalizeRankingConfig(null);
  assert.equal(config.title, 'Base de données');
  assert.ok(Array.isArray(config.criteria));
  assert.ok(Array.isArray(config.entries));
});

test('formatRankingAnswer : chaîne vide si aucune priorité', () => {
  assert.equal(formatRankingAnswer(null, []), '');
  assert.equal(formatRankingAnswer({ prioritized: [], ignored: [] }, []), '');
});

test('formatRankingAnswer : liste ordonnée avec flèche', () => {
  const criteria = [
    { id: 'c1', label: 'Coût' },
    { id: 'c2', label: 'Qualité' }
  ];
  const text = formatRankingAnswer({ prioritized: ['c1', 'c2'], ignored: [] }, criteria);
  assert.equal(text, '1. Coût → 2. Qualité');
});

test('formatRankingAnswer : mentionne les critères ignorés', () => {
  const criteria = [
    { id: 'c1', label: 'Coût' },
    { id: 'c2', label: 'Qualité' }
  ];
  const text = formatRankingAnswer({ prioritized: ['c1'], ignored: ['c2'] }, criteria);
  assert.match(text, /sans importance : Qualité/);
});

test('computeRankingRecommendations : [] si config absente ou aucune priorité', () => {
  assert.deepEqual(computeRankingRecommendations({}, null), []);
  assert.deepEqual(computeRankingRecommendations({ prioritized: [] }, { criteria: [], entries: [] }), []);
});

test('computeRankingRecommendations : classe les entrées par score pondéré', () => {
  const config = {
    title: 'Prestataires',
    criteria: [
      { id: 'cost', label: 'Coût' },
      { id: 'quality', label: 'Qualité' }
    ],
    entries: [
      { id: 'a', name: 'Alpha', scores: { cost: 1, quality: 5 } },
      { id: 'b', name: 'Beta', scores: { cost: 5, quality: 1 } }
    ]
  };
  const recos = computeRankingRecommendations({ prioritized: ['cost', 'quality'], ignored: [] }, config, 2);
  assert.equal(recos.length, 2);
  // "cost" est prioritaire (poids le plus fort) → Beta (cost=5) devant Alpha.
  assert.equal(recos[0].id, 'b');
});
