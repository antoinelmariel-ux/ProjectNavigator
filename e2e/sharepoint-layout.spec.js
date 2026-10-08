import { test, expect } from '@playwright/test';
import { completeOnboarding, collectConsoleErrors } from './fixtures.js';

// Sur une page SharePoint l'app n'est qu'un web part : la page a son propre bandeau, et c'est un
// conteneur interne qui défile, pas la fenêtre. harness/sharepoint-layout.html reproduit les deux.
const gotoSharePointLayout = async (page) => {
  await page.goto('/harness/sharepoint-layout.html');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toBeVisible();
};

test.describe('Intégration dans une page hôte (type SharePoint)', () => {
  test('le reset CSS de l’app ne touche pas la page hôte', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoSharePointLayout(page);

    const host = await page.evaluate(() => {
      const button = getComputedStyle(document.getElementById('host-button'));
      return {
        bodyMargin: getComputedStyle(document.body).marginTop,
        buttonBackground: button.backgroundColor,
        buttonBorderWidth: button.borderTopWidth,
        linkDecoration: getComputedStyle(document.getElementById('host-link')).textDecorationLine
      };
    });
    expect(host.bodyMargin).toBe('8px');
    expect(host.buttonBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(host.buttonBorderWidth).not.toBe('0px');
    expect(host.linkDecoration).toBe('underline');

    const appButtonBorder = await page
      .getByRole('button', { name: 'Continuer' })
      .evaluate((element) => getComputedStyle(element).boxSizing);
    expect(appButtonBorder).toBe('border-box');
    expect(errors).toEqual([]);
  });

  test('changer d’écran ramène le conteneur hôte en haut, pas la fenêtre', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoSharePointLayout(page);
    await completeOnboarding(page);

    const scroller = page.locator('#host-scroller');
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(await scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await expect(page.locator('[id^="question-"]').first()).toBeVisible();
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('les mentions légales s’ouvrent dans l’app', async ({ page }) => {
    await gotoSharePointLayout(page);
    await completeOnboarding(page);

    await page.getByRole('link', { name: 'Mentions légales' }).click();
    const dialog = page.locator('[data-static-page="mentions-legales"]');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.frameLocator('iframe').getByRole('heading', { name: /Confiance et transparence/ })
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
