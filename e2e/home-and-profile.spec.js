import { test, expect } from '@playwright/test';
import { gotoHome, collectConsoleErrors } from './fixtures.js';

test.describe('HomeScreen : CRUD projet', () => {
  test('créer, dupliquer puis annuler et enfin confirmer la suppression d\'un projet', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);

    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet e2e Home CRUD');
    await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).click();
    await expect(page.getByText('Projet e2e Home CRUD').first()).toBeVisible();

    await page.locator('button[aria-label*="Dupliquer le projet"]').first().click();
    const projectCountAfterDuplicate = await page.getByText('Projet e2e Home CRUD').count();
    expect(projectCountAfterDuplicate).toBeGreaterThan(1);

    // Annuler une suppression ne doit rien changer.
    await page.locator('button[aria-label*="Supprimer le projet"]').first().click();
    await expect(page.getByText('Supprimer le projet ?')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).last().click();
    expect(await page.getByText('Projet e2e Home CRUD').count()).toBe(projectCountAfterDuplicate);

    // Confirmer une suppression retire bien le projet.
    await page.locator('button[aria-label*="Supprimer le projet"]').first().click();
    await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
    expect(await page.getByText('Projet e2e Home CRUD').count()).toBe(projectCountAfterDuplicate - 1);
    expect(errors).toEqual([]);
  });
});

test.describe('Profil et persistance', () => {
  test("changer la langue dans le profil s'applique immédiatement puis persiste après un rechargement complet", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Mon profil' }).click();
    await page.locator('#profile-language-select').selectOption('en');
    // La langue s'applique en direct dès la sélection (avant même Enregistrer) : le bouton
    // "Enregistrer" est donc déjà affiché sous son libellé anglais "Save" à ce stade.
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('your compliance copilot', { exact: false })).toBeVisible();

    await page.reload();
    await expect(page.getByText('your compliance copilot', { exact: false })).toBeVisible();
  });

  test("l'onboarding ne réapparaît pas après un rechargement complet une fois terminé", async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Créer un projet/ }).first()).toBeVisible();
  });
});
