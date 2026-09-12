import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasChronologicalDate,
  sortMilestonesChronologically
} from '../src/utils/showcaseMilestones.js';

test('remet les jalons datés dans l ordre chronologique', () => {
  const sorted = sortMilestonesChronologically([
    { date: '2026-09-01', description: 'Pilote' },
    { date: '2026-02-15', description: 'Cadrage' },
    { date: '2026-05-30', description: 'Build' }
  ]);

  assert.deepEqual(
    sorted.map(entry => entry.description),
    ['Cadrage', 'Build', 'Pilote']
  );
});

test('laisse la liste intacte quand elle est déjà chronologique', () => {
  const entries = [
    { date: '2026-02-15', description: 'Cadrage' },
    { date: '2026-05-30', description: 'Build' }
  ];

  assert.equal(sortMilestonesChronologically(entries), entries);
});

test('garde les jalons sans date à leur place', () => {
  const sorted = sortMilestonesChronologically([
    { date: '2026-09-01', description: 'Pilote' },
    { date: '', description: 'À dater' },
    { date: '2026-02-15', description: 'Cadrage' }
  ]);

  assert.deepEqual(
    sorted.map(entry => entry.description),
    ['Cadrage', 'À dater', 'Pilote']
  );
});

test('traite une date non analysable comme une entrée sans date', () => {
  const sorted = sortMilestonesChronologically([
    { date: 'Printemps 2026', description: 'Libre' },
    { date: '2026-09-01', description: 'Pilote' },
    { date: '2026-02-15', description: 'Cadrage' }
  ]);

  assert.deepEqual(
    sorted.map(entry => entry.description),
    ['Libre', 'Cadrage', 'Pilote']
  );
});

test('conserve l ordre de saisie entre deux jalons du même jour', () => {
  const sorted = sortMilestonesChronologically([
    { date: '2026-03-02', description: 'Second' },
    { date: '2026-03-01', description: 'A' },
    { date: '2026-03-01', description: 'B' }
  ]);

  assert.deepEqual(
    sorted.map(entry => entry.description),
    ['A', 'B', 'Second']
  );
});

test('accepte les entrées vides et les valeurs non tabulaires', () => {
  assert.deepEqual(sortMilestonesChronologically(null), []);
  assert.deepEqual(sortMilestonesChronologically([]), []);
  assert.equal(hasChronologicalDate('2026-01-01'), true);
  assert.equal(hasChronologicalDate(''), false);
  assert.equal(hasChronologicalDate(undefined), false);
});
