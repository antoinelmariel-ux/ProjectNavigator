import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

async function openBackOffice(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
}

test.describe('Bouton d’accès au back-office (cadenas)', () => {
  // Hors SharePoint (ce serveur de test l'est, comme file://), il n'existe aucune session SPO
  // pour désigner quiconque : le cadenas est visible pour tous et c'est le mot de passe
  // partagé qui fait foi. En mode SharePoint il reste réservé aux personnes désignées.
  test('apparaît pour tous hors SharePoint et ouvre la saisie du mot de passe', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await expect(page.getByRole('heading', { name: 'Accès back-office' })).toBeVisible();
  });

  test('un mot de passe erroné laisse la personne non désignée hors du back-office', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await page.getByLabel(/Mot de passe/).fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Déverrouiller' }).click();
    await expect(page.getByRole('heading', { name: 'Back-office', exact: true })).toHaveCount(0);
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

  // Le banc d'essai de la revue compliance a ajouté un second chemin de création de règle ;
  // celui de l'onglet Règles doit rester intact : création, nommage, condition, enregistrement.
  test('créer une règle depuis l\'onglet Règles reste possible de bout en bout', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openBackOffice(page);
    const rulesTab = page.getByRole('tab', { name: /Règles/ });
    await rulesTab.click();
    const beforeCount = parseInt((await rulesTab.textContent()).match(/\((\d+)\)/)[1], 10);

    await page.getByRole('button', { name: 'Ajouter une règle' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Ex: Projet digital avec données de santé').fill('Règle e2e onglet Règles');
    await dialog.getByRole('button', { name: 'Ajouter un groupe' }).first().click();
    await expect(dialog.getByText('Groupe 1')).toBeVisible();
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(rulesTab).toHaveText(`Règles (${beforeCount + 1})`);
    expect(errors).toEqual([]);
  });

  test('modifier une règle existante depuis l\'onglet Règles reste possible', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openBackOffice(page);
    const rulesTab = page.getByRole('tab', { name: /Règles/ });
    await rulesTab.click();
    const before = await rulesTab.textContent();

    await page.locator('button[aria-label^="Afficher la règle"]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Édition de règle' })).toBeVisible();

    await dialog.getByPlaceholder('Ex: Projet digital avec données de santé').fill('Règle existante renommée e2e');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();

    // Renommer ne crée pas de doublon : le compteur de l'onglet ne bouge pas.
    await expect(rulesTab).toHaveText(before);
    await page.locator('#rule-title-filter').fill('renommée e2e');
    await expect(page.getByRole('heading', { name: /renommée e2e/ })).toBeVisible();
    expect(errors).toEqual([]);
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
