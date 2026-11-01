import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIST_SCHEMAS } from '../src/utils/listSchemas.js';
import { sharepointConfig } from '../src/config/sharepointConfig.js';

// Le script de VERIFICATION-CONFIGURATION-SHAREPOINT.md crée les listes et leurs colonnes sur le
// site : une colonne lue ou écrite par le code mais absente du script fait échouer l'app au
// chargement sur un site neuf (c'est arrivé avec CancelledDate). On le confronte donc à
// listSchemas.js, qui est la source de vérité.
const doc = readFileSync(new URL('../docs/migration-v2/VERIFICATION-CONFIGURATION-SHAREPOINT.md', import.meta.url), 'utf8');
const script = doc.slice(doc.indexOf('## Le script'));

const scriptLists = new Map();
script.split(/title: '(?=CN_)/).slice(1).forEach((chunk) => {
  const title = chunk.slice(0, chunk.indexOf("'"));
  scriptLists.set(title, new Set(Array.from(chunk.matchAll(/name: '([A-Za-z]+)'/g), (field) => field[1])));
});

test('le script de création contient toutes les listes de l’application', () => {
  assert.deepEqual(Array.from(scriptLists.keys()).sort(), Object.values(sharepointConfig.lists).sort());
});

test('le script de création contient toutes les colonnes de listSchemas.js', () => {
  Object.entries(sharepointConfig.lists).forEach(([key, title]) => {
    const fields = scriptLists.get(title) || new Set();
    const missing = LIST_SCHEMAS[key].columns.filter((column) => column !== 'Title' && !fields.has(column));
    assert.deepEqual(missing, [], `colonnes absentes du script pour ${title}`);
  });
});
