import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileStableOrder, mergeLeavingItems } from '../src/utils/stableOrder.js';

const getId = (item) => item.id;
const make = (...ids) => ids.map((id) => ({ id }));
const ids = (items) => items.map(getId);

test('sans ordre précédent, le tri demandé s\'applique tel quel', () => {
  assert.deepEqual(ids(reconcileStableOrder(make('a', 'b', 'c'), [], getId)), ['a', 'b', 'c']);
});

test('un élément qui remonte dans le tri garde sa place', () => {
  // `c` vient d'être modifié : le tri le met en tête, l'écran ne bouge pas.
  const result = reconcileStableOrder(make('c', 'a', 'b'), ['a', 'b', 'c'], getId);
  assert.deepEqual(ids(result), ['a', 'b', 'c']);
});

test('la dernière version de l\'objet est celle qui est rendue', () => {
  const updated = [{ id: 'c', v: 2 }, { id: 'a', v: 1 }];
  const result = reconcileStableOrder(updated, ['a', 'c'], getId);
  assert.deepEqual(result, [{ id: 'a', v: 1 }, { id: 'c', v: 2 }]);
});

test('un nouvel élément s\'insère derrière son voisin précédent du tri', () => {
  const result = reconcileStableOrder(make('n', 'a', 'b'), ['a', 'b'], getId);
  assert.deepEqual(ids(result), ['n', 'a', 'b']);
  const middle = reconcileStableOrder(make('a', 'n', 'b'), ['a', 'b'], getId);
  assert.deepEqual(ids(middle), ['a', 'n', 'b']);
  const end = reconcileStableOrder(make('a', 'b', 'n'), ['a', 'b'], getId);
  assert.deepEqual(ids(end), ['a', 'b', 'n']);
});

test('plusieurs nouveaux éléments consécutifs gardent leur ordre', () => {
  const result = reconcileStableOrder(make('a', 'n1', 'n2', 'b'), ['a', 'b'], getId);
  assert.deepEqual(ids(result), ['a', 'n1', 'n2', 'b']);
});

test('un élément disparu est retiré sans déplacer les autres', () => {
  const result = reconcileStableOrder(make('b', 'c'), ['a', 'b', 'c'], getId);
  assert.deepEqual(ids(result), ['b', 'c']);
});

test('les doublons et les éléments sans identifiant sont ignorés', () => {
  const result = reconcileStableOrder([{ id: 'a' }, { id: 'a' }, {}, null].filter(Boolean), [], getId);
  assert.deepEqual(ids(result), ['a']);
});

test('un élément qui part est replacé à son ancienne position pour son animation', () => {
  const displayed = make('a', 'c');
  const merged = mergeLeavingItems(displayed, ['a', 'b', 'c'], make('b'), getId);
  assert.deepEqual(ids(merged), ['a', 'b', 'c']);
  const first = mergeLeavingItems(make('b', 'c'), ['a', 'b', 'c'], make('a'), getId);
  assert.deepEqual(ids(first), ['a', 'b', 'c']);
});

test('plusieurs éléments qui partent ensemble retrouvent leur ordre d\'origine', () => {
  const merged = mergeLeavingItems(make('a', 'd'), ['a', 'b', 'c', 'd'], make('c', 'b'), getId);
  assert.deepEqual(ids(merged), ['a', 'b', 'c', 'd']);
});
