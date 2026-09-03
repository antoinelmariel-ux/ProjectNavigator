import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

test.describe('ProjectShowcase', () => {
  test('affiche les libellés d\'options dans la langue courante (pas toujours en anglais)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    // "targetAudience" a pour première option "Grand public" (fr) / "General public" (en).
    // getFormattedAnswer() oubliait de transmettre la langue courante à formatAnswer(),
    // qui retombait alors sur l'anglais par défaut quel que soit l'affichage du reste de la page.
    await expect(page.getByText('Grand public')).toBeVisible();
    await expect(page.getByText('General public')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('le mode édition et le panneau de partage s\'ouvrent sans erreur', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    await page.getByRole('button', { name: 'Modifier' }).click();
    await expect(page.getByText('MODE ÉDITION ACTIF')).toBeVisible();

    await page.getByRole('button', { name: 'Partager' }).click();
    await expect(page.getByText('Partager la vitrine du projet')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('un lien de vitrine partagée reste consultable sans onboarding complété', async ({ page }) => {
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    await page.getByRole('button', { name: 'Partager' }).click();
    const shareUrl = await page.locator('input[readonly], input[type="text"]').first().inputValue();
    expect(shareUrl).toContain('showcaseShared=1');

    // Simule un visiteur sans profil enregistré (onboarding jamais terminé) qui a malgré
    // tout accès aux mêmes données locales — le seul cas testable en mode mock, la vraie
    // situation multi-utilisateurs dépendant du backend SharePoint (hors périmètre local).
    await page.evaluate(() => window.localStorage.removeItem('complianceNavigatorMockUserProfiles'));
    await page.goto(shareUrl);

    await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toHaveCount(0);
    await expect(page.getByText('LFB, L’ENGAGEMENT ÉTHIQUE')).toBeVisible();
  });
});
