import { test, expect } from '@playwright/test';
import { gotoFresh, patchStateOnBoot } from './fixtures.js';

test.describe('Bande d’identification de la plateforme', () => {
  test('aucune bande par défaut', async ({ page }) => {
    await gotoFresh(page);
    await expect(page.getByTestId('environment-banner')).toHaveCount(0);
  });

  test('la bande s’affiche avec le texte configuré dans settings', async ({ page }) => {
    await gotoFresh(page);
    await patchStateOnBoot(page, (state) => ({
      ...(state || {}),
      environmentBanner: { enabled: true, label: 'Recette interne', tone: 'violet' }
    }));
    await page.reload();
    await expect(page.getByTestId('environment-banner')).toHaveText('Recette interne');
  });

  test('sans texte, la bande reprend le libellé par défaut', async ({ page }) => {
    await gotoFresh(page);
    await patchStateOnBoot(page, (state) => ({
      ...(state || {}),
      environmentBanner: { enabled: true }
    }));
    await page.reload();
    await expect(page.getByTestId('environment-banner')).toHaveText('Plateforme de démonstration');
  });

  test('une bande désactivée ne s’affiche pas', async ({ page }) => {
    await gotoFresh(page);
    await patchStateOnBoot(page, (state) => ({
      ...(state || {}),
      environmentBanner: { enabled: false, label: 'Recette interne' }
    }));
    await page.reload();
    await expect(page.getByTestId('environment-banner')).toHaveCount(0);
  });
});
