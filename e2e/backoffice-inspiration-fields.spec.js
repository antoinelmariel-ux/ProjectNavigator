import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

async function openInspirationTab(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /^Inspiration/ }).click();
}

const fieldCards = (page) => page.locator('ol > li').filter({ has: page.getByRole('button', { name: /^Modifier le champ/ }) });

test.describe('Back-office : champs du formulaire inspiration', () => {
  test('créer, modifier, filtrer puis supprimer et restaurer un champ', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openInspirationTab(page);

    const initialCount = await fieldCards(page).count();
    expect(initialCount).toBeGreaterThan(5);

    await page.getByRole('button', { name: 'Ajouter un champ' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau champ' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();

    await dialog.getByLabel('Libellé du champ').fill('Budget estimé');
    await expect(dialog.getByText('Identifiant utilisé : Budget_estime')).toBeVisible();
    await dialog.getByLabel('Type de champ').selectOption('select');
    await dialog.getByLabel('Libellé de l’option 1').fill('Moins de 10 k€');
    await dialog.getByRole('button', { name: 'Ajouter une option' }).click();
    await dialog.getByLabel('Libellé de l’option 2').fill('Plus de 10 k€');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(dialog).toBeHidden();

    await expect(fieldCards(page)).toHaveCount(initialCount + 1);
    const card = fieldCards(page).filter({ hasText: 'Budget estimé' });
    await expect(card.getByText('Personnalisé')).toBeVisible();
    await expect(card.getByText('2 option(s)')).toBeVisible();

    await card.getByRole('button', { name: 'Modifier le champ Budget estimé' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Modifier le champ' });
    await expect(editDialog.getByLabel('Identifiant technique')).toHaveAttribute('readonly', '');
    await editDialog.getByText('Champ requis').click();
    await editDialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(card.getByText('Requis', { exact: true })).toBeVisible();

    await page.getByLabel('Rechercher un champ').fill('budget');
    await expect(fieldCards(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(fieldCards(page)).toHaveCount(initialCount + 1);

    const titleCard = fieldCards(page).first();
    await expect(titleCard.getByRole('button', { name: /^Supprimer le champ/ })).toBeDisabled();

    page.once('dialog', (confirmDialog) => confirmDialog.accept());
    await card.getByRole('button', { name: 'Supprimer le champ Budget estimé' }).click();
    await expect(fieldCards(page)).toHaveCount(initialCount);

    await page.getByRole('button', { name: /Annuler/ }).filter({ hasText: /Ctrl/ }).click();
    await expect(fieldCards(page).filter({ hasText: 'Budget estimé' })).toHaveCount(1);

    expect(errors).toEqual([]);
  });
});
