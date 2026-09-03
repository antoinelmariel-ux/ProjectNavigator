import { test, expect } from '@playwright/test';
import { gotoFresh, completeOnboarding, collectConsoleErrors } from './fixtures.js';

test.describe('Démarrage de l\'application', () => {
  test('affiche l\'onboarding sans erreur console au premier chargement', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoFresh(page);
    expect(errors).toEqual([]);
  });

  test('termine l\'onboarding (sans visite guidée) et atteint l\'accueil', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoFresh(page);
    await completeOnboarding(page);

    await expect(
      page.getByText('Anticipez les besoins compliance de vos projets en quelques minutes')
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});
