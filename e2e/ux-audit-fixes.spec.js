import { test, expect } from '@playwright/test';
import {
  gotoHome,
  walkQuestionnaireToShowcase,
  proceedThroughMandatorySummary,
  collectConsoleErrors
} from './fixtures.js';

const fillMilestoneOrDocument = async (heading, page) => {
  if (heading.includes('jalons')) {
    await page.getByRole('button', { name: /Ajouter un jalon/ }).click();
    await page.locator('input[type="date"]').first().fill('2026-04-01');
    return true;
  }
  if (heading.includes('document')) {
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x')
    });
    return true;
  }
  return false;
};

test.describe('Corrections de l’audit UX', () => {
  test('le bouton profil est dans la barre de navigation hors de l’accueil, et Échap ferme la fenêtre', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await expect(page.locator('[id^="question-"]').first()).toBeVisible();

    const profileButton = page.getByTestId('nav-profile-button');
    await expect(profileButton).toBeVisible();
    await profileButton.click();
    const dialog = page.getByRole('dialog', { name: /profil/i });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(profileButton).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('le sommaire ne signale pas comme manquantes les questions pas encore atteintes', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    const outline = page.locator('aside ol');
    await expect(outline).toBeVisible();
    await expect(page.getByText(/questions? obligatoires? sans réponse/)).toHaveCount(0);
    await expect(outline.getByText(/obligatoire, non renseignée/)).toHaveCount(0);

    await page.getByRole('button', { name: /^Suivant$/ }).click();
    await expect(page.getByText(/1 question obligatoire sans réponse/)).toBeVisible();
    await expect(outline.getByText(/obligatoire, non renseignée/)).toHaveCount(1);
  });

  test('en sortie de questionnaire, la vitrine dit que la compliance n’a pas encore été consultée', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await walkQuestionnaireToShowcase(page, { onQuestion: fillMilestoneOrDocument });
    await proceedThroughMandatorySummary(page);

    const banner = page.getByTestId('showcase-next-step');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('la compliance n’a pas encore été consultée');

    await banner.getByRole('button', { name: 'Consulter les enjeux du projet' }).click();
    await expect(page.getByRole('heading', { name: /Enjeux du projet/ }).first()).toBeVisible();
    await expect(page.getByTestId('showcase-next-step')).toHaveCount(0);
  });

  test('les compteurs des cartes d’équipe sont accordés au singulier', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await walkQuestionnaireToShowcase(page, { onQuestion: fillMilestoneOrDocument });
    await proceedThroughMandatorySummary(page);
    await page.getByTestId('showcase-next-step').getByRole('button', { name: 'Consulter les enjeux du projet' }).click();

    await expect(page.getByText(/\d+ points? à préparer · 0 échange$/).first()).toBeVisible();
    await expect(page.getByText(/\(s\)/)).toHaveCount(0);
  });
});
