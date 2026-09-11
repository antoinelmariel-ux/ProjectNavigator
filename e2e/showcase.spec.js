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
    expect(shareUrl).toContain('sv=');

    // Simule un visiteur sans profil enregistré (onboarding jamais terminé) qui a malgré
    // tout accès aux mêmes données locales — le seul cas testable en mode mock, la vraie
    // situation multi-utilisateurs dépendant du backend SharePoint (hors périmètre local).
    await page.evaluate(() => window.localStorage.removeItem('complianceNavigatorMockUserProfiles'));
    await page.goto(shareUrl);

    await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toHaveCount(0);
    await expect(page.getByText('LFB, L’ENGAGEMENT ÉTHIQUE')).toBeVisible();
  });

  test('un lien partagé masque la navigation et ne révèle pas le mode d\'affichage', async ({ page }) => {
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    await page.getByRole('button', { name: 'Partager' }).click();
    await page.getByRole('button', { name: 'Mode Light', exact: true }).click();
    const shareUrl = await page.locator('input[readonly], input[type="text"]').first().inputValue();

    // Le mode ne doit apparaître nulle part : sinon le destinataire d'un lien « allégé »
    // n'a qu'à retirer le paramètre pour ouvrir la vitrine complète.
    expect(shareUrl).not.toContain('light');
    expect(shareUrl).not.toContain('showcaseMode');
    expect(shareUrl).not.toContain('showcaseShared');
    expect(shareUrl).not.toContain('projectId');

    await page.goto(shareUrl);

    await expect(page.locator('.sg-shell').first()).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Project Navigator' })).toHaveCount(0);
  });
});
