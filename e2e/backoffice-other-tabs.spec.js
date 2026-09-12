import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

async function openBackOffice(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
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
    // Le nom d'équipe et le contact (PeoplePicker) sont tous deux des input[type="text"] dans
    // chaque carte équipe, dans cet ordre : cibler le dernier input du document attraperait le
    // champ contact de la nouvelle équipe plutôt que son nom. On scope donc à sa carte.
    await page.locator('article').last().locator('input[type="text"]').first().fill('Equipe e2e cross-tab');

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
