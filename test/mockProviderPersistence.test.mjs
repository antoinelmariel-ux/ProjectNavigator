import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPersistedMockMap, savePersistedMockMap } from '../src/utils/mockProviderPersistence.js';

// Mécanisme que les providers Mock* (membres de projet, profils, commentaires, post-it)
// utilisent pour survivre à un rechargement hors mode SharePoint. La régression qu'il corrige
// — une Map nue qui repart vide à chaque F5 parce que le module est réévalué — n'est pas
// observable depuis les tests e2e : l'écran lit `activeProject.sharedWith`, restauré par
// `complianceNavigatorState`, et non la carte du provider. Elle se pin donc ici.
const withFakeStorage = (fn, initial = {}) => {
  const previous = globalThis.window;
  const store = { ...initial };
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: (key) => {
        delete store[key];
      }
    }
  };
  try {
    return fn(store);
  } finally {
    globalThis.window = previous;
  }
};

test('un provider rechargé retrouve ce qu’un précédent avait écrit', () => {
  withFakeStorage(() => {
    const first = new Map([['projet-1', ['a@entreprise-demo.example', 'b@entreprise-demo.example']]]);
    savePersistedMockMap('cn-test-members', first);

    // Deuxième instance : c'est ce que fait le module réévalué après un F5.
    const reloaded = loadPersistedMockMap('cn-test-members');
    assert.deepEqual(reloaded.get('projet-1'), ['a@entreprise-demo.example', 'b@entreprise-demo.example']);
    assert.equal(reloaded.size, 1);
  });
});

test('une écriture ultérieure n’écrase pas les entrées déjà persistées', () => {
  withFakeStorage(() => {
    savePersistedMockMap('cn-test-members', new Map([['projet-1', ['a@entreprise-demo.example']]]));

    // Le provider recharge, ajoute, puis réécrit : c'est la séquence réelle. Repartir d'une
    // Map vide ici (la régression) ferait disparaître « projet-1 » de la sauvegarde.
    const reloaded = loadPersistedMockMap('cn-test-members');
    reloaded.set('projet-2', ['c@entreprise-demo.example']);
    savePersistedMockMap('cn-test-members', reloaded);

    const final = loadPersistedMockMap('cn-test-members');
    assert.deepEqual(final.get('projet-1'), ['a@entreprise-demo.example']);
    assert.deepEqual(final.get('projet-2'), ['c@entreprise-demo.example']);
  });
});

test('une clé absente donne une Map vide, pas une erreur', () => {
  withFakeStorage(() => {
    assert.equal(loadPersistedMockMap('cn-inexistante').size, 0);
  });
});

test('un contenu corrompu est ignoré au lieu de faire planter le démarrage', () => {
  withFakeStorage(() => {
    assert.equal(loadPersistedMockMap('cn-corrompue').size, 0);
  }, { 'cn-corrompue': '{ceci n est pas du JSON' });

  withFakeStorage(() => {
    assert.equal(loadPersistedMockMap('cn-mauvais-type').size, 0);
  }, { 'cn-mauvais-type': '{"pas":"un tableau"}' });
});

test('sans window (contexte Node), la lecture rend une Map vide et l’écriture ne jette pas', () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    assert.equal(loadPersistedMockMap('cn-sans-window').size, 0);
    assert.doesNotThrow(() => savePersistedMockMap('cn-sans-window', new Map([['a', 1]])));
  } finally {
    globalThis.window = previous;
  }
});
