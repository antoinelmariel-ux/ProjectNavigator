import { test, expect } from '@playwright/test';
import { gotoHome } from './fixtures.js';

const SHOT = '/tmp/claude-0/-home-user-ProjectNavigator/805d599f-d693-56da-b13d-e147a78ab407/scratchpad';

// Hors SharePoint, aucune session SPO ne désigne qui que ce soit : le cadenas est visible pour
// tous et le mot de passe partagé est la seule porte. Le mot de passe réel n'est jamais commité,
// donc ces specs vérifient le chemin d'accès et le refus, pas le déverrouillage réussi.
test.describe('Accès back-office par mot de passe partagé (hors SharePoint)', () => {
  test('le cadenas est visible pour une personne non désignée', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole('button', { name: /Accéder au Back-office/ })).toBeVisible();
    await page.screenshot({ path: `${SHOT}/10-lock-visible.png`, fullPage: true });
  });

  test('le cadenas ouvre la saisie du mot de passe et non le back-office', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();

    await expect(page.getByRole('heading', { name: 'Accès back-office' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Back-office', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${SHOT}/11-password-prompt.png`, fullPage: true });
  });

  test('un mot de passe vide est refusé avec un message', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await page.getByRole('button', { name: 'Déverrouiller' }).click();

    await expect(page.getByText('Veuillez saisir un mot de passe.')).toBeVisible();
  });

  test('un mot de passe erroné est refusé et laisse la personne hors du back-office', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await page.getByPlaceholder('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Déverrouiller' }).click();

    // Le message apparaît deux fois : dans la fenêtre de saisie et dans la bannière d'erreur
    // globale (backOfficePromptError / backOfficeAuthError) — les deux sont voulus.
    await expect(page.getByText('Mot de passe incorrect. Veuillez réessayer.').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Back-office', exact: true })).toHaveCount(0);
  });

  test('annuler la saisie referme la fenêtre sans donner accès', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await page.getByRole('button', { name: 'Annuler' }).click();

    await expect(page.getByRole('heading', { name: 'Accès back-office' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Back-office', exact: true })).toHaveCount(0);
  });
});
