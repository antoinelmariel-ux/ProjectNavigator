import { test, expect } from '@playwright/test';
import {
  gotoHome,
  grantAdminAccess,
  createAndSubmitProject,
  openTriggeredProjectAndExpandTeam,
  collectConsoleErrors
} from './fixtures.js';

test.describe('Back-office : onglet Traductions', () => {
  test('affiche les 4 langues côte à côte et permet de compléter une traduction manquante sans sélecteur de langue', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantAdminAccess(page);

    await page.getByRole('tab', { name: /Traductions/ }).click();
    await expect(page.getByRole('heading', { name: 'Traductions manquantes' })).toBeVisible();

    // Les données de démonstration des équipes ne sont pas encore traduites (chaînes françaises
    // héritées) : une ligne pour "Contrôle pub" doit apparaître avec ses 4 langues éditables.
    const row = page.locator('tr', { hasText: "Équipe « Contrôle pub » — nom" });
    await expect(row).toBeVisible();
    const englishField = row.getByLabel(/English —/);
    await englishField.fill('Ad review');
    await expect(englishField).toHaveValue('Ad review');

    // Toujours pas de bouton de sélection de langue à activer : les 4 colonnes restent visibles.
    await expect(row.getByLabel(/Français —/)).toBeVisible();
    await expect(row.getByLabel(/Deutsch —/)).toBeVisible();
    await expect(row.getByLabel(/Español —/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('un contact d\'équipe ne voit que les traductions concernant son équipe', async ({ page }) => {
    await gotoHome(page);
    await grantAdminAccess(page);

    await page.getByRole('tab', { name: /Équipes/ }).click();
    const contactsField = page.locator('input[id$="-contact"]').first();
    await contactsField.fill('bertrand.darieux@entreprise-demo.example');
    await contactsField.press('Enter');
    await page.waitForTimeout(300);

    // Retire les droits admin (en gardant le statut de contact d'équipe déjà persisté) pour
    // basculer sur la vue restreinte "responsable compliance" — être à la fois admin et contact
    // d'équipe garde sciemment l'accès admin complet (voir grantSelfComplianceExpertAndCommitteeAccess).
    await page.addInitScript(() => {
      const KEY = 'complianceNavigatorState';
      let state = {};
      try {
        state = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {};
      } catch {
        state = {};
      }
      state.adminEmails = (Array.isArray(state.adminEmails) ? state.adminEmails : [])
        .filter((email) => email !== 'bertrand.darieux@entreprise-demo.example');
      window.localStorage.setItem(KEY, JSON.stringify(state));
    });
    await page.reload();
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();

    await page.getByRole('tab', { name: /Traductions/ }).click();
    await expect(page.getByText('Vous voyez uniquement les traductions concernant vos équipes.')).toBeVisible();
    await expect(page.locator('tr', { hasText: "Équipe « Contrôle pub » — nom" })).toBeVisible();
    // Onglet "Administrateurs" masqué dans cette vue restreinte : pas de contenu global visible.
    await expect(page.getByRole('tab', { name: 'Administrateurs' })).toHaveCount(0);
  });
});

test.describe('Langues de réponse acceptées', () => {
  test('une équipe restreinte à l\'anglais affiche un rappel clair dans le bloc de réponse', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantAdminAccess(page);

    await page.getByRole('tab', { name: /Équipes/ }).click();
    const contactsField = page.locator('input[id$="-contact"]').first();
    await contactsField.fill('bertrand.darieux@entreprise-demo.example');
    await contactsField.press('Enter');

    const controlePubCard = page.locator('article', { hasText: 'Contrôle pub' }).first();
    await controlePubCard.getByRole('checkbox', { name: 'English' }).check();

    await page.getByRole('button', { name: 'Mode Chef de Projet' }).click();
    await expect(page.getByRole('button', { name: /Créer un projet/ }).first()).toBeVisible();

    await createAndSubmitProject(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    const notice = page.getByText(/échange uniquement dans les langues suivantes/);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('English');

    expect(errors).toEqual([]);
  });
});
