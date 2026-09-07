import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreviewAnswers,
  canRedoHistory,
  canUndoHistory,
  clearShowcaseDraft,
  createHistory,
  loadShowcaseDraft,
  moveArrayItem,
  pushHistory,
  redoHistory,
  saveShowcaseDraft,
  undoHistory
} from '../src/utils/showcaseEditor.js';

test('buildPreviewAnswers : le brouillon recouvre les réponses enregistrées', () => {
  const answers = { projectSlogan: 'ancien', BUDGET: '120', other: 'intact' };
  const preview = buildPreviewAnswers(answers, {
    fieldValues: { projectSlogan: 'nouveau' }
  });

  assert.equal(preview.projectSlogan, 'nouveau');
  assert.equal(preview.BUDGET, '120');
  assert.equal(preview.other, 'intact');
  // l'objet d'origine ne doit jamais être muté : il sert de référence à la publication
  assert.equal(answers.projectSlogan, 'ancien');
});

test('buildPreviewAnswers : une valeur vide du brouillon efface bien la réponse affichée', () => {
  const preview = buildPreviewAnswers({ projectSlogan: 'ancien' }, {
    fieldValues: { projectSlogan: '' }
  });

  assert.equal(preview.projectSlogan, '');
});

test('buildPreviewAnswers : sections et ordre du brouillon priment sur ceux des réponses', () => {
  const preview = buildPreviewAnswers(
    { customShowcaseSections: [{ id: 'a' }], showcaseSectionOrder: ['hero', 'a'] },
    { customSections: [{ id: 'b' }], sectionOrder: ['b', 'hero'] }
  );

  assert.deepEqual(preview.customShowcaseSections, [{ id: 'b' }]);
  assert.deepEqual(preview.showcaseSectionOrder, ['b', 'hero']);
});

test('buildPreviewAnswers : sans superposition, les réponses sont rendues telles quelles', () => {
  const answers = { a: 1 };
  assert.equal(buildPreviewAnswers(answers, null), answers);
  assert.deepEqual(buildPreviewAnswers(undefined, null), {});
});

test('moveArrayItem : remonter et descendre un élément', () => {
  const items = ['a', 'b', 'c', 'd'];

  // « déposer avant l'index 0 » remonte l'élément en tête
  assert.deepEqual(moveArrayItem(items, 2, 0), ['c', 'a', 'b', 'd']);
  // en descendant, l'index d'insertion est décalé par le retrait de l'élément
  assert.deepEqual(moveArrayItem(items, 0, 3), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveArrayItem(items, 0, items.length), ['b', 'c', 'd', 'a']);
});

test('moveArrayItem : déplacements neutres et index hors bornes', () => {
  const items = ['a', 'b', 'c'];

  assert.deepEqual(moveArrayItem(items, 1, 1), items);
  assert.deepEqual(moveArrayItem(items, 1, 2), items);
  assert.deepEqual(moveArrayItem(items, 9, 0), items);
  assert.deepEqual(moveArrayItem(items, 0, 99), ['b', 'c', 'a']);
  assert.notEqual(moveArrayItem(items, 1, 1), items);
});

test('historique : annuler puis rétablir restitue les états successifs', () => {
  let history = createHistory({ v: 1 });
  assert.equal(canUndoHistory(history), false);
  assert.equal(canRedoHistory(history), false);

  history = pushHistory(history, { v: 2 });
  history = pushHistory(history, { v: 3 });
  assert.deepEqual(history.present, { v: 3 });

  history = undoHistory(history);
  assert.deepEqual(history.present, { v: 2 });
  assert.equal(canRedoHistory(history), true);

  history = undoHistory(history);
  assert.deepEqual(history.present, { v: 1 });
  assert.equal(canUndoHistory(history), false);

  history = redoHistory(history);
  assert.deepEqual(history.present, { v: 2 });

  // une nouvelle action après annulation coupe la branche « rétablir »
  history = pushHistory(history, { v: 9 });
  assert.equal(canRedoHistory(history), false);
  assert.deepEqual(history.present, { v: 9 });
});

test('historique : la profondeur est bornée', () => {
  let history = createHistory({ v: 0 });
  for (let index = 1; index <= 10; index += 1) {
    history = pushHistory(history, { v: index }, { limit: 3 });
  }

  assert.equal(history.past.length, 3);
  assert.deepEqual(history.past[0], { v: 7 });
  assert.deepEqual(history.present, { v: 10 });
});

test('historique : annuler/rétablir sur un historique vide est sans effet', () => {
  const history = createHistory({ v: 1 });
  assert.equal(undoHistory(history), history);
  assert.equal(redoHistory(history), history);
});

test('brouillon : sauvegarde, relecture et suppression par projet', () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    }
  };

  try {
    assert.equal(loadShowcaseDraft('p1'), null);

    saveShowcaseDraft('p1', { draftValues: { projectSlogan: 'x' } });
    saveShowcaseDraft('p2', { draftValues: { projectSlogan: 'y' } });

    const restored = loadShowcaseDraft('p1');
    assert.deepEqual(restored.draftValues, { projectSlogan: 'x' });
    assert.equal(typeof restored.savedAt, 'string');

    clearShowcaseDraft('p1');
    assert.equal(loadShowcaseDraft('p1'), null);
    // supprimer un brouillon ne doit pas emporter celui des autres projets
    assert.deepEqual(loadShowcaseDraft('p2').draftValues, { projectSlogan: 'y' });
  } finally {
    delete globalThis.window;
  }
});

test('brouillon : sans localStorage, lecture et écriture restent silencieuses', () => {
  assert.equal(loadShowcaseDraft('p1'), null);
  assert.doesNotThrow(() => saveShowcaseDraft('p1', { draftValues: {} }));
  assert.doesNotThrow(() => clearShowcaseDraft('p1'));
});
