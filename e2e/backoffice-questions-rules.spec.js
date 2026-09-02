import { test, expect } from '@playwright/test';
import { gotoHome, collectConsoleErrors } from './fixtures.js';

// Le mot de passe admin n'est jamais committé : ces tests le lisent depuis l'environnement
// et se désactivent proprement s'il est absent, plutôt que d'échouer en CI/local sans lui.
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function unlockAdmin(page, password) {
  await page.getByRole('button', { name: /Activer le mode administrateur/ }).click();
  await page.getByRole('heading', { name: 'Accès back-office' }).waitFor();
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
}

async function openBackOffice(page) {
  await gotoHome(page);
  await unlockAdmin(page, ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();
}

test.describe('Authentification back-office', () => {
  test('un mauvais mot de passe affiche une erreur et ne déverrouille pas', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Activer le mode administrateur/ }).click();
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Déverrouiller' }).click();
    // Le message d'erreur s'affiche à la fois dans la modale et dans la barre de nav
    // (backOfficePromptError + backOfficeAuthError) : on vérifie celui de la modale, actif.
    await expect(
      page.getByRole('dialog', { name: 'Accès back-office' }).getByRole('alert')
    ).toHaveText('Mot de passe incorrect. Veuillez réessayer.');
    await expect(page.getByRole('button', { name: /Accéder au Back-office/ })).toHaveCount(0);
  });
});

test.describe('Back-office : éditeurs Questions & Règles', () => {
  test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non fourni : tests back-office ignorés.');

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
