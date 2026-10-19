import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fr from '../src/i18n/dictionaries/fr.js';
import en from '../src/i18n/dictionaries/en.js';
import de from '../src/i18n/dictionaries/de.js';
import es from '../src/i18n/dictionaries/es.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const dictionaries = { fr, en, de, es };

const get = (dictionary, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dictionary);

const listSources = () => {
  const files = [path.join(root, 'App.jsx')];
  const componentsDir = path.join(root, 'components');
  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.jsx')) {
        files.push(full);
      }
    });
  };
  walk(componentsDir);
  return files;
};

// Une clé inexistante n'échoue pas : l'écran affiche la clé brute (« app.update.sentWithImpact »
// au lieu du message). Seules les clés écrites en toutes lettres, t('a.b.c'), sont vérifiables ;
// celles construites à la volée (t(`a.${x}`)) ne le sont pas.
test('chaque clé de traduction littérale utilisée par l’interface existe dans les quatre langues', () => {
  const missing = [];
  listSources().forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'/g)) {
      Object.entries(dictionaries).forEach(([language, dictionary]) => {
        if (typeof get(dictionary, match[1]) !== 'string') {
          missing.push(`${path.relative(root, file)} : ${match[1]} (${language})`);
        }
      });
    }
  });
  assert.deepEqual([...new Set(missing)], []);
});
