import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneDeep } from '../src/utils/clone.js';

test('cloneDeep : copie profonde indépendante', () => {
  const source = { a: 1, nested: { b: [1, 2, 3] } };
  const copy = cloneDeep(source);
  assert.deepEqual(copy, source);
  copy.nested.b.push(4);
  assert.equal(source.nested.b.length, 3, 'la source ne doit pas être mutée');
});

test('cloneDeep : gère null/undefined', () => {
  assert.equal(cloneDeep(null), null);
  assert.equal(cloneDeep(undefined), undefined);
});

test('cloneDeep : valeurs primitives', () => {
  assert.equal(cloneDeep(42), 42);
  assert.equal(cloneDeep('x'), 'x');
});
