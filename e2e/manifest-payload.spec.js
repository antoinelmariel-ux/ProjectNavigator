// Chemin de démarrage (index.html) : sous http(s) l'app se recharge depuis les payloads .txt
// avant de booter, et retombe sur les manifests .js embarqués dès que quelque chose cloche.
// C'est la partie la plus fragile du dispositif — un mélange de versions ne casserait que les
// composants différés, au premier clic — donc elle est testée pour elle-même.
import { test, expect } from '@playwright/test';

const PAYLOAD_GLOB = '**/module-manifest.*.txt*';
const VERSION_GLOB = '**/module-manifest.version.txt*';

const bootState = (page) =>
  page.evaluate(() => ({
    fromPayload: window.__CN_MANIFEST_FROM_PAYLOAD__ === true,
    version: window.__CN_MANIFEST_VERSION__ || null,
    bundledVersion: window.__CN_MANIFEST_BUNDLED_VERSION__ || null,
    deferredReady: window.__CN_DEFERRED_READY__ === true,
    moduleCount: Object.keys(window.__COMPLIANCE_NAVIGATOR_MANIFEST__ || {}).length,
    hasDeferredModule: Boolean(
      (window.__COMPLIANCE_NAVIGATOR_MANIFEST__ || {})['src/components/BackOffice.jsx']
    ),
    payloadStyleLength: (document.getElementById('cn-app-stylesheet-payload') || {}).textContent
      ? document.getElementById('cn-app-stylesheet-payload').textContent.length
      : 0,
    bundledStylesheetDisabled: Boolean(
      (document.getElementById('cn-app-stylesheet') || {}).disabled
    )
  }));

const expectAppRendered = async (page) => {
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toBeVisible();
};

test('démarrage nominal : les payloads .txt remplacent les manifests embarqués', async ({ page }) => {
  await page.goto('/index.html');
  await expectAppRendered(page);

  const state = await bootState(page);
  expect(state.fromPayload).toBe(true);
  expect(state.version).toBeTruthy();
  expect(state.version).toBe(state.bundledVersion);
  expect(state.deferredReady).toBe(true);
  expect(state.hasDeferredModule).toBe(true);
  expect(state.moduleCount).toBeGreaterThan(50);
});

test('démarrage nominal : les styles du payload remplacent la feuille embarquée', async ({ page }) => {
  await page.goto('/index.html');
  await expectAppRendered(page);

  const state = await bootState(page);
  expect(state.payloadStyleLength).toBeGreaterThan(1000);
  expect(state.bundledStylesheetDisabled).toBe(true);

  // La cascade doit rester celle du document d'origine : le <style> inline du <head> suit la
  // feuille Tailwind, et continue donc de l'emporter.
  const overrideStillApplies = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'hv-modal-panel';
    document.body.appendChild(probe);
    const value = window.getComputedStyle(probe).maxHeight;
    probe.remove();
    return value;
  });
  expect(overrideStillApplies).not.toBe('none');
});

test('payloads injoignables : repli silencieux sur les manifests embarqués', async ({ page }) => {
  await page.route(PAYLOAD_GLOB, (route) => route.abort());

  await page.goto('/index.html');
  await expectAppRendered(page);

  const state = await bootState(page);
  expect(state.fromPayload).toBe(false);
  expect(state.deferredReady).toBe(true);
  expect(state.hasDeferredModule).toBe(true);
  expect(state.bundledStylesheetDisabled).toBe(false);
});

test('payloads en 404 : repli sur les manifests embarqués', async ({ page }) => {
  await page.route(PAYLOAD_GLOB, (route) => route.fulfill({ status: 404, body: 'Not found' }));

  await page.goto('/index.html');
  await expectAppRendered(page);

  expect((await bootState(page)).fromPayload).toBe(false);
});

test('version incohérente : le payload est rejeté en bloc, pas appliqué à moitié', async ({ page }) => {
  // Cas d'un déploiement à moitié copié : le fichier de version annonce une publication que
  // les deux gros payloads ne portent pas encore.
  await page.route(VERSION_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: JSON.stringify({ version: 'version-qui-nexiste-pas' })
    })
  );

  await page.goto('/index.html');
  await expectAppRendered(page);

  const state = await bootState(page);
  expect(state.fromPayload).toBe(false);
  expect(state.hasDeferredModule).toBe(true);
});

test('payload tronqué : repli sur les manifests embarqués', async ({ page }) => {
  await page.route('**/module-manifest.core.txt*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: '{"kind":"core","version":"abc","modules":{'
    })
  );

  await page.goto('/index.html');
  await expectAppRendered(page);

  const state = await bootState(page);
  expect(state.fromPayload).toBe(false);
  expect(state.hasDeferredModule).toBe(true);
});

test('un composant différé monte bien depuis le payload', async ({ page }) => {
  await page.goto('/index.html');
  await expectAppRendered(page);
  expect((await bootState(page)).fromPayload).toBe(true);

  // ProjectShowcase / BackOffice / SynthesisReport viennent du manifest différé : les monter
  // est ce qui révélerait un mélange entre payload et manifests embarqués.
  const mounted = await page.evaluate(() => {
    const manifest = window.__COMPLIANCE_NAVIGATOR_MANIFEST__ || {};
    return [
      'src/components/BackOffice.jsx',
      'src/components/ProjectShowcase.jsx',
      'src/components/SynthesisReport.jsx'
    ].every((key) => typeof manifest[key] === 'string' && manifest[key].length > 0);
  });
  expect(mounted).toBe(true);

  const loaded = await page.evaluate(() => {
    try {
      const module = window.ModuleLoader.import('./src/components/BackOffice.jsx');
      return typeof module.BackOffice === 'function';
    } catch (error) {
      return String(error && error.message ? error.message : error);
    }
  });
  expect(loaded).toBe(true);
});
