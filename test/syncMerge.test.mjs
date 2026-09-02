import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeServerAndLocalProjects } from '../src/utils/syncMerge.js';

test('le serveur fait autorité sur les projets qu’il connaît', () => {
  const merged = mergeServerAndLocalProjects(
    [{ id: 'p-1', projectName: 'Version serveur', rowVersion: 4 }],
    [{ id: 'p-1', projectName: 'Version locale périmée', rowVersion: 2 }]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].projectName, 'Version serveur');
});

test('un projet local jamais synchronisé est conservé', () => {
  const merged = mergeServerAndLocalProjects(
    [{ id: 'p-1', projectName: 'Sur le serveur' }],
    [
      { id: 'p-1', projectName: 'Copie locale' },
      { id: 'p-local', projectName: 'Brouillon non synchronisé' }
    ]
  );

  assert.deepEqual(
    merged.map((project) => project.id),
    ['p-1', 'p-local']
  );
  assert.equal(merged[1].projectName, 'Brouillon non synchronisé');
});

test('serveur vide : rien n’est perdu', () => {
  const local = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(mergeServerAndLocalProjects([], local), local);
});

test('local vide : la liste serveur est reprise telle quelle', () => {
  const server = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(mergeServerAndLocalProjects(server, []), server);
});

test('le projet de démo local n’est jamais conservé comme « non synchronisé »', () => {
  const merged = mergeServerAndLocalProjects(
    [{ id: 'p-1', projectName: 'Sur le serveur' }],
    [
      { id: 'p-1', projectName: 'Copie locale' },
      { id: 'demo-project', projectName: 'Plasma 360', isDemo: true }
    ]
  );

  assert.deepEqual(
    merged.map((project) => project.id),
    ['p-1']
  );
});

test('entrées nulles et valeurs non tableau ignorées sans planter', () => {
  assert.deepEqual(mergeServerAndLocalProjects(null, undefined), []);
  assert.deepEqual(mergeServerAndLocalProjects([null, { id: 'a' }], [undefined, { id: 'a' }]), [
    { id: 'a' }
  ]);
});
