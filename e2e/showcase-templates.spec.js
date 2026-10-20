import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, proceedThroughMandatorySummary, walkQuestionnaireToShowcase } from './fixtures.js';

// Les dons, projets de tiers et Advisory Boards étaient privés de vitrine. Ils l'ont
// désormais, structurée par un modèle de vitrine : sections intégrées choisies et blocs
// pré-intitulés, retouchables dans le back-office.
const answerAsDonation = async (page) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkQuestionnaireToShowcase(page, {
    async onQuestion(heading, p) {
      if (heading.includes('De quel type de projet')) {
        await p.getByLabel('Don / bourse / Appel à projets').check({ force: true });
        return true;
      }
      if (heading.includes('jalons')) {
        await p.getByRole('button', { name: /Ajouter un jalon/ }).click();
        await p.locator('input[type="date"]').first().fill('2026-04-01');
        return true;
      }
      if (heading.includes('document')) {
        await p.locator('input[type="file"]').first().setInputFiles({
          name: 'doc.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('x')
        });
        return true;
      }
      return false;
    }
  });
  await proceedThroughMandatorySummary(page);
};

test.describe('Modèles de vitrine', () => {
  test('un don ouvre sa vitrine, structurée par son modèle', async ({ page }) => {
    test.setTimeout(180000);
    await gotoHome(page);
    await answerAsDonation(page);

    await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible();
    await expect(page.locator('[data-showcase-section="hero"]')).toBeVisible();
    await expect(page.getByText('Le bénéficiaire').first()).toBeVisible();
    await expect(page.getByText('Objet du soutien').first()).toBeVisible();
    await expect(page.locator('[data-showcase-section="problem"]')).toHaveCount(0);
    await expect(page.locator('[data-showcase-section="solution"]')).toHaveCount(0);
  });

  test('le back-office liste les modèles par défaut et en crée un nouveau', async ({ page }) => {
    await gotoHome(page);
    await grantAdminAccess(page);

    await page.getByRole('tab', { name: /Modèles de vitrine/ }).click();
    const cards = page.getByTestId('showcase-template-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.first().getByLabel('Don / bourse / Appel à projets')).toBeChecked();

    await page.getByRole('button', { name: 'Ajouter un modèle' }).click();
    await expect(cards).toHaveCount(4);
    await expect(cards.last().getByText('Aucune réponse cochée')).toBeVisible();
  });
});
