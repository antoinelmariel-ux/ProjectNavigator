import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Les payloads .txt sont le canal de mise à jour sur un site SharePoint sans autorisation
// « custom script » ; les manifests .js embarqués sont le repli. Toute divergence entre les
// deux ferait démarrer les utilisateurs sur une version différente de celle qu'on croit
// publier — d'où ces garde-fous, qui échouent si un seul des deux formats a été régénéré.

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const read = (relativePath) => fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf8');

const evaluateManifestScript = (source) => {
  const win = {};
  new Function('window', source)(win);
  return win;
};

const corePayload = JSON.parse(read('module-manifest.core.txt'));
const deferredPayload = JSON.parse(read('module-manifest.deferred.txt'));
const versionPayload = JSON.parse(read('module-manifest.version.txt'));

const bundledCore = evaluateManifestScript(read('module-manifest.js'));
const bundledDeferred = evaluateManifestScript(read('module-manifest.deferred.js'));

test('payloads : forme attendue', () => {
  assert.equal(corePayload.kind, 'core');
  assert.equal(deferredPayload.kind, 'deferred');
  assert.equal(typeof corePayload.version, 'string');
  assert.ok(corePayload.version.length > 0);
  assert.ok(corePayload.modules && typeof corePayload.modules === 'object');
  assert.ok(deferredPayload.modules && typeof deferredPayload.modules === 'object');
});

test('payloads : les trois fichiers annoncent la même version', () => {
  assert.equal(deferredPayload.version, corePayload.version);
  assert.equal(versionPayload.version, corePayload.version);
});

test('payloads : la version embarquée dans les manifests .js correspond', () => {
  assert.equal(bundledCore.__CN_MANIFEST_BUNDLED_VERSION__, corePayload.version);
  assert.equal(bundledDeferred.__CN_MANIFEST_BUNDLED_DEFERRED_VERSION__, corePayload.version);
});

test('payload cœur : mêmes modules que module-manifest.js', () => {
  assert.deepEqual(
    Object.keys(corePayload.modules).sort(),
    Object.keys(bundledCore.__COMPLIANCE_NAVIGATOR_MANIFEST__).sort()
  );
  Object.entries(corePayload.modules).forEach(([key, code]) => {
    assert.equal(code, bundledCore.__COMPLIANCE_NAVIGATOR_MANIFEST__[key], `module divergent : ${key}`);
  });
});

test('payload différé : mêmes modules que module-manifest.deferred.js', () => {
  assert.deepEqual(
    Object.keys(deferredPayload.modules).sort(),
    Object.keys(bundledDeferred.__COMPLIANCE_NAVIGATOR_MANIFEST__).sort()
  );
  Object.entries(deferredPayload.modules).forEach(([key, code]) => {
    assert.equal(
      code,
      bundledDeferred.__COMPLIANCE_NAVIGATOR_MANIFEST__[key],
      `module différé divergent : ${key}`
    );
  });
});

test('payload cœur : les styles correspondent à tailwind-internal.css', () => {
  assert.equal(corePayload.styles, read(path.join('styles', 'tailwind-internal.css')));
});

test('cœur et différé sont disjoints', () => {
  const coreKeys = new Set(Object.keys(corePayload.modules));
  Object.keys(deferredPayload.modules).forEach((key) => {
    assert.equal(coreKeys.has(key), false, `module présent des deux côtés : ${key}`);
  });
});

test('le manifest différé embarqué ne réinjecte rien quand le payload a déjà servi', () => {
  const win = { __CN_MANIFEST_FROM_PAYLOAD__: true, __COMPLIANCE_NAVIGATOR_MANIFEST__: {} };
  new Function('window', read('module-manifest.deferred.js'))(win);
  assert.deepEqual(win.__COMPLIANCE_NAVIGATOR_MANIFEST__, {});
  assert.equal(win.__CN_DEFERRED_READY__, undefined);
});
