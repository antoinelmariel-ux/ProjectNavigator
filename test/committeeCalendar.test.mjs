import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthGrid,
  fromDayKey,
  getCommitteeColor,
  groupSessionsByDay,
  pickInitialDay,
  shiftMonth,
  toDayKey,
  COMMITTEE_COLORS
} from '../src/utils/committeeCalendar.js';

const today = new Date(2026, 10, 18, 10, 0);

test('la grille d’un mois commence un lundi et compte des semaines entières', () => {
  const grid = buildMonthGrid({ year: 2026, month: 10 }, today);
  assert.equal(grid.length, 6);
  grid.forEach((week) => assert.equal(week.length, 7));
  assert.equal(grid[0][0].date.getDay(), 1);
  assert.equal(grid[0][6].date.getDay(), 0);
});

test('novembre 2026 démarre un dimanche : la première ligne vient d’octobre', () => {
  const grid = buildMonthGrid({ year: 2026, month: 10 }, today);
  assert.equal(grid[0][0].key, '2026-10-26');
  assert.equal(grid[0][0].inMonth, false);
  assert.equal(grid[0][6].key, '2026-11-01');
  assert.equal(grid[0][6].inMonth, true);
});

test('seul le jour courant est marqué', () => {
  const marked = buildMonthGrid({ year: 2026, month: 10 }, today).flat().filter((day) => day.isToday);
  assert.deepEqual(marked.map((day) => day.key), ['2026-11-18']);
});

test('un mois de février de 28 jours commençant un lundi tient en 4 lignes', () => {
  assert.equal(buildMonthGrid({ year: 2027, month: 1 }, today).length, 4);
});

test('shiftMonth passe d’une année à l’autre', () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
});

test('toDayKey / fromDayKey sont réciproques et refusent les valeurs invalides', () => {
  assert.equal(toDayKey(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(toDayKey('pas une date'), '');
  assert.equal(fromDayKey('2026-11-05').getDate(), 5);
  assert.equal(fromDayKey('5/11/2026'), null);
});

test('groupSessionsByDay regroupe par jour local et trie par heure', () => {
  const morning = { id: 'a', startAt: new Date(2026, 10, 20, 9, 0).toISOString() };
  const afternoon = { id: 'b', startAt: new Date(2026, 10, 20, 14, 0).toISOString() };
  const other = { id: 'c', startAt: new Date(2026, 10, 25, 14, 0).toISOString() };
  const byDay = groupSessionsByDay([afternoon, other, morning]);
  assert.deepEqual(byDay['2026-11-20'].map((session) => session.id), ['a', 'b']);
  assert.deepEqual(byDay['2026-11-25'].map((session) => session.id), ['c']);
});

test('pickInitialDay : aujourd’hui s’il y a une séance, sinon la prochaine du mois, sinon rien', () => {
  const month = { year: 2026, month: 10 };
  const mk = (day) => ({ startAt: new Date(2026, 10, day, 14, 0).toISOString() });
  assert.equal(pickInitialDay(groupSessionsByDay([mk(18), mk(25)]), month, today), '2026-11-18');
  assert.equal(pickInitialDay(groupSessionsByDay([mk(5), mk(25), mk(27)]), month, today), '2026-11-25');
  assert.equal(pickInitialDay(groupSessionsByDay([mk(5)]), month, today), '');
});

test('chaque comité garde sa couleur, selon son rang', () => {
  const committees = [{ id: 'a' }, { id: 'b' }];
  assert.equal(getCommitteeColor(committees, 'a'), COMMITTEE_COLORS[0]);
  assert.equal(getCommitteeColor(committees, 'b'), COMMITTEE_COLORS[1]);
  assert.equal(getCommitteeColor(committees, 'inconnu'), COMMITTEE_COLORS[0]);
});
