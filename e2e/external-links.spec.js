import { test, expect } from '@playwright/test';
import { gotoHome, patchStateOnBoot, walkToSynthesis } from './fixtures.js';
import { initialRules } from '../src/data/rules.js';

const LINK_URL = 'https://example.com/guide-compliance';

// Une page SharePoint moderne intercepte les clics sur les liens (navigation sans rechargement) :
// on la simule par un écouteur au niveau du document qui navigue dans l'onglet courant, sans même
// respecter data-interception, pour vérifier que le relais de l'app suffit à lui seul.
test('un lien ajouté dans un point à préparer s’ouvre dans un nouvel onglet, même intercepté', async ({ page, context }) => {
  await context.route('https://example.com/**', (route) => route.fulfill({ body: 'ok', contentType: 'text/plain' }));
  const rules = initialRules.map((rule) => ({
    ...rule,
    questions: Object.fromEntries(
      Object.entries(rule.questions || {}).map(([teamId, entries]) => [
        teamId,
        (entries || []).map((entry, index) =>
          index === 0 ? { ...entry, text: { fr: `Lire <a href="${LINK_URL}">le guide</a>`, en: 'Guide' } } : entry
        )
      ])
    )
  }));
  await patchStateOnBoot(page, (state, nextRules) => ({ ...(state || {}), rules: nextRules }), rules);
  await page.addInitScript(() => {
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('a[href]');
      if (link) {
        event.preventDefault();
        window.location.assign(link.href);
      }
    });
  });

  await gotoHome(page);
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkToSynthesis(page);
  await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
  await page.locator('button[aria-expanded="false"]').evaluateAll((buttons) => buttons.forEach((button) => button.click()));

  const link = page.locator(`a[href="${LINK_URL}"]`).first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('data-interception', 'off');

  const appUrl = page.url();
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe(LINK_URL);
  expect(page.url()).toBe(appUrl);
  await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
});
