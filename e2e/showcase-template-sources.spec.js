import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoHome,
  grantAdminAccess,
  proceedThroughMandatorySummary,
  readStoredState,
  walkQuestionnaireToShowcase
} from './fixtures.js';

// Un modèle de vitrine choisit de quelle question vient le contenu d'une section : la vitrine
// affiche cette réponse, et la modifier dans la vitrine modifie le questionnaire.
const DESCRIPTION = 'Le don finance une chaire de recherche.';

const configureDonationTemplate = async (page) => {
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Modèles de vitrine/ }).click();
  const donation = page.getByTestId('showcase-template-card').first();

  const row = (title) => donation.locator('li').filter({ hasText: title }).first();
  await row('Le bénéficiaire').getByLabel('Contenu issu de la question').selectOption('solutionDescription');
  await row('Objet du soutien').getByLabel('Contenu issu de la question').selectOption('teamLeadTeam');
  await row('Équipe & alliances').getByLabel('Membres clés').selectOption('q15');
  // un bloc lié n'a plus de texte de départ : son contenu est la réponse
  await expect(row('Le bénéficiaire').getByText('Texte de départ', { exact: true })).toHaveCount(0);
};

const createDonation = async (page) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkQuestionnaireToShowcase(page, {
    async onQuestion(heading, p) {
      if (heading.includes('De quel type de projet')) {
        await p.getByLabel('Don / bourse / Appel à projets').check({ force: true });
        return true;
      }
      if (heading.includes('Décrivez en quoi consiste votre projet')) {
        await p.locator('[contenteditable="true"]').first().click();
        await p.keyboard.type(DESCRIPTION);
        return true;
      }
      // laissée sans réponse : la section qui la lit doit le dire
      if (heading.includes('autre information clef')) {
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

test('une section de vitrine lit la question choisie dans le modèle et la réécrit', async ({ page }) => {
  test.setTimeout(240000);
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoHome(page);
  await configureDonationTemplate(page);
  await page.getByRole('button', { name: 'Basculer vers le mode chef de projet' }).click();
  await createDonation(page);

  const story = page.locator('[data-showcase-section="story"]').first();
  await expect(story).toContainText(DESCRIPTION);
  // premier choix proposé par le questionnaire, affiché par son libellé
  await expect(page.locator('[data-showcase-section="highlight"]').first()).toContainText('Marketing DOI');
  await expect(page.locator('[data-showcase-section="team"]')).toContainText('Information à compléter');

  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();

  const storyText = page.locator('[data-showcase-section="story"] .sg-story__step .sge-inline').first();
  // la barre d'outils de la section recouvre la première ligne : on clique sur la dernière
  await storyText.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const storyBox = await storyText.boundingBox();
  await storyText.click({ position: { x: 10, y: storyBox.height - 8 } });
  await page.keyboard.press('End');
  await page.keyboard.type(' Modifiée dans la vitrine.');

  const highlightFrame = page.locator('.sge-frame').filter({ has: page.locator('[data-showcase-section="highlight"]') }).first();
  await highlightFrame.scrollIntoViewIfNeeded();
  await highlightFrame.hover();
  await highlightFrame.locator('button[aria-label="Réglages de la section"]').click();
  await page.getByTestId('showcase-linked-block-field').locator('select').selectOption('medical_dof');
  await expect(page.locator('[data-showcase-section="highlight"]').first()).toContainText('Médical DOF');

  await page.getByRole('button', { name: 'Publier' }).click();

  await expect
    .poll(async () => {
      const state = await readStoredState(page);
      const project = (state.projects || []).find((entry) => entry?.answers?.ProjectType === 'don_bourse_appel_a_projets');
      return project ? [project.answers.solutionDescription, project.answers.teamLeadTeam] : null;
    })
    .toEqual([expect.stringContaining('Modifiée dans la vitrine.'), 'medical_dof']);

  expect(errors).toEqual([]);
});
