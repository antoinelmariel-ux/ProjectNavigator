import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

async function openBackOffice(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
}

test.describe('Bouton d’accès au back-office (cadenas)', () => {
  test('n\'apparaît pas pour une personne non désignée dans le back-office', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole('button', { name: /Accéder au Back-office/ })).toHaveCount(0);
  });

  test('envoie directement dans le back-office pour une personne désignée', async ({ page }) => {
    await gotoHome(page);
    // grantAdminAccess clique le bouton cadenas puis vérifie que le back-office s'affiche
    // directement, sans étape intermédiaire.
    await grantAdminAccess(page);
  });
});

test.describe('Back-office : éditeurs Questions & Règles', () => {
  test('le référentiel de démonstration ne signale aucune incohérence', async ({ page }) => {
    await openBackOffice(page);
    await expect(page.getByText('Aucune incohérence détectée dans les données de configuration.')).toBeVisible();
  });

  test('annuler la création d\'une question ne laisse pas d\'entrée fantôme', async ({ page }) => {
    await openBackOffice(page);
    const questionsTab = page.getByRole('tab', { name: /Questions/ });
    await questionsTab.click();
    const before = await questionsTab.textContent();

    await page.getByRole('button', { name: 'Ajouter une question' }).click();
    await expect(page.getByText('Édition de question')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).last().click();

    await expect(questionsTab).toHaveText(before);
  });

  test('enregistrer une nouvelle question la conserve dans le référentiel', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openBackOffice(page);
    const questionsTab = page.getByRole('tab', { name: /Questions/ });
    await questionsTab.click();
    const beforeCount = parseInt((await questionsTab.textContent()).match(/\((\d+)\)/)[1], 10);

    await page.getByRole('button', { name: 'Ajouter une question' }).click();
    await page
      .getByPlaceholder('Ex : Quel est le périmètre de votre projet ?')
      .fill('Question e2e (vérifie la persistance après enregistrement)');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(questionsTab).toHaveText(`Questions (${beforeCount + 1})`);
    expect(errors).toEqual([]);
  });

  test('annuler la duplication d\'une question ne laisse pas d\'entrée fantôme', async ({ page }) => {
    await openBackOffice(page);
    const questionsTab = page.getByRole('tab', { name: /Questions/ });
    await questionsTab.click();
    const before = await questionsTab.textContent();

    const duplicateButtons = page.locator('button[aria-label*="Dupliquer"], button[title*="Dupliquer"]');
    await duplicateButtons.first().click();
    await expect(page.getByText('Édition de question')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).last().click();

    await expect(questionsTab).toHaveText(before);
  });

  test('annuler la création d\'une règle ne laisse pas d\'entrée fantôme', async ({ page }) => {
    await openBackOffice(page);
    const rulesTab = page.getByRole('tab', { name: /Règles/ });
    await rulesTab.click();
    const before = await rulesTab.textContent();

    await page.getByRole('button', { name: 'Ajouter une règle' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Annuler' }).last().click();

    await expect(rulesTab).toHaveText(before);
  });

  test('le constructeur de conditions s\'ouvre sans erreur sur une question existante', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openBackOffice(page);
    await page.getByRole('tab', { name: /Questions/ }).click();

    const editButtons = page.locator('button[aria-label*="Modifier"], button[title*="Modifier"]');
    await editButtons.first().click();
    await expect(page.getByText('Édition de question')).toBeVisible();

    await page.getByRole('button', { name: 'Ajouter un groupe' }).first().click();
    await expect(page.getByText('Groupe 1')).toBeVisible();

    await page.getByRole('button', { name: 'Annuler' }).last().click();
    expect(errors).toEqual([]);
  });
});
