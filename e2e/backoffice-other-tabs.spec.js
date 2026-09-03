import { test, expect } from '@playwright/test';
import { gotoHome, collectConsoleErrors } from './fixtures.js';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function openBackOffice(page) {
  await gotoHome(page);
  await page.getByRole('button', { name: /Activer le mode administrateur/ }).click();
  await page.getByRole('heading', { name: 'Accès back-office' }).waitFor();
  await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();
}

const OTHER_TABS = [
  'Filtres d’accueil',
  'Inspiration',
  'Thèmes vitrine',
  'Onboarding',
  'Comités de validation',
  'Administrateurs',
  'Niveaux de complexité',
  'Équipes',
  'Revue Compliance'
];

test.describe('Back-office : autres onglets', () => {
  test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non fourni : tests back-office ignorés.');

  for (const tabName of OTHER_TABS) {
    test(`l'onglet "${tabName}" s'ouvre sans erreur console`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await openBackOffice(page);
      await page.getByRole('tab', { name: new RegExp(tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
      await page.waitForTimeout(300);
      expect(errors).toEqual([]);
    });
  }

  test('une équipe créée apparaît immédiatement dans l\'éditeur de règles (sans reload)', async ({ page }) => {
    await openBackOffice(page);
    await page.getByRole('tab', { name: /Équipes/ }).click();
    await page.getByRole('button', { name: /Ajouter une équipe/ }).click();
    await page.locator('input[type="text"]').last().fill('Equipe e2e cross-tab');

    await page.getByRole('tab', { name: /Règles/ }).click();
    await page.getByRole('button', { name: 'Ajouter une règle' }).click();
    await expect(page.getByRole('button', { name: 'Equipe e2e cross-tab' })).toBeVisible();
  });

  test('les filtres du tableau de bord se combinent sans erreur, y compris sur un résultat restreint', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openBackOffice(page);
    await page.getByRole('tab', { name: 'Tableau de bord' }).click();

    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i += 1) {
      const options = await selects.nth(i).locator('option').allTextContents();
      if (options.length > 1) {
        await selects.nth(i).selectOption({ index: options.length - 1 });
      }
    }
    await expect(page.getByText('Nombre de projets soumis')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
